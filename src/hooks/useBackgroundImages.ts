"use client";

import { useState, useEffect, useCallback } from "react";
import { getItem, setItem, STORE_NAMES } from "@/lib/indexeddb-utils";
import { isVideoMediaUrl } from "@/lib/media-type-utils";
import type {
  BackgroundImage,
  BackgroundSettings,
  BackgroundSettingsUpdate,
  LegacyBackgroundSettings,
} from "@/types/background";

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
  addImage: (url: string, thumbnail?: string, name?: string) => Promise<void>;
  /** 画像を削除する関数 */
  removeImage: (id: string) => Promise<void>;
  /** ランダムに画像を選択する関数 */
  selectRandomImage: () => void;
  /** 指定されたURLの画像を選択する関数 */
  selectImage: (url: string) => Promise<void>;
  /** 設定を更新する関数 */
  updateSettings: (newSettings: BackgroundSettingsUpdate) => Promise<void>;
}

const STORAGE_KEY_IMAGES = "images";
const STORAGE_KEY_SETTINGS = "settings";
const LOCALSTORAGE_KEY_CURRENT_THUMBNAIL = "current_thumbnail";
const LOCALSTORAGE_KEY_LAST_MEDIA_CHANGE = "last_media_change_time";
const LOCALSTORAGE_KEY_LAST_VIDEO_CHANGE = "last_video_change_time";

const DEFAULT_BACKGROUND_SETTINGS: BackgroundSettings = {
  selectedImageUrl: null,
  backgroundAutoChange: {
    enabled: false,
    intervalMinutes: 5,
  },
};

const normalizeBackgroundSettings = (raw: unknown): BackgroundSettings | null => {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as Partial<BackgroundSettings> & LegacyBackgroundSettings;
  const def = DEFAULT_BACKGROUND_SETTINGS.backgroundAutoChange;

  if (candidate.backgroundAutoChange && typeof candidate.backgroundAutoChange === "object") {
    const ac = candidate.backgroundAutoChange;
    return {
      selectedImageUrl:
        typeof candidate.selectedImageUrl === "string" || candidate.selectedImageUrl === null
          ? candidate.selectedImageUrl
          : DEFAULT_BACKGROUND_SETTINGS.selectedImageUrl,
      backgroundAutoChange: {
        enabled: typeof ac.enabled === "boolean" ? ac.enabled : def.enabled,
        intervalMinutes:
          typeof ac.intervalMinutes === "number" ? ac.intervalMinutes : def.intervalMinutes,
      },
    };
  }

  if (candidate.imageAutoChange && candidate.videoAutoChange) {
    const img = candidate.imageAutoChange;
    const vid = candidate.videoAutoChange;
    const enabled =
      (typeof img.enabled === "boolean" && img.enabled) ||
      (typeof vid.enabled === "boolean" && vid.enabled);
    const intervalMinutes =
      typeof img.intervalMinutes === "number"
        ? img.intervalMinutes
        : typeof vid.intervalHours === "number"
          ? vid.intervalHours * 60
          : def.intervalMinutes;
    return {
      selectedImageUrl:
        typeof candidate.selectedImageUrl === "string" || candidate.selectedImageUrl === null
          ? candidate.selectedImageUrl
          : DEFAULT_BACKGROUND_SETTINGS.selectedImageUrl,
      backgroundAutoChange: {
        enabled,
        intervalMinutes,
      },
    };
  }

  if (typeof candidate.shuffle === "boolean" && typeof candidate.changeInterval === "number") {
    return {
      selectedImageUrl:
        typeof candidate.selectedImageUrl === "string" || candidate.selectedImageUrl === null
          ? candidate.selectedImageUrl
          : DEFAULT_BACKGROUND_SETTINGS.selectedImageUrl,
      backgroundAutoChange: {
        enabled:
          typeof candidate.changeByTime === "boolean"
            ? candidate.changeByTime
            : typeof candidate.videoChangeByTime === "boolean"
              ? candidate.videoChangeByTime
              : def.enabled,
        intervalMinutes: candidate.changeInterval,
      },
    };
  }

  return null;
};

/**
 * デフォルトの背景画像URLのリスト
 * 初回起動時にIndexedDBに画像が存在しない場合、これらの画像が自動的に追加されます
 */
