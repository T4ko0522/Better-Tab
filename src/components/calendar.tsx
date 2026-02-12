"use client";

import { useMemo, useState, useEffect } from "react";
import { fetchHolidays as fetchHolidaysFromAPI } from "@/lib/extension-api";
import { useAppSettings } from "@/hooks/useAppSettings";

/**
 * 祝日データの型定義
 */
interface Holidays {
  [date: string]: string;
}

/** 休日名の最大表示文字数（超えたら省略） */
const HOLIDAY_NAME_MAX_LENGTH = 6;

/**
 * 休日名を一定文字数で省略する
 *
 * @param {string} name - 休日名
 * @param {number} maxLength - 最大文字数
 * @returns {string} 省略後の文字列
 */
function truncateHolidayName(name: string, maxLength: number = HOLIDAY_NAME_MAX_LENGTH): string {
  if (name.length <= maxLength) return name;
  return `${name.slice(0, maxLength)}...`;
}

/**
 * 西暦年・月から元号文字列を取得する（例: 2024, 1 → "令和6年"）
 * 令和: 2019年5月〜, 平成: 1989年〜2019年4月, 昭和: 1926年〜1988年
 *
 * @param {number} year - 西暦年
 * @param {number} month - 月（0-11）
 * @returns {string} 元号＋年（例: "令和6年"）、該当なしは空文字
 */
function getEraString(year: number, month: number): string {
  // 令和は2019年5月（month === 4）から
  if (year > 2019 || (year === 2019 && month >= 4)) {
    return `令和${year - 2018}年`;
  }
  if (year >= 1989) {
    return `平成${year - 1988}年`;
  }
  if (year >= 1926) {
    return `昭和${year - 1925}年`;
  }
  if (year >= 1912) {
    return `大正${year - 1911}年`;
  }
  if (year >= 1868) {
    return `明治${year - 1867}年`;
  }
  return "";
}

/**
 * カレンダーコンポーネントのprops
 */
interface CalendarProps {
  /**
   * スマホ表示用の中央揃えにするかどうか
   */
  isMobile?: boolean;
}

/** カレンダーコンポーネントの固定幅（px） */
const CALENDAR_WIDTH = 320;

// グローバルな祝日データキャッシュ（二重fetchを防ぐ）
const holidaysCache: {
  data: Holidays;
  loading: boolean;
  promise: Promise<Holidays> | null;
} = {
  data: {},
  loading: false,
  promise: null,
};

/**
 * localStorageから祝日データを取得
 *
 * @param {number} year - 取得する年
 * @returns {Holidays | null} キャッシュされた祝日データ、またはnull
 */
const getHolidaysFromStorage = (year: number): Holidays | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cached = localStorage.getItem("holidays_cache");
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as {
      data: Holidays;
      year: number;
    };

    // 年が一致する場合はデータを返す
    if (parsed.year === year) {
      return parsed.data;
    }

    // 年が一致しない場合はキャッシュを削除
    localStorage.removeItem("holidays_cache");
    return null;
  } catch {
    // パースエラーの場合はキャッシュを削除
    localStorage.removeItem("holidays_cache");
    return null;
  }
};

/**
 * localStorageに祝日データを保存
 *
 * @param {Holidays} data - 保存する祝日データ
 * @param {number} year - 保存する年
 */
const saveHolidaysToStorage = (data: Holidays, year: number): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cacheData = {
      data,
      year,
    };
    localStorage.setItem("holidays_cache", JSON.stringify(cacheData));
  } catch (error) {
    console.error("Failed to save holidays to localStorage:", error);
  }
};

/**
 * カレンダーコンポーネント
 * 日本時間（JST）で現在の日付とカレンダーを表示
 *
 * @param {CalendarProps} props - コンポーネントのprops
 * @returns {React.ReactElement} カレンダーコンポーネント
 */
