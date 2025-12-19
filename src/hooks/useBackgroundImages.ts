"use client";

import { useState, useEffect, useCallback } from "react";
import { getItem, setItem, STORE_NAMES } from "@/lib/indexeddb-utils";

/**
 * 背景画像の情報を表すインターフェース
 */
export interface BackgroundImage {
  /** 画像の一意なID */
  id: string;
  /** 画像のURL */
  url: string;
  /** サムネイル画像のURL（動画の場合に使用） */
  thumbnail?: string;
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
  /** 画像を時間で変更するかどうか */
  changeByTime: boolean;
  /** 選択された画像のURL（永続化用） */
  selectedImageUrl: string | null;
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
  addImage: (url: string, thumbnail?: string) => Promise<void>;
  /** 画像を削除する関数 */
  removeImage: (id: string) => Promise<void>;
  /** ランダムに画像を選択する関数 */
  selectRandomImage: () => void;
  /** 指定されたURLの画像を選択する関数 */
  selectImage: (url: string) => Promise<void>;
  /** 設定を更新する関数 */
  updateSettings: (newSettings: Partial<BackgroundSettings>) => Promise<void>;
}

const STORAGE_KEY_IMAGES = "images";
const STORAGE_KEY_SETTINGS = "settings";
const LOCALSTORAGE_KEY_CURRENT_THUMBNAIL = "current_thumbnail";

/**
 * 背景画像の管理を行うカスタムフック
 * IndexedDBに画像を保存し、ランダムにシャッフル表示する機能を提供
 *
 * @returns {UseBackgroundImagesReturn} 背景画像管理に関する状態と関数
 */
/**
 * Blob URLのキャッシュマップ
 */
const blobUrlCache = new Map<string, string>();

/**
 * Data URLをBlob URLに変換してキャッシュから取得する
 * Blob URLはブラウザのメモリキャッシュに保持されるため、再読み込みが高速
 *
 * @param {string} dataUrl - Data URL
 * @returns {Promise<string>} Blob URL
 */
export async function getCachedBlobUrl(dataUrl: string): Promise<string> {
  // 既にBlob URLの場合はそのまま返す
  if (dataUrl.startsWith("blob:")) {
    return dataUrl;
  }
  
  // キャッシュから取得
  if (blobUrlCache.has(dataUrl)) {
    return blobUrlCache.get(dataUrl)!;
  }
  
  try {
    // Data URLをBlobに変換
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    // キャッシュに保存
    blobUrlCache.set(dataUrl, blobUrl);
    
    return blobUrl;
  } catch {
    // エラー時は元のURLを返す
    return dataUrl;
  }
}