const DEFAULT_BACKGROUND_IMAGES: BackgroundImage[] = [
  {
    id: "default-1",
    url: "https://better-tab.vercel.app/screenshot.png",
    name: "紅葉",
  },
  {
    id: "default-2",
    url: "https://better-tab.vercel.app/screenshot1.png",
    name: "雪山",
  },
  {
    id: "default-3",
    url: "https://better-tab.vercel.app/screenshot2.png",
    name: "向寒",
  },
  {
    id: "default-4",
    url: "https://better-tab.vercel.app/screenshot3.png",
    name: "夜景",
  },
];

/**
 * 背景画像の管理を行うカスタムフック
 * IndexedDBに画像を保存し、ランダムにシャッフル表示する機能を提供
 *
 * @returns {UseBackgroundImagesReturn} 背景画像管理に関する状態と関数
 */
/**
 * Blob URLのキャッシュマップ（Data URL → Blob URL）
 */
const blobUrlCache = new Map<string, string>();

/**
 * Blob URLから元のData URLを逆引きするマッピング（Blob URL → Data URL）
 */
const blobUrlToDataUrlMap = new Map<string, string>();

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
    // Data URLをパースしてMIMEタイプとデータを取得
    // 形式: data:[<mediatype>][;base64],<data>
    // 例: data:video/mp4;base64,xxx または data:video/mp4;codecs=avc1;base64,xxx
    const dataUrlMatch = dataUrl.match(/^data:([^,]+),(.+)$/);
    if (!dataUrlMatch) {
      // base64でない場合や形式が異なる場合はfetchを使用
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // キャッシュに保存（双方向のマッピング）
      blobUrlCache.set(dataUrl, blobUrl);
      blobUrlToDataUrlMap.set(blobUrl, dataUrl);
      
      return blobUrl;
    }
    
    const mimePart = dataUrlMatch[1];
    const dataPart = dataUrlMatch[2];
    
    // MIMEタイプとbase64フラグを分離
    const isBase64 = mimePart.includes(";base64");
    const mimeType = mimePart.split(";")[0]; // 最初の部分がMIMEタイプ
    
    if (!isBase64) {
      // base64でない場合はfetchを使用
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      blobUrlCache.set(dataUrl, blobUrl);
      blobUrlToDataUrlMap.set(blobUrl, dataUrl);
      
      return blobUrl;
    }
    
    // base64データをバイナリに変換
    const binaryString = atob(dataPart);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // MIMEタイプを明示的に指定してBlobを作成
    const blob = new Blob([bytes], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);
    
    // キャッシュに保存（双方向のマッピング）
    blobUrlCache.set(dataUrl, blobUrl);
    blobUrlToDataUrlMap.set(blobUrl, dataUrl);
    
    return blobUrl;
  } catch (error) {
    console.error("Failed to convert Data URL to Blob URL:", error);
    // エラー時は元のURLを返す
    return dataUrl;
  }
}

/**
 * Blob URLから元のData URLを取得する
 *
 * @param {string} blobUrl - Blob URL
 * @returns {string | null} 元のData URL、見つからない場合はnull
 */
export function getDataUrlFromBlobUrl(blobUrl: string): string | null {
  return blobUrlToDataUrlMap.get(blobUrl) || null;
}

