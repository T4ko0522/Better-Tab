"use client";

import { useState, useEffect } from "react";
import { getItem, setItem, STORE_NAMES } from "@/lib/indexeddb-utils";

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
  addShortcut: (name: string, url: string) => Promise<void>;
  /** ショートカットを削除する関数 */
  removeShortcut: (id: string) => Promise<void>;
}

const STORAGE_KEY = "shortcuts";

/**
 * ショートカットの管理を行うカスタムフック
 * IndexedDBにショートカットを保存し、管理する機能を提供
 *
 * @returns {UseShortcutsReturn} ショートカット管理に関する状態と関数
 */
export function useShortcuts(): UseShortcutsReturn {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

  // 初期化: IndexedDBからデータを読み込む
  useEffect(() => {
    if (typeof window === "undefined") return;

    /**
     * データを読み込む
     */
    async function loadShortcuts(): Promise<void> {
      try {
        const stored = await getItem(STORE_NAMES.SHORTCUTS, STORAGE_KEY);
        if (stored) {
          const parsed = stored as unknown;
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
            // IndexedDBからの初期化はuseEffectで行う必要がある
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShortcuts(parsed);
          }
        }
      } catch (error) {
        console.error("Failed to load shortcuts from IndexedDB:", error);
      }
    }

    void loadShortcuts();
  }, []);

  /**
   * ショートカットを追加する
   *
   * @param {string} name - ショートカットの表示名
   * @param {string} url - ショートカットのURL
   */
  const addShortcut = async (name: string, url: string): Promise<void> => {
    const newShortcut: Shortcut = {
      id: Date.now().toString(),
      name,
      url,
    };
    const updated = [...shortcuts, newShortcut];
    setShortcuts(updated);
    try {
      await setItem(STORE_NAMES.SHORTCUTS, STORAGE_KEY, updated);
    } catch (error) {
      console.error("Failed to save shortcuts to IndexedDB:", error);
    }
  };

  /**
   * ショートカットを削除する
   *
   * @param {string} id - 削除するショートカットのID
   */
  const removeShortcut = async (id: string): Promise<void> => {
    const updated = shortcuts.filter((s) => s.id !== id);
    setShortcuts(updated);
    try {
      await setItem(STORE_NAMES.SHORTCUTS, STORAGE_KEY, updated);
    } catch (error) {
      console.error("Failed to save shortcuts to IndexedDB:", error);
    }
  };

  return {
    shortcuts,
    addShortcut,
    removeShortcut,
  };
}