export function useBackgroundImages(): UseBackgroundImagesReturn {
  const [images, setImages] = useState<BackgroundImage[]>([]);
  // ハイドレーションミスマッチを避けるため、初期状態はnullにする
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<BackgroundSettings>({
    shuffle: true,
    changeInterval: 5,
    showOverlay: false,
    changeByTime: false,
    selectedImageUrl: null,
  });

  // 初期化: IndexedDBからデータを読み込む
  useEffect(() => {
    // クライアントサイドでのみ実行
    if (typeof window === "undefined") return;

    // localStorageから即座にサムネイルを読み込んで表示（高速化）
    // queueMicrotaskを使用してハイドレーション完了後に設定することで、ミスマッチを回避
    queueMicrotask(() => {
      try {
        const cachedThumbnail = localStorage.getItem(LOCALSTORAGE_KEY_CURRENT_THUMBNAIL);
        if (cachedThumbnail) {
          setCurrentImage(cachedThumbnail);
        }
      } catch (error) {
        console.error("Failed to load thumbnail from localStorage:", error);
      }
    });

    /**
     * データを読み込む
     */
    async function loadData(): Promise<void> {
      try {
        const storedImages = await getItem(STORE_NAMES.BACKGROUND_IMAGES, STORAGE_KEY_IMAGES);
        const storedSettings = await getItem(STORE_NAMES.BACKGROUND_SETTINGS, STORAGE_KEY_SETTINGS);

        if (storedImages) {
          const parsed = storedImages as unknown;
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
            // IndexedDBからの初期化はuseEffectで行う必要がある
            setImages(parsed);
          }
        }

        if (storedSettings) {
          const parsed = storedSettings as unknown;
          if (
            typeof parsed === "object" &&
            parsed !== null &&
            "shuffle" in parsed &&
            "changeInterval" in parsed &&
            typeof (parsed as { shuffle: unknown }).shuffle === "boolean" &&
            typeof (parsed as { changeInterval: unknown }).changeInterval ===
              "number"
          ) {
            // 既存の設定に不足している項目はデフォルト値を設定
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
              changeByTime:
                "changeByTime" in parsed &&
                typeof (parsed as { changeByTime: unknown }).changeByTime ===
                  "boolean"
                  ? ((parsed as { changeByTime: unknown }).changeByTime as boolean)
                  : false,
              selectedImageUrl:
                "selectedImageUrl" in parsed &&
                (typeof (parsed as { selectedImageUrl: unknown }).selectedImageUrl === "string" ||
                  (parsed as { selectedImageUrl: unknown }).selectedImageUrl === null)
                  ? ((parsed as { selectedImageUrl: unknown }).selectedImageUrl as string | null)
                  : null,
            };
            setSettings(settingsWithDefaults);
            
            // 選択された画像がある場合はそれを表示、なければ最初の画像を表示
            if (storedImages) {
              const parsedImages = storedImages as unknown;
              if (
                Array.isArray(parsedImages) &&
                parsedImages.length > 0
              ) {
                const imagesArray = parsedImages as BackgroundImage[];
                if (settingsWithDefaults.selectedImageUrl &&
                    imagesArray.some((img) => img.url === settingsWithDefaults.selectedImageUrl)) {
                  setCurrentImage(settingsWithDefaults.selectedImageUrl);

                  // サムネイルをlocalStorageにキャッシュ
                  const selectedImg = imagesArray.find((img) => img.url === settingsWithDefaults.selectedImageUrl);
                  if (selectedImg?.thumbnail) {
                    try {
                      localStorage.setItem(LOCALSTORAGE_KEY_CURRENT_THUMBNAIL, selectedImg.thumbnail);
                    } catch (error) {
                      console.error("Failed to cache thumbnail to localStorage:", error);
                    }
                  }
                } else {
                  setCurrentImage(imagesArray[0].url);

                  // サムネイルをlocalStorageにキャッシュ
                  if (imagesArray[0].thumbnail) {
                    try {
                      localStorage.setItem(LOCALSTORAGE_KEY_CURRENT_THUMBNAIL, imagesArray[0].thumbnail);
                    } catch (error) {
                      console.error("Failed to cache thumbnail to localStorage:", error);
                    }
                  }
                }
              }
            }
          }
        } else if (storedImages) {
          // 設定がない場合は最初の画像を表示
          const parsed = storedImages as unknown;
          if (
            Array.isArray(parsed) &&
            parsed.length > 0
          ) {
            const imagesArray = parsed as BackgroundImage[];
            setCurrentImage(imagesArray[0].url);

            // サムネイルをlocalStorageにキャッシュ
            if (imagesArray[0].thumbnail) {
              try {
                localStorage.setItem(LOCALSTORAGE_KEY_CURRENT_THUMBNAIL, imagesArray[0].thumbnail);
              } catch (error) {
                console.error("Failed to cache thumbnail to localStorage:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to load data from IndexedDB:", error);
      }
    }

    void loadData();
  }, []);

  /**
   * 背景画像を追加する
   *
   * @param {string} url - 追加する画像のURL
   * @param {string} thumbnail - サムネイル画像のURL（オプション）
   */
  const addImage = async (url: string, thumbnail?: string): Promise<void> => {
    const newImage: BackgroundImage = {
      id: Date.now().toString(),
      url,
      ...(thumbnail && { thumbnail }),
    };
    const updated = [...images, newImage];
    setImages(updated);
    try {
      await setItem(STORE_NAMES.BACKGROUND_IMAGES, STORAGE_KEY_IMAGES, updated);
    } catch (error) {
      console.error("Failed to save images to IndexedDB:", error);
    }

    if (images.length === 0) {
      setCurrentImage(url);
    }
  };

  /**
   * 背景画像を削除する
   *
   * @param {string} id - 削除する画像のID
   */
  const removeImage = async (id: string): Promise<void> => {
    const updated = images.filter((img) => img.id !== id);
    setImages(updated);
    try {
      await setItem(STORE_NAMES.BACKGROUND_IMAGES, STORAGE_KEY_IMAGES, updated);
    } catch (error) {
      console.error("Failed to save images to IndexedDB:", error);
    }
    
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
  const selectImage = async (url: string): Promise<void> => {
    const selectedImageData = images.find((img) => img.url === url);
    if (selectedImageData) {
      // まず元のURLを設定（即座に表示）
      setCurrentImage(url);

      // サムネイルがある場合はlocalStorageにキャッシュ（次回起動時の高速化）
      if (selectedImageData.thumbnail) {
        try {
          localStorage.setItem(LOCALSTORAGE_KEY_CURRENT_THUMBNAIL, selectedImageData.thumbnail);
        } catch (error) {
          console.error("Failed to cache thumbnail to localStorage:", error);
        }
      }

      // Data URLの場合はBlob URLに変換してキャッシュ（バックグラウンドで処理）
      if (url.startsWith("data:")) {
        getCachedBlobUrl(url).then((blobUrl) => {
          setCurrentImage(blobUrl);
        }).catch(() => {
          // エラー時は元のURLのまま
        });
      }

      // 選択した画像を設定に保存して永続化
      const updated = { ...settings, selectedImageUrl: url };
      setSettings(updated);
      try {
        await setItem(STORE_NAMES.BACKGROUND_SETTINGS, STORAGE_KEY_SETTINGS, updated);
      } catch (error) {
        console.error("Failed to save selected image to IndexedDB:", error);
      }
    }
  };

  /**
   * 背景画像の設定を更新する
   *
   * @param {Partial<BackgroundSettings>} newSettings - 更新する設定の一部
   */
  const updateSettings = async (
    newSettings: Partial<BackgroundSettings>
  ): Promise<void> => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await setItem(STORE_NAMES.BACKGROUND_SETTINGS, STORAGE_KEY_SETTINGS, updated);
    } catch (error) {
      console.error("Failed to save settings to IndexedDB:", error);
    }
  };

  // 画像変更間隔のタイマー（changeByTimeがtrueの場合のみ）
  useEffect(() => {
    if (!settings.changeByTime || !settings.shuffle || images.length <= 1 || !settings.changeInterval) return;

    const interval = setInterval(() => {
      selectRandomImage();
    }, settings.changeInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.changeByTime, settings.shuffle, settings.changeInterval, images.length, selectRandomImage]);

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

