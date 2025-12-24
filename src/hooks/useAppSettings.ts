"use client";

import * as React from "react";
import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { getItem, setItem, STORE_NAMES } from "@/lib/indexeddb-utils";

/**
 * 検索エンジンの種類
 */
export type SearchEngine = "google" | "bing" | "duckduckgo" | "yahoo" | "brave";

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
  /** 天気の市町村名を表示するかどうか */
  showWeatherLocation: boolean;
  /** 使用する検索エンジン */
  searchEngine: SearchEngine;
  /** アナログ時計を表示するかどうか */
  showAnalogClock: boolean;
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
 * アプリケーション設定のコンテキスト
 */
const AppSettingsContext = createContext<UseAppSettingsReturn | undefined>(undefined);

/**
 * アプリケーション設定プロバイダーのプロパティ
 */
interface AppSettingsProviderProps {
  /** 子コンポーネント */
  children: ReactNode;
}

/**
 * アプリケーション設定プロバイダーコンポーネント
 * 設定をContextで管理し、すべての子コンポーネントで共有
 *
 * @param {AppSettingsProviderProps} props - プロバイダーのプロパティ
 * @returns {React.ReactElement} プロバイダーコンポーネント
 */
export function AppSettingsProvider({ children }: AppSettingsProviderProps): React.ReactElement {
  const [settings, setSettings] = useState<AppSettings>({
    showWeather: true,
    showCalendar: true,
    showTrendingArticles: true,
    fontColor: "white",
    showWeatherLocation: true,
    searchEngine: "google",
    showAnalogClock: false,
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
            // showWeatherLocationが存在しない場合はデフォルト値（true）を使用
            const parsedSettings = parsed as Partial<AppSettings>;
            if (typeof parsedSettings.showWeatherLocation !== "boolean") {
              parsedSettings.showWeatherLocation = true;
            }
            // searchEngineが存在しない場合はデフォルト値（"google"）を使用
            if (
              typeof parsedSettings.searchEngine !== "string" ||
              !["google", "bing", "duckduckgo", "yahoo", "brave"].includes(
                parsedSettings.searchEngine
              )
            ) {
              parsedSettings.searchEngine = "google";
            }
            // showAnalogClockが存在しない場合はデフォルト値（false）を使用
            if (typeof parsedSettings.showAnalogClock !== "boolean") {
              parsedSettings.showAnalogClock = false;
            }
            // IndexedDBからの初期化はuseEffectで行う必要がある
            setSettings(parsedSettings as AppSettings);
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

  return React.createElement(
    AppSettingsContext.Provider,
    { value: { settings, updateSettings } },
    children
  );
}

/**
 * アプリケーション設定の管理を行うカスタムフック
 * Contextから設定を取得する
 *
 * @returns {UseAppSettingsReturn} アプリケーション設定管理に関する状態と関数
 */
export function useAppSettings(): UseAppSettingsReturn {
  const context = useContext(AppSettingsContext);
  if (context === undefined) {
    throw new Error("useAppSettings must be used within AppSettingsProvider");
  }
  return context;
}

