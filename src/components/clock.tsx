"use client";

import { useState, useEffect } from "react";
import type React from "react";
import { Sun, Moon } from "lucide-react";
import Image from "next/image";
import { useAppSettings } from "@/hooks/useAppSettings";

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
          // 位置情報を取得
          if (navigator.geolocation) {
            return new Promise<WeatherData | null>((resolve) => {
              navigator.geolocation.getCurrentPosition(
                async (position) => {
                  const { latitude, longitude } = position.coords;
                  const response = await fetch(
                    `/api/weather?lat=${latitude}&lon=${longitude}`
                  );
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
                  const response = await fetch("/api/weather");
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
            const response = await fetch("/api/weather");
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
  }, []);

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
      <div className={`text-4xl font-bold text-white tabular-nums ${hideWeather ? "w-full text-center" : "w-[200px] text-left"}`}>
        {time}
      </div>
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

