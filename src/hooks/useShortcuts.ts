"use client";

import { useState, useEffect } from "react";

/**
 * ショートカットの情報を表すインターフェース
 */
export interface Shortcut {
  /** ショートカットの一意なID */
  id: string;
  /** ショートカットの表示名 */
  name: string;
  /** ショートカットのURL */
  url: string;
}

/**
 * ショートカット管理フックの戻り値の型
 */
export interface UseShortcutsReturn {
  /** 登録済みのショートカットのリスト */
  shortcuts: Shortcut[];
  /** ショートカットを追加する関数 */
  addShortcut: (name: string, url: string) => void;
  /** ショートカットを削除する関数 */
  removeShortcut: (id: string) => void;
}

const STORAGE_KEY = "home_shortcuts";

/**
 * ショートカットの管理を行うカスタムフック
 * localStorageにショートカットを保存し、管理する機能を提供
 *
 * @returns {UseShortcutsReturn} ショートカット管理に関する状態と関数
 */
export function useShortcuts(): UseShortcutsReturn {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

  // 初期化: localStorageからデータを読み込む
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.every(
            (item): item is Shortcut =>
              typeof item === "object" &&
              item !== null &&
              "id" in item &&
              "name" in item &&
              "url" in item &&
              typeof item.id === "string" &&
              typeof item.name === "string" &&
              typeof item.url === "string"
          )
        ) {
          // localStorageからの初期化はuseEffectで行う必要がある
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setShortcuts(parsed);
        }
      } catch (error) {
        console.error("Failed to parse stored shortcuts:", error);
      }
    }
  }, []);

  /**
   * ショートカットを追加する
   *
   * @param {string} name - ショートカットの表示名
   * @param {string} url - ショートカットのURL
   */
  const addShortcut = (name: string, url: string): void => {
    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      name,
      url,
    };
    const updated = [...shortcuts, newShortcut];
    setShortcuts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  /**
   * ショートカットを削除する
   *
   * @param {string} id - 削除するショートカットのID
   */
  const removeShortcut = (id: string): void => {
    const updated = shortcuts.filter((s) => s.id !== id);
    setShortcuts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return {
    shortcuts,
    addShortcut,
    removeShortcut,
  };
}

