"use client";

import { useState, useEffect } from "react";
import type React from "react";
import { Sun, Moon } from "lucide-react";
import Image from "next/image";
import { useAppSettings } from "@/hooks/useAppSettings";
import { fetchWeather as fetchWeatherFromAPI } from "@/lib/extension-api";

/**
 * 天気情報の型定義
 */
interface WeatherData {
  temperature: number | null;
  description: string;
  icon: string;
  location: string;
  futureForecast?: Array<{
    time: string;
    description: string;
    icon: string;
    precipitation?: string;
  }>;
  warnings?: Array<{
    type: string;
    status: string;
  }>;
}

/**
 * 時間帯に応じてアイコンの末尾を取得
 * day: 6:00~17:59 → "d"（day）
 * night: 18:00~5:59 → "n"（night）
 *
 * @returns {string} アイコンの末尾（"d"または"n"）
 */
function getTimeOfDayIconSuffix(): string {
  const now = new Date();
  // 日本時間（JST）で取得
  const jstTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
  );
  const hours = jstTime.getHours();

  // night: 18:00~5:59
  if (hours >= 18 || hours < 6) {
    return "n";
  }
  // day: 6:00~17:59
  return "d";
}

/**
 * 晴れの場合のみSun/Moonアイコンを返す
 * それ以外はnullを返す（Imageコンポーネントを使用）
 *
 * @param {string} description - 天気の説明（例: "晴れ", "雨"）
 * @param {string} icon - アイコンコード（例: "01d", "10d"）
 * @param {number} size - アイコンサイズ
 * @returns {React.ReactElement | null} lucideアイコンコンポーネントまたはnull
 */
function getSunMoonIcon(
  description: string,
  icon: string,
  size: number
): React.ReactElement | null {
  // 晴れの場合のみSun/Moonを使用
  const isClear = icon.startsWith("01") || description.includes("晴");
  
  if (!isClear) {
    return null;
  }

  const isNight = icon.endsWith("n");

  return isNight ? (
    <Moon size={size} style={{ color: "#FFFF4D", fill: "#FFFF4D" }} />
  ) : (
    <Sun size={size} style={{ color: "#FF7300", fill: "#FF7300" }} />
  );
}

/**
 * アイコン名を時間帯に合わせて変更
 *
 * @param {string} icon - 元のアイコン名（例: "01d"）
 * @returns {string} 時間帯に合わせたアイコン名
 */
function getTimeBasedIcon(icon: string): string {
  const suffix = getTimeOfDayIconSuffix();
  // 末尾の"d"または"n"を時間帯に合わせて変更
  return icon.replace(/[dn]$/, suffix);
}

/**
 * 時計コンポーネントのprops
 */
interface ClockProps {
  /**
   * 天気を非表示にするかどうか
   */
  hideWeather?: boolean;
}

/**
 * 時計コンポーネント
 * 日本時間（JST）で現在時刻と天気を表示
 *
 * @param {ClockProps} props - コンポーネントのprops
 * @returns {React.ReactElement} 時計コンポーネント
 */
// グローバルな天気データキャッシュ（二重fetchを防ぐ）
const weatherCache: {
  data: WeatherData | null;
  loading: boolean;
  promise: Promise<WeatherData | null> | null;
} = {
  data: null,
  loading: false,
  promise: null,
};

/**
 * localStorageから天気データを取得
 *
 * @returns {WeatherData | null} キャッシュされた天気データ、またはnull
 */
const getWeatherFromStorage = (): WeatherData | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cached = localStorage.getItem("weather_cache");
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as {
      data: WeatherData;
      timestamp: number;
    };

    // キャッシュの有効期限は1時間（3600000ミリ秒）
    const CACHE_DURATION = 3600000;
    const now = Date.now();
    if (now - parsed.timestamp > CACHE_DURATION) {
      // キャッシュが期限切れの場合は削除
      localStorage.removeItem("weather_cache");
      return null;
    }

    return parsed.data;
  } catch {
    // パースエラーの場合はキャッシュを削除
    localStorage.removeItem("weather_cache");
    return null;
  }
};

/**
 * localStorageに天気データを保存
 *
 * @param {WeatherData} data - 保存する天気データ
 */