export function Calendar({ isMobile = false }: CalendarProps): React.ReactElement {
  const { settings } = useAppSettings();
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  // localStorageからキャッシュを読み込む
  const [holidays, setHolidays] = useState<Holidays>(() => {
    if (typeof window !== "undefined") {
      const now = new Date();
      const year = now.getFullYear();
      const cached = getHolidaysFromStorage(year);
      if (cached) {
        holidaysCache.data = cached;
        return cached;
      }
    }
    return holidaysCache.data;
  });

  // クライアントサイドでのみ実行（ハイドレーションエラーを防ぐ）
  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());

    /**
     * 祝日データを取得する
     */
    const fetchHolidays = async (): Promise<void> => {
      const now = new Date();
      const year = now.getFullYear();

      // まずlocalStorageからキャッシュを確認
      const cachedData = getHolidaysFromStorage(year);
      if (cachedData) {
        holidaysCache.data = cachedData;
        setHolidays(cachedData);
        return;
      }

      // 既にメモリキャッシュがある場合はそれを使用
      if (Object.keys(holidaysCache.data).length > 0) {
        setHolidays(holidaysCache.data);
        return;
      }

      // 既にfetch中の場合はそのPromiseを待つ
      if (holidaysCache.promise) {
        try {
          const data = await holidaysCache.promise;
          setHolidays(data);
        } catch {
          // エラー時は何もしない
        }
        return;
      }

      // 初回fetch
      holidaysCache.loading = true;
      
      const fetchPromise = (async (): Promise<Holidays> => {
        try {
          // 拡張機能環境を検出
          const isExtension = typeof window !== "undefined" && window.location.protocol === "chrome-extension:";
          // デフォルト（Vercelデプロイ時）は相対パス、静的エクスポート時（.env.localにtrueを記述）は外部URLを使用
          const useExternalApi = isExtension || process.env.NEXT_PUBLIC_USE_RELATIVE_API === "true";
          const response = useExternalApi
            ? await fetchHolidaysFromAPI(year.toString())
            : await fetch(`/api/holidays?year=${year}`);
          if (response.ok) {
            const data: unknown = await response.json();
            if (
              typeof data === "object" &&
              data !== null &&
              "holidays" in data &&
              typeof data.holidays === "object" &&
              data.holidays !== null
            ) {
              const holidaysData = data.holidays as Holidays;
              holidaysCache.data = holidaysData;
              saveHolidaysToStorage(holidaysData, year);
              setHolidays(holidaysData);
              return holidaysData;
            }
          }
          return {};
        } catch (error) {
          console.error("Failed to fetch holidays:", error);
          return {};
        } finally {
          holidaysCache.loading = false;
          holidaysCache.promise = null;
        }
      })();

      holidaysCache.promise = fetchPromise;
      await fetchPromise;
    };

    fetchHolidays();

    // 日付が変わるたびに更新
    const updateTime = (): void => {
      setCurrentTime(new Date());
    };

    // 1分ごとに更新（日付が変わる可能性があるため）
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, []);

  const { currentDate, year, month, daysInMonth, firstDayOfWeek } = useMemo(() => {
    if (!currentTime) {
      // 初期値（サーバーサイドレンダリング用）
      const now = new Date();
      const jstString = now.toLocaleString("en-US", {
        timeZone: "Asia/Tokyo",
      });
      const jstTime = new Date(jstString);
      const year = jstTime.getFullYear();
      const month = jstTime.getMonth();
      const date = jstTime.getDate();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const firstDayOfWeek = firstDay.getDay();

      return {
        currentDate: date,
        year,
        month,
        daysInMonth,
        firstDayOfWeek,
      };
    }

    // 日本時間（JST）で表示
    const jstString = currentTime.toLocaleString("en-US", {
      timeZone: "Asia/Tokyo",
    });
    const jstTime = new Date(jstString);
    const year = jstTime.getFullYear();
    const month = jstTime.getMonth();
    const date = jstTime.getDate();

    // 月の最初の日と最後の日を取得
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const firstDayOfWeek = firstDay.getDay(); // 0 = 日曜日

    return {
      currentDate: date,
      year,
      month,
      daysInMonth,
      firstDayOfWeek,
    };
  }, [currentTime]);

  /**
   * 月名を日本語で取得
   *
   * @param {number} monthIndex - 月のインデックス（0-11）
   * @returns {string} 月名
   */
  const getMonthName = (monthIndex: number): string => {
    const months = [
      "1月",
      "2月",
      "3月",
      "4月",
      "5月",
      "6月",
      "7月",
      "8月",
      "9月",
      "10月",
      "11月",
      "12月",
    ];
    return months[monthIndex];
  };


  // カレンダーの日付配列を生成
  const calendarDays: (number | null)[] = [];
  
  // 月初めの空白を追加
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // 日付を追加
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // サーバーサイドレンダリング時は固定の構造を返す（ハイドレーションエラーを防ぐ）
  if (!mounted || !currentTime) {
    return (
      <div
        className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-border"
        style={{ width: CALENDAR_WIDTH }}
      >
        <div className="text-lg font-semibold mb-3 text-foreground">
          &nbsp;
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
            <div
              key={day}
              className={`text-center text-xs font-medium ${
                index === 0
                  ? "text-red-500"
                  : index === 6
                  ? "text-blue-500"
                  : "text-white"
              }`}
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, index) => (
            <div key={index} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white/90 dark:bg-black/30 backdrop-blur-sm rounded-lg border border-border shrink-0 ${isMobile ? "p-2 mx-auto" : "p-4"}`}
      style={{ width: CALENDAR_WIDTH }}
    >
      <div className={`text-lg font-semibold mb-3 text-foreground ${isMobile ? "text-center" : ""}`}>
        <span className="md:hidden">{year}/{month + 1}</span>
        {settings.showCalendarEra && (
          <span className="md:hidden text-sm font-normal text-foreground/80 ml-1">
            （{getEraString(year, month)}）
          </span>
        )}
        <span className="hidden md:inline">{year}年 {getMonthName(month)}</span>
        {settings.showCalendarEra && (
          <span className="hidden md:inline text-base font-normal text-foreground/80 ml-1">
            （{getEraString(year, month)}）
          </span>
        )}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["日", "月", "火", "水", "木", "金", "土"].map((day, index) => (
          <div
            key={day}
            className={`text-center text-xs font-medium ${
              index === 0
                ? "text-red-500"
                : index === 6
                ? "text-blue-500"
                : "text-white"
            }`}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, index) => {
          if (day === null) {
            return <div key={index} className="aspect-square" />;
          }
          const isToday = day === currentDate;
          const dayIndex = (firstDayOfWeek + day - 1) % 7;
          const isSunday = dayIndex === 0;
          const isSaturday = dayIndex === 6;

          // 祝日かどうかを判定
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isHoliday = dateStr in holidays;

          return (
            <div
              key={index}
              className={`aspect-square flex flex-col items-center justify-center rounded ${
                isMobile ? "text-xs" : "text-sm"
              } ${
                isToday
                  ? "md:bg-primary md:text-primary-foreground font-bold text-white calendar-today-glow"
                  : isHoliday || isSunday
                  ? "text-red-500"
                  : isSaturday
                  ? "text-blue-500"
                  : "text-foreground"
              }`}
            >
              <span className="text-center">{day}</span>
              {isHoliday && (
                <span
                  className={`${isMobile ? "text-[7px]" : "text-[8px]"} leading-tight mt-0.5 text-center block overflow-hidden text-ellipsis whitespace-nowrap max-w-full ${
                    isToday ? "text-red-500" : ""
                  }`}
                  title={holidays[dateStr]}
                >
                  {truncateHolidayName(holidays[dateStr])}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

