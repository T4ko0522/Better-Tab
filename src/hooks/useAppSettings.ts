"use client";

import { useState, useEffect } from "react";
import { getItem, setItem, STORE_NAMES } from "@/lib/indexeddb-utils";

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
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

const STORAGE_KEY = "settings";

/**
 * アプリケーション設定の管理を行うカスタムフック
 * IndexedDBに設定を保存し、管理する機能を提供
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

  // 初期化: IndexedDBからデータを読み込む
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === "undefined") return;

    /**
     * データを読み込む
     */
    async function loadSettings(): Promise<void> {
      try {
        const stored = await getItem(STORE_NAMES.APP_SETTINGS, STORAGE_KEY);
        if (stored) {
          const parsed = stored as unknown;
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
            // IndexedDBからの初期化はuseEffectで行う必要がある
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSettings(parsed as AppSettings);
          }
        }
      } catch (error) {
        console.error("Failed to load app settings from IndexedDB:", error);
      }
    }

    void loadSettings();
  }, []);

  /**
   * 設定を更新する
   *
   * @param {Partial<AppSettings>} newSettings - 更新する設定の一部
   */
  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await setItem(STORE_NAMES.APP_SETTINGS, STORAGE_KEY, updated);
    } catch (error) {
      console.error("Failed to save app settings to IndexedDB:", error);
    }
  };

  return {
    settings,
    updateSettings,
  };
}