const saveWeatherToStorage = (data: WeatherData): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem("weather_cache", JSON.stringify(cacheData));
  } catch (error) {
    console.error("Failed to save weather to localStorage:", error);
  }
};

export function Clock({ hideWeather = false }: ClockProps): React.ReactElement {
  const [time, setTime] = useState<string>("00:00:00");
  const [mounted, setMounted] = useState(false);
  // localStorageからキャッシュを読み込む
  const [weather, setWeather] = useState<WeatherData | null>(() => {
    if (typeof window !== "undefined") {
      const cached = getWeatherFromStorage();
      if (cached) {
        weatherCache.data = cached;
        return cached;
      }
    }
    return weatherCache.data;
  });
  const [weatherLoading, setWeatherLoading] = useState(!weatherCache.data && weatherCache.loading);
  const { settings } = useAppSettings();

  useEffect(() => {
    // クライアントサイドでのみ実行（ハイドレーションエラーを防ぐ）
    setMounted(true);

    /**
     * 時刻を更新する
     */
    const updateTime = (): void => {
      const now = new Date();
      // 日本時間（JST）で表示
      const jstTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
      );
      const hours = jstTime.getHours().toString().padStart(2, "0");
      const minutes = jstTime.getMinutes().toString().padStart(2, "0");
      const seconds = jstTime.getSeconds().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}:${seconds}`);
    };

    /**
     * 天気情報を取得する
     */
    const fetchWeather = async (): Promise<void> => {
      // 天気を表示しない場合は何もしない（位置情報も要求しない）
      if (hideWeather || !settings.showWeather) {
        setWeather(null);
        setWeatherLoading(false);
        return;
      }

      // まずlocalStorageからキャッシュを確認
      const cachedData = getWeatherFromStorage();
      if (cachedData) {
        weatherCache.data = cachedData;
        setWeather(cachedData);
        setWeatherLoading(false);
        return;
      }

      // 既にメモリキャッシュがある場合はそれを使用
      if (weatherCache.data) {
        setWeather(weatherCache.data);
        setWeatherLoading(false);
        return;
      }

      // 既にfetch中の場合はそのPromiseを待つ
      if (weatherCache.promise) {
        try {
          const data = await weatherCache.promise;
          if (data) {
            setWeather(data);
          }
        } catch {
          // エラー時は何もしない
        }
        setWeatherLoading(false);
        return;
      }

      // 初回fetch
      weatherCache.loading = true;
      setWeatherLoading(true);
      
      const fetchPromise = (async (): Promise<WeatherData | null> => {
        try {
          // デフォルト（Vercelデプロイ時）は相対パス、静的エクスポート時（.env.localにtrueを記述）は外部URLを使用
          const useExternalApi = process.env.NEXT_PUBLIC_USE_RELATIVE_API === "true";
          
          // 位置情報を取得
          if (navigator.geolocation) {
            return new Promise<WeatherData | null>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  const { latitude, longitude } = position.coords;
                  const response = useExternalApi
                    ? await fetchWeatherFromAPI(
                        latitude.toString(),
                        longitude.toString()
                      )
                    : await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
                  if (response.ok) {
                    const data: unknown = await response.json();
                    if (
                      typeof data === "object" &&
                      data !== null &&
                      "temperature" in data &&
                      "description" in data &&
                      "icon" in data &&
                      "location" in data
                    ) {
                      const weatherData = data as WeatherData;
                      weatherCache.data = weatherData;
                      saveWeatherToStorage(weatherData);
                      setWeather(weatherData);
                      resolve(weatherData);
                      return;
                    }
                  }
                  resolve(null);
                },
                async (error: GeolocationPositionError) => {
                  // 位置情報が拒否された場合は天気を非表示にする
                  if (error.code === error.PERMISSION_DENIED || error.code === 1) {
                    setWeather(null);
                    setWeatherLoading(false);
                    resolve(null);
                    return;
                  }
                  // その他のエラーの場合はデフォルト（東京）で取得
                  const response = useExternalApi
                    ? await fetchWeatherFromAPI()
                    : await fetch("/api/weather");
                  if (response.ok) {
                    const data: unknown = await response.json();
                    if (
                      typeof data === "object" &&
                      data !== null &&
                      "temperature" in data &&
                      "description" in data &&
                      "icon" in data &&
                      "location" in data
                    ) {
                      const weatherData = data as WeatherData;
                      weatherCache.data = weatherData;
                      saveWeatherToStorage(weatherData);
                      setWeather(weatherData);
                      resolve(weatherData);
                      return;
                    }
                  }
                  resolve(null);
                }
              );
            });
          } else {
            // 位置情報APIが利用できない場合はデフォルト（東京）で取得
            const response = useExternalApi
              ? await fetchWeatherFromAPI()
              : await fetch("/api/weather");
            if (response.ok) {
              const data: unknown = await response.json();
              if (
                typeof data === "object" &&
                data !== null &&
                "temperature" in data &&
                "description" in data &&
                "icon" in data &&
                "location" in data
              ) {
                const weatherData = data as WeatherData;
                weatherCache.data = weatherData;
                saveWeatherToStorage(weatherData);
                setWeather(weatherData);
                return weatherData;
              }
            }
            return null;
          }
        } catch (error) {
          console.error("Failed to fetch weather:", error);
          return null;
        } finally {
          weatherCache.loading = false;
          weatherCache.promise = null;
        }
      })();

      weatherCache.promise = fetchPromise;
      const result = await fetchPromise;
      if (result) {
        setWeather(result);
      }
      setWeatherLoading(false);
    };

    // 初回更新
    updateTime();
    fetchWeather();

    // 1秒ごとに時刻を更新
    const interval = setInterval(updateTime, 1000);

    // 10分ごとに天気情報を更新
    const weatherInterval = setInterval(fetchWeather, 600000);

    return () => {
      clearInterval(interval);
      clearInterval(weatherInterval);
    };
  }, [hideWeather, settings.showWeather]);

  /**
   * アナログ時計の針の角度を計算する
   *
   * @returns {object} 時針、分針、秒針の角度（度）
   */
  const getAnalogClockAngles = (): { hours: number; minutes: number; seconds: number } => {
    const now = new Date();
    const jstTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    );
    const hours = jstTime.getHours() % 12;
    const minutes = jstTime.getMinutes();
    const seconds = jstTime.getSeconds();
    const milliseconds = jstTime.getMilliseconds();

    // 時針: 1時間で30度、1分で0.5度
    const hoursAngle = (hours * 30) + (minutes * 0.5) + (seconds * 0.5 / 60);
    // 分針: 1分で6度、1秒で0.1度
    const minutesAngle = (minutes * 6) + (seconds * 0.1) + (milliseconds * 0.1 / 1000);
    // 秒針: 1秒で6度、ミリ秒も考慮
    const secondsAngle = (seconds * 6) + (milliseconds * 6 / 1000);

    return { hours: hoursAngle, minutes: minutesAngle, seconds: secondsAngle };
  };

  const [analogAngles, setAnalogAngles] = useState(getAnalogClockAngles());

  // アナログ時計の角度を更新
  useEffect(() => {
    if (!settings.showAnalogClock) {
      return;
    }

    const updateAnalogClock = (): void => {
      setAnalogAngles(getAnalogClockAngles());
    };

    // 初回更新
    updateAnalogClock();

    // 16msごとに更新（約60fps、滑らかな動きのため）
    const interval = setInterval(updateAnalogClock, 16);

    return () => clearInterval(interval);
  }, [settings.showAnalogClock]);

  if (!mounted) {
    return (
      <div className="bg-black/30 backdrop-blur-sm rounded-lg px-4 py-2 border border-border">
        <div className={`text-4xl font-bold text-white tabular-nums ${hideWeather ? "w-full text-center" : "w-[200px] text-left"}`}>
          00:00:00
        </div>
        <div className="text-sm text-white mt-1">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-lg px-4 py-2 border border-border">
      {settings.showAnalogClock ? (
        <div className="flex flex-col items-center gap-3">
          {/* アナログ時計 */}
          <div className="relative size-32 border-2 border-white rounded-full">
            {/* 時計の目盛り */}
            {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((hour) => {
              const angle = (hour * 30) - 90; // 12時を上に配置
              const radian = (angle * Math.PI) / 180;
              const radius = 56; // 時計の半径から少し内側
              const x = 64 + radius * Math.cos(radian);
              const y = 64 + radius * Math.sin(radian);
              return (
                <div
                  key={hour}
                  className="absolute size-1.5 bg-white rounded-full"
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              );
            })}
            {/* 時針 */}
            <div
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                width: "3px",
                height: "28px",
                background: "white",
                borderRadius: "2px",
                transformOrigin: "bottom center",
                transform: `translate(-50%, -100%) rotate(${analogAngles.hours}deg)`,
              }}
            />
            {/* 分針 */}
            <div
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                width: "2px",
                height: "38px",
                background: "white",
                borderRadius: "1px",
                transformOrigin: "bottom center",
                transform: `translate(-50%, -100%) rotate(${analogAngles.minutes}deg)`,
              }}
            />
            {/* 秒針 */}
            <div
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                width: "1px",
                height: "42px",
                background: "#ff4444",
                borderRadius: "0.5px",
                transformOrigin: "bottom center",
                transform: `translate(-50%, -100%) rotate(${analogAngles.seconds}deg)`,
              }}
            />
            {/* 中心点 */}
            <div className="absolute left-1/2 top-1/2 size-2 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 z-10" />
          </div>
          {/* デジタル時計 */}
          <div className={`text-2xl font-bold text-white tabular-nums ${hideWeather ? "w-full text-center" : "text-center"}`}>
            {time}
          </div>
        </div>
      ) : (
        <div className={`text-4xl font-bold text-white tabular-nums ${hideWeather ? "w-full text-center" : "w-[200px] text-left"}`}>
          {time}
        </div>
      )}
      {!hideWeather && weatherLoading ? (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-white/20 rounded" />
            <div className="flex flex-col gap-1.5">
              <div className="h-4 w-12 bg-white/20 rounded" />
              <div className="h-3 w-32 bg-white/20 rounded" />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/20">
            <div className="text-xs text-white/80 mb-1">今後の予報</div>
            <div className="space-y-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="size-4 bg-white/20 rounded" />
                  <div className="h-3 w-24 bg-white/20 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        !hideWeather && weather && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              {getSunMoonIcon(
                weather.description,
                getTimeBasedIcon(weather.icon),
                32
              ) || (
                <Image
                  src={`https://openweathermap.org/img/wn/${getTimeBasedIcon(weather.icon)}@2x.png`}
                  alt={weather.description}
                  width={32}
                  height={32}
                  className="size-8"
                  unoptimized
                />
              )}
              <div className="flex flex-col">
                {weather.temperature !== null && (
                  <div className="text-sm font-medium text-white">
                    {weather.temperature}°C
                  </div>
                )}
                <div className="text-xs text-white">
                  {weather.description}
                  {settings.showWeatherLocation && ` - ${weather.location}`}
                </div>
              </div>
            </div>
            {weather.warnings && weather.warnings.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/20">
                <div className="text-xs text-red-400 font-semibold mb-1">
                  ⚠ 警報・注意報
                </div>
                <div className="space-y-1">
                  {weather.warnings.map((warning, index) => (
                    <div
                      key={index}
                      className="text-xs text-red-300 bg-red-500/20 rounded px-2 py-1"
                    >
                      {warning.type}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {weather.futureForecast && weather.futureForecast.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/20">
                <div className="text-xs text-white/80 mb-1">今後の予報</div>
                <div className="space-y-1">
                  {weather.futureForecast.map((forecast, index) => {
                    const sunMoonIcon = getSunMoonIcon(
                      forecast.description,
                      forecast.icon,
                      16
                    );
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 text-xs text-white"
                      >
                        {sunMoonIcon || (
                          <Image
                            src={`https://openweathermap.org/img/wn/${forecast.icon}@2x.png`}
                            alt={forecast.description}
                            width={16}
                            height={16}
                            className="size-4"
                            unoptimized
                          />
                        )}
                        <span className="text-xs">
                          {forecast.time}: {forecast.description}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