export function useBackgroundImages(): UseBackgroundImagesReturn {
  const [images, setImages] = useState<BackgroundImage[]>([]);
  // ハイドレーションミスマッチを避けるため、初期状態はnullにする
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [settings, setSettings] = useState<BackgroundSettings>(DEFAULT_BACKGROUND_SETTINGS);

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

        // 初回起動時（画像が存在しない場合）はデフォルト画像を追加
        if (!storedImages) {
          setImages(DEFAULT_BACKGROUND_IMAGES);
          try {
            await setItem(STORE_NAMES.BACKGROUND_IMAGES, STORAGE_KEY_IMAGES, DEFAULT_BACKGROUND_IMAGES);
            // 最初の画像を表示
            if (DEFAULT_BACKGROUND_IMAGES.length > 0) {
              setCurrentImage(DEFAULT_BACKGROUND_IMAGES[0].url);
            }
          } catch (error) {
            console.error("Failed to save default images to IndexedDB:", error);
          }
        } else {
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
          } else if (Array.isArray(parsed) && parsed.length === 0) {
            // 空の配列の場合はデフォルト画像を追加
            setImages(DEFAULT_BACKGROUND_IMAGES);
            try {
              await setItem(STORE_NAMES.BACKGROUND_IMAGES, STORAGE_KEY_IMAGES, DEFAULT_BACKGROUND_IMAGES);
              // 最初の画像を表示
              if (DEFAULT_BACKGROUND_IMAGES.length > 0) {
                setCurrentImage(DEFAULT_BACKGROUND_IMAGES[0].url);
              }
            } catch (error) {
              console.error("Failed to save default images to IndexedDB:", error);
            }
          }
        }

        if (storedSettings) {
          const settingsWithDefaults = normalizeBackgroundSettings(storedSettings);
          if (settingsWithDefaults) {
            setSettings(settingsWithDefaults);
            void setItem(STORE_NAMES.BACKGROUND_SETTINGS, STORAGE_KEY_SETTINGS, settingsWithDefaults);
            
            // 選択された画像がある場合はそれを表示、なければ最初の画像を表示
            if (storedImages) {
              const parsedImages = storedImages as unknown;
              if (
                Array.isArray(parsedImages) &&
                parsedImages.length > 0
              ) {
                const imagesArray = parsedImages as BackgroundImage[];
                let targetUrl: string | null = null;
                let selectedImg: BackgroundImage | undefined;

                // 時間で切り替えがオンで2件以上ある場合は、前回と異なる背景をランダム選択（画像・動画共通）
                if (
                  settingsWithDefaults.backgroundAutoChange.enabled &&
                  imagesArray.length > 1 &&
                  settingsWithDefaults.selectedImageUrl &&
                  imagesArray.some((img) => img.url === settingsWithDefaults.selectedImageUrl)
                ) {
                  const otherMedia = imagesArray.filter(
                    (img) => img.url !== settingsWithDefaults.selectedImageUrl
                  );
                  if (otherMedia.length > 0) {
                    const randomIndex = Math.floor(Math.random() * otherMedia.length);
                    targetUrl = otherMedia[randomIndex].url;
                    selectedImg = otherMedia[randomIndex];
                  } else {
                    targetUrl = settingsWithDefaults.selectedImageUrl;
                    selectedImg = imagesArray.find((img) => img.url === settingsWithDefaults.selectedImageUrl);
                  }
                } else if (
                  settingsWithDefaults.selectedImageUrl &&
                  imagesArray.some((img) => img.url === settingsWithDefaults.selectedImageUrl)
                ) {
                  targetUrl = settingsWithDefaults.selectedImageUrl;
                  selectedImg = imagesArray.find((img) => img.url === settingsWithDefaults.selectedImageUrl);
                } else {
                  targetUrl = imagesArray[0].url;
                  selectedImg = imagesArray[0];
                }

                if (targetUrl) {
                  // Data URLの場合はBlob URLに変換
                  if (targetUrl.startsWith("data:")) {
                    getCachedBlobUrl(targetUrl).then((blobUrl) => {
                      setCurrentImage(blobUrl);
                    }).catch(() => {
                      setCurrentImage(targetUrl);
                    });
                  } else {
                    setCurrentImage(targetUrl);
                  }

                  // サムネイルをlocalStorageにキャッシュ
                  if (selectedImg?.thumbnail) {
                    try {
                      localStorage.setItem(LOCALSTORAGE_KEY_CURRENT_THUMBNAIL, selectedImg.thumbnail);
                    } catch (error) {
                      console.error("Failed to cache thumbnail to localStorage:", error);
                    }
                  }
                  
                  // 選択した画像をselectedImageUrlに保存（次回起動時の参照用）
                  if (targetUrl !== settingsWithDefaults.selectedImageUrl) {
                    settingsWithDefaults.selectedImageUrl = targetUrl;
                    void setItem(STORE_NAMES.BACKGROUND_SETTINGS, STORAGE_KEY_SETTINGS, settingsWithDefaults);
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
            const targetUrl = imagesArray[0].url;

            // Data URLの場合はBlob URLに変換
            if (targetUrl.startsWith("data:")) {
              getCachedBlobUrl(targetUrl).then((blobUrl) => {
                setCurrentImage(blobUrl);
              }).catch(() => {
                setCurrentImage(targetUrl);
              });
            } else {
              setCurrentImage(targetUrl);
            }

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
   * @param {string} name - 表示名（ファイル名またはURL、オプション）
   */
  const addImage = async (url: string, thumbnail?: string, name?: string): Promise<void> => {
    // Data URLの場合は事前にBlob URLに変換してキャッシュを作成
    let finalUrl = url;
    if (url.startsWith("data:")) {
      try {
        finalUrl = await getCachedBlobUrl(url);
      } catch (error) {
        console.error("Failed to convert to Blob URL:", error);
        // エラー時は元のURLを使用
        finalUrl = url;
      }
    }

    const newImage: BackgroundImage = {
      id: Date.now().toString(),
      url, // 元のData URLを保存（永続化のため）
      ...(thumbnail && { thumbnail }),
      ...(name && { name }),
    };
    const updated = [...images, newImage];
    setImages(updated);
    try {
      await setItem(STORE_NAMES.BACKGROUND_IMAGES, STORAGE_KEY_IMAGES, updated);
    } catch (error) {
      console.error("Failed to save images to IndexedDB:", error);
    }

    // 最初の画像の場合は、Blob URLを表示
    if (images.length === 0) {
      setCurrentImage(finalUrl);
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
    } else if (currentImage) {
      // currentImageがBlob URLの場合は元のData URLを取得
      let searchUrl = currentImage;
      if (currentImage.startsWith("blob:")) {
        const originalDataUrl = getDataUrlFromBlobUrl(currentImage);
        if (originalDataUrl) {
          searchUrl = originalDataUrl;
        }
      }

      // 削除された画像が現在の画像の場合は、最初の画像を選択
      if (!updated.some((img) => img.url === searchUrl)) {
        const targetUrl = updated[0].url;
        // Data URLの場合はBlob URLに変換
        if (targetUrl.startsWith("data:")) {
          getCachedBlobUrl(targetUrl).then((blobUrl) => {
            setCurrentImage(blobUrl);
          }).catch(() => {
            setCurrentImage(targetUrl);
          });
        } else {
          setCurrentImage(targetUrl);
        }
      }
    }
  };

  /**
   * ランダムに背景を選択する（画像・動画の区別なし）
   * 2件以上ある場合は現在表示中以外から選択する
   */
  const selectRandomImage = useCallback((): void => {
    if (images.length === 0) return;

    let currentDataUrl: string | null = null;
    if (currentImage) {
      currentDataUrl = currentImage.startsWith("blob:")
        ? getDataUrlFromBlobUrl(currentImage)
        : currentImage;
    }

    let candidates = images;
    if (images.length > 1 && currentDataUrl) {
      candidates = images.filter((img) => img.url !== currentDataUrl);
      if (candidates.length === 0) candidates = images;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    const targetUrl = candidates[randomIndex].url;

    // Data URLの場合はBlob URLに変換
    if (targetUrl.startsWith("data:")) {
      getCachedBlobUrl(targetUrl).then((blobUrl) => {
        setCurrentImage(blobUrl);
      }).catch(() => {
        setCurrentImage(targetUrl);
      });
    } else {
      setCurrentImage(targetUrl);
    }
  }, [images, currentImage]);

  /**
   * 指定されたURLの画像を選択する
   *
   * @param {string} url - 選択する画像のURL
   */
  const selectImage = useCallback(async (url: string): Promise<void> => {
    const selectedImageData = images.find((img) => img.url === url);
    if (selectedImageData) {
      // サムネイルがある場合はlocalStorageにキャッシュ（次回起動時の高速化）
      if (selectedImageData.thumbnail) {
        try {
          localStorage.setItem(LOCALSTORAGE_KEY_CURRENT_THUMBNAIL, selectedImageData.thumbnail);
        } catch (error) {
          console.error("Failed to cache thumbnail to localStorage:", error);
        }
      }

      // Data URLの場合はBlob URLに変換（同期的に待機）
      let displayUrl = url;
      if (url.startsWith("data:")) {
        try {
          displayUrl = await getCachedBlobUrl(url);
        } catch (error) {
          console.error("Failed to convert to Blob URL:", error);
          // エラー時は元のURLを使用
        }
      }

      // 自動切り替え判定用に、最後の変更時刻を更新
      try {
        const now = Date.now().toString();
        localStorage.setItem(LOCALSTORAGE_KEY_LAST_MEDIA_CHANGE, now);
        // 既存キーとの互換維持
        localStorage.setItem(LOCALSTORAGE_KEY_LAST_VIDEO_CHANGE, now);
      } catch (error) {
        console.error("Failed to save last media change time:", error);
      }

      // Blob URLを設定（一度だけ設定）
      setCurrentImage(displayUrl);

      // 選択した画像を設定に保存して永続化（元のData URLを保存）
      const updated = { ...settings, selectedImageUrl: url };
      setSettings(updated);
      try {
        await setItem(STORE_NAMES.BACKGROUND_SETTINGS, STORAGE_KEY_SETTINGS, updated);
      } catch (error) {
        console.error("Failed to save selected image to IndexedDB:", error);
      }
    }
  }, [images, settings]);

  /**
   * 背景画像の設定を更新する
   *
   * @param {BackgroundSettingsUpdate} newSettings - 更新する設定の一部
   */
  const updateSettings = async (
    newSettings: BackgroundSettingsUpdate
  ): Promise<void> => {
    const updated: BackgroundSettings = {
      ...settings,
      ...newSettings,
      backgroundAutoChange: {
        ...settings.backgroundAutoChange,
        ...newSettings.backgroundAutoChange,
      },
    };
    setSettings(updated);
    try {
      await setItem(STORE_NAMES.BACKGROUND_SETTINGS, STORAGE_KEY_SETTINGS, updated);
    } catch (error) {
      console.error("Failed to save settings to IndexedDB:", error);
    }
  };

  // 背景自動切り替え（画像・動画共通の1設定）
  useEffect(() => {
    const checkAndChangeMedia = (): void => {
      if (!currentImage) return;
      if (images.length <= 1) return;

      const { enabled, intervalMinutes } = settings.backgroundAutoChange;
      if (!enabled || !intervalMinutes) return;

      const intervalMs = intervalMinutes * 60 * 1000;

      let urlToCheck = currentImage;
      if (currentImage.startsWith("blob:")) {
        const originalDataUrl = getDataUrlFromBlobUrl(currentImage);
        if (originalDataUrl) urlToCheck = originalDataUrl;
      }

      const isVideoMedia = isVideoMediaUrl(urlToCheck);
      const targetMedia = images.filter((img) =>
        isVideoMedia ? isVideoMediaUrl(img.url) : !isVideoMediaUrl(img.url)
      );
      if (targetMedia.length <= 1) return;

      try {
        const lastChangeTimeStr =
          localStorage.getItem(LOCALSTORAGE_KEY_LAST_MEDIA_CHANGE) ??
          localStorage.getItem(LOCALSTORAGE_KEY_LAST_VIDEO_CHANGE);

        if (!lastChangeTimeStr) {
          localStorage.setItem(LOCALSTORAGE_KEY_LAST_MEDIA_CHANGE, Date.now().toString());
          return;
        }

        const lastChangeTime = parseInt(lastChangeTimeStr, 10);
        if (Number.isNaN(lastChangeTime)) {
          localStorage.setItem(LOCALSTORAGE_KEY_LAST_MEDIA_CHANGE, Date.now().toString());
          return;
        }

        if (Date.now() - lastChangeTime >= intervalMs) {
          const candidates = targetMedia.filter((img) => img.url !== urlToCheck);
          if (candidates.length === 0) return;
          const randomIndex = Math.floor(Math.random() * candidates.length);
          void selectImage(candidates[randomIndex].url);
        }
      } catch (error) {
        console.error("Failed to check media change time:", error);
      }
    };

    checkAndChangeMedia();
    const interval = setInterval(checkAndChangeMedia, 60 * 1000);

    return () => clearInterval(interval);
  }, [
    currentImage,
    images,
    settings.backgroundAutoChange.enabled,
    settings.backgroundAutoChange.intervalMinutes,
    selectImage,
  ]);

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

