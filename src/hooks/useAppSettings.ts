"use client";

import { useState, useEffect } from "react";

/**
 * アプリケーション設定の型定義
 */
export interface AppSettings {
  /** 天気を表示するかどうか */
  showWeather: boolean;
  /** カレンダーを表示するかどうか */
  showCalendar: boolean;
  /** トレンド記事を表示するかどうか */
  showTrendingArticles: boolean;
  /** フォントの色（"white" | "black"） */
  fontColor: "white" | "black";
}

/**
 * アプリケーション設定管理フックの戻り値の型
 */
export interface UseAppSettingsReturn {
  /** アプリケーション設定 */
  settings: AppSettings;
  /** 設定を更新する関数 */
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const STORAGE_KEY = "home_app_settings";

/**
 * アプリケーション設定の管理を行うカスタムフック
 * localStorageに設定を保存し、管理する機能を提供
 *
 * @returns {UseAppSettingsReturn} アプリケーション設定管理に関する状態と関数
 */
export function useAppSettings(): UseAppSettingsReturn {
  const [settings, setSettings] = useState<AppSettings>({
    showWeather: true,
    showCalendar: true,
    showTrendingArticles: true,
    fontColor: "white",
  });

  // 初期化: localStorageからデータを読み込む
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "showWeather" in parsed &&
          "showCalendar" in parsed &&
          "showTrendingArticles" in parsed &&
          "fontColor" in parsed &&
          typeof (parsed as { showWeather: unknown }).showWeather ===
            "boolean" &&
          typeof (parsed as { showCalendar: unknown }).showCalendar ===
            "boolean" &&
          typeof (parsed as { showTrendingArticles: unknown })
            .showTrendingArticles === "boolean" &&
          ((parsed as { fontColor: unknown }).fontColor === "white" ||
            (parsed as { fontColor: unknown }).fontColor === "black")
        ) {
          // localStorageからの初期化はuseEffectで行う必要がある
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSettings(parsed as AppSettings);
        }
      } catch (error) {
        console.error("Failed to parse stored app settings:", error);
      }
    }
  }, []);

  /**
   * 設定を更新する
   *
   * @param {Partial<AppSettings>} newSettings - 更新する設定の一部
   */
  const updateSettings = (newSettings: Partial<AppSettings>): void => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return {
    settings,
    updateSettings,
  };
}

