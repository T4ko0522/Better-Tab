"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * 背景画像の情報を表すインターフェース
 */
export interface BackgroundImage {
  /** 画像の一意なID */
  id: string;
  /** 画像のURL */
  url: string;
}

/**
 * 背景画像の設定を表すインターフェース
 */
export interface BackgroundSettings {
  /** ランダムにシャッフルするかどうか */
  shuffle: boolean;
  /** 画像変更間隔（分単位） */
  changeInterval: number;
  /** 背景画像の上にオーバーレイを表示するかどうか */
  showOverlay: boolean;
}

/**
 * 背景画像管理フックの戻り値の型
 */
export interface UseBackgroundImagesReturn {
  /** 登録済みの背景画像のリスト */
  images: BackgroundImage[];
  /** 現在表示中の画像のURL */
  currentImage: string | null;
  /** 背景画像の設定 */
  settings: BackgroundSettings;
  /** 画像を追加する関数 */
  addImage: (url: string) => void;
  /** 画像を削除する関数 */
  removeImage: (id: string) => void;
  /** ランダムに画像を選択する関数 */
  selectRandomImage: () => void;
  /** 指定されたURLの画像を選択する関数 */
  selectImage: (url: string) => void;
  /** 設定を更新する関数 */
  updateSettings: (newSettings: Partial<BackgroundSettings>) => void;
}

const STORAGE_KEY_IMAGES = "home_background_images";
const STORAGE_KEY_SETTINGS = "home_background_settings";

/**
 * 背景画像の管理を行うカスタムフック
 * localStorageに画像を保存し、ランダムにシャッフル表示する機能を提供
 *
 * @returns {UseBackgroundImagesReturn} 背景画像管理に関する状態と関数
 */
export function useBackgroundImages(): UseBackgroundImagesReturn {
  const [images, setImages] = useState<BackgroundImage[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<BackgroundSettings>({
    shuffle: true,
    changeInterval: 5,
    showOverlay: false,
  });

  // 初期化: localStorageからデータを読み込む
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === "undefined") return;

    const storedImages = localStorage.getItem(STORAGE_KEY_IMAGES);
    const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);

    if (storedImages) {
      try {
        const parsed: unknown = JSON.parse(storedImages);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed.every(
            (item): item is BackgroundImage =>
              typeof item === "object" &&
              item !== null &&
              "id" in item &&
              "url" in item &&
              typeof item.id === "string" &&
              typeof item.url === "string"
          )
        ) {
          // localStorageからの初期化はuseEffectで行う必要がある
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setImages(parsed);
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setCurrentImage(parsed[0].url);
        }
      } catch (error) {
        console.error("Failed to parse stored images:", error);
      }
    }

    if (storedSettings) {
      try {
        const parsed: unknown = JSON.parse(storedSettings);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          "shuffle" in parsed &&
          "changeInterval" in parsed &&
          typeof (parsed as { shuffle: unknown }).shuffle === "boolean" &&
          typeof (parsed as { changeInterval: unknown }).changeInterval ===
            "number"
        ) {
          // 既存の設定にshowOverlayがない場合はデフォルト値（true）を設定
          const settingsWithDefaults: BackgroundSettings = {
            shuffle: (parsed as { shuffle: unknown }).shuffle as boolean,
            changeInterval: (parsed as {
              changeInterval: unknown;
            }).changeInterval as number,
            showOverlay:
              "showOverlay" in parsed &&
              typeof (parsed as { showOverlay: unknown }).showOverlay ===
                "boolean"
                ? ((parsed as { showOverlay: unknown }).showOverlay as boolean)
                : false,
          };
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSettings(settingsWithDefaults);
        }
      } catch (error) {
        console.error("Failed to parse stored settings:", error);
      }
    }
  }, []);

  /**
   * 背景画像を追加する
   *
   * @param {string} url - 追加する画像のURL
   */
  const addImage = (url: string): void => {
    const newImage: BackgroundImage = {
      id: Date.now().toString(),
      url,
    };
    const updated = [...images, newImage];
    setImages(updated);
    localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(updated));
    
    if (images.length === 0) {
      setCurrentImage(url);
    }
  };

  /**
   * 背景画像を削除する
   *
   * @param {string} id - 削除する画像のID
   */
  const removeImage = (id: string): void => {
    const updated = images.filter((img) => img.id !== id);
    setImages(updated);
    localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(updated));
    
    if (updated.length === 0) {
      setCurrentImage(null);
    } else if (currentImage && !updated.some((img) => img.url === currentImage)) {
      setCurrentImage(updated[0].url);
    }
  };

  /**
   * ランダムに画像を選択する
   */
  const selectRandomImage = useCallback((): void => {
    if (images.length === 0) return;
    const randomIndex = Math.floor(Math.random() * images.length);
    setCurrentImage(images[randomIndex].url);
  }, [images]);

  /**
   * 指定されたURLの画像を選択する
   *
   * @param {string} url - 選択する画像のURL
   */
  const selectImage = (url: string): void => {
    if (images.some((img) => img.url === url)) {
      setCurrentImage(url);
    }
  };

  /**
   * 背景画像の設定を更新する
   *
   * @param {Partial<BackgroundSettings>} newSettings - 更新する設定の一部
   */
  const updateSettings = (
    newSettings: Partial<BackgroundSettings>
  ): void => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
  };

  // 画像変更間隔のタイマー
  useEffect(() => {
    if (!settings.shuffle || images.length <= 1 || !settings.changeInterval) return;

    const interval = setInterval(() => {
      selectRandomImage();
    }, settings.changeInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.shuffle, settings.changeInterval, images.length, selectRandomImage]);

  return {
    images,
    currentImage,
    settings,
    addImage,
    removeImage,
    selectRandomImage,
    selectImage,
    updateSettings,
  };
}

