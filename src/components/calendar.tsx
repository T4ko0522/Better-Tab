"use client";

import { useMemo, useState, useEffect } from "react";

/**
 * カレンダーコンポーネント
 * 日本時間（JST）で現在の日付とカレンダーを表示
 *
 * @returns {React.ReactElement} カレンダーコンポーネント
 */
/**
 * 祝日データの型定義
 */
interface Holidays {
  [date: string]: string;
}

/**
 * カレンダーコンポーネント
 * 日本時間（JST）で現在の日付とカレンダーを表示
 *
 * @returns {React.ReactElement} カレンダーコンポーネント
 */
export function Calendar(): React.ReactElement {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);
  const [holidays, setHolidays] = useState<Holidays>({});

  // クライアントサイドでのみ実行（ハイドレーションエラーを防ぐ）
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setCurrentTime(new Date());

    /**
     * 祝日データを取得する
     */
    const fetchHolidays = async (): Promise<void> => {
      try {
        const now = new Date();
        const year = now.getFullYear();

        // 今年、去年、来年の祝日を取得
        const years = [year - 1, year, year + 1];
        const allHolidays: Holidays = {};

        for (const y of years) {
          const response = await fetch(`/api/holidays?year=${y}`);
          if (response.ok) {
            const data: unknown = await response.json();
            if (
              typeof data === "object" &&
              data !== null &&
              "holidays" in data &&
              typeof data.holidays === "object" &&
              data.holidays !== null
            ) {
              Object.assign(allHolidays, data.holidays as Holidays);
            }
          }
        }

        setHolidays(allHolidays);
      } catch (error) {
        console.error("Failed to fetch holidays:", error);
      }
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
      <div className="bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-border">
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
    <div className="bg-white/90 dark:bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-border">
      <div className="text-lg font-semibold mb-3 text-foreground">
        {year}年 {getMonthName(month)}
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
              className={`aspect-square flex flex-col items-center justify-center text-sm rounded ${
                isToday
                  ? "bg-primary text-primary-foreground font-bold"
                  : isHoliday || isSunday
                  ? "text-red-500"
                  : isSaturday
                  ? "text-blue-500"
                  : "text-foreground"
              }`}
            >
              <span>{day}</span>
              {isHoliday && (
                <span
                  className={`text-[8px] leading-tight mt-0.5 ${
                    isToday ? "text-red-500" : ""
                  }`}
                >
                  {holidays[dateStr]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

