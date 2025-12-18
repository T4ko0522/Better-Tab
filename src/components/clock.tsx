"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

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
}

/**
 * 時計コンポーネント
 * 日本時間（JST）で現在時刻と天気を表示
 *
 * @returns {React.ReactElement} 時計コンポーネント
 */
export function Clock(): React.ReactElement {
  const [time, setTime] = useState<string>("00:00:00");
  const [mounted, setMounted] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    // クライアントサイドでのみ実行（ハイドレーションエラーを防ぐ）
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      setWeatherLoading(true);
      try {
        // 位置情報を取得
        if (navigator.geolocation) {
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
                  setWeather(data as WeatherData);
                }
              }
              setWeatherLoading(false);
            },
            async () => {
              // 位置情報が取得できない場合はデフォルト（東京）で取得
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
                  setWeather(data as WeatherData);
                }
              }
              setWeatherLoading(false);
            }
          );
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
              setWeather(data as WeatherData);
            }
          }
          setWeatherLoading(false);
        }
      } catch (error) {
        console.error("Failed to fetch weather:", error);
        setWeatherLoading(false);
      }
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
        <div className="text-4xl font-bold text-white tabular-nums w-[200px] text-left">
          00:00:00
        </div>
        <div className="text-sm text-white mt-1">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="bg-black/30 backdrop-blur-sm rounded-lg px-4 py-2 border border-border">
      <div className="text-4xl font-bold text-white tabular-nums w-[200px] text-left">
        {time}
      </div>
      {weatherLoading ? (
        <div className="mt-2 flex items-center gap-2">
          <div className="size-8 flex items-center justify-center">
            <div className="size-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
          <div className="text-xs text-white">天気情報を取得中...</div>
        </div>
      ) : (
        weather && (
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <Image
                src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
                alt={weather.description}
                width={32}
                height={32}
                className="size-8"
                unoptimized
              />
              <div className="flex flex-col">
                {weather.temperature !== null && (
                  <div className="text-sm font-medium text-white">
                    {weather.temperature}°C
                  </div>
                )}
                <div className="text-xs text-white">
                  {weather.description} - {weather.location}
                </div>
              </div>
            </div>
            {weather.futureForecast && weather.futureForecast.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/20">
                <div className="text-xs text-white/80 mb-1">今後の予報</div>
                <div className="space-y-1">
                  {weather.futureForecast.map((forecast, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-xs text-white"
                    >
                      <Image
                        src={`https://openweathermap.org/img/wn/${forecast.icon}@2x.png`}
                        alt={forecast.description}
                        width={16}
                        height={16}
                        className="size-4"
                        unoptimized
                      />
                      <span className="text-xs">
                        {forecast.time}: {forecast.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

