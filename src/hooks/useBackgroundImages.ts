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
  /** 表示名（ファイル名またはURL） */
  name?: string;
}

/**
 * 背景画像の設定を表すインターフェース
 */
export interface BackgroundSettings {
  /** ランダムにシャッフルするかどうか */
  shuffle: boolean;
  /** 画像変更間隔（分単位） */
  changeInterval: number;
  /** 画像を時間で変更するかどうか */
  changeByTime: boolean;
  /** 選択された画像のURL（永続化用） */
  selectedImageUrl: string | null;
  /** 動画変更間隔（時間単位） */
  videoChangeInterval: number;
  /** 動画をランダムに変更するかどうか */
  videoShuffle: boolean;
  /** 動画を時間で変更するかどうか */
  videoChangeByTime: boolean;
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
  addImage: (url: string, thumbnail?: string, name?: string) => Promise<void>;
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
const LOCALSTORAGE_KEY_LAST_VIDEO_CHANGE = "last_video_change_time";

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
  const [settings, setSettings] = useState<BackgroundSettings>({
    shuffle: true,
    changeInterval: 5,
    changeByTime: false,
    selectedImageUrl: null,
    videoChangeInterval: 24,
    videoShuffle: true,
    videoChangeByTime: false,
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
              videoChangeInterval:
                "videoChangeInterval" in parsed &&
                typeof (parsed as { videoChangeInterval: unknown }).videoChangeInterval === "number"
                  ? ((parsed as { videoChangeInterval: unknown }).videoChangeInterval as number)
                  : 24,
              videoShuffle:
                "videoShuffle" in parsed &&
                typeof (parsed as { videoShuffle: unknown }).videoShuffle === "boolean"
                  ? ((parsed as { videoShuffle: unknown }).videoShuffle as boolean)
                  : true,
              videoChangeByTime:
                "videoChangeByTime" in parsed &&
                typeof (parsed as { videoChangeByTime: unknown }).videoChangeByTime === "boolean"
                  ? ((parsed as { videoChangeByTime: unknown }).videoChangeByTime as boolean)
                  : false,
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
                let targetUrl: string | null = null;
                let selectedImg: BackgroundImage | undefined;

                // 前回選択された画像が動画かどうかをチェック
                const previousIsVideo = settingsWithDefaults.selectedImageUrl && (
                  settingsWithDefaults.selectedImageUrl.startsWith("data:video/") ||
                  (settingsWithDefaults.selectedImageUrl.startsWith("http") && /\.(mp4|mov|webm|avi|mkv|ogg|ogv|flv|wmv)$/i.test(settingsWithDefaults.selectedImageUrl))
                );

                // shuffleがオンで、画像が2枚以上ある場合は、前回と異なる画像をランダム選択
                // ただし、動画の場合は時間ベースの変更なので即座に変更しない
                if (settingsWithDefaults.shuffle && 
                    !previousIsVideo &&
                    imagesArray.length > 1 && 
                    settingsWithDefaults.selectedImageUrl &&
                    imagesArray.some((img) => img.url === settingsWithDefaults.selectedImageUrl)) {
                  // 前回の画像以外から選択（動画以外の画像のみ）
                  const otherImages = imagesArray.filter((img) => 
                    img.url !== settingsWithDefaults.selectedImageUrl &&
                    !img.url.startsWith("data:video/") &&
                    !(img.url.startsWith("http") && /\.(mp4|mov|webm|avi|mkv|ogg|ogv|flv|wmv)$/i.test(img.url))
                  );
                  if (otherImages.length > 0) {
                    const randomIndex = Math.floor(Math.random() * otherImages.length);
                    targetUrl = otherImages[randomIndex].url;
                    selectedImg = otherImages[randomIndex];
                  } else {
                    // 画像がなく動画のみの場合は、前回の選択を維持
                    targetUrl = settingsWithDefaults.selectedImageUrl;
                    selectedImg = imagesArray.find((img) => img.url === settingsWithDefaults.selectedImageUrl);
                  }
                } else if (settingsWithDefaults.selectedImageUrl &&
                    imagesArray.some((img) => img.url === settingsWithDefaults.selectedImageUrl)) {
                  // shuffleがオフの場合、または動画の場合は前回の画像を表示
                  targetUrl = settingsWithDefaults.selectedImageUrl;
                  selectedImg = imagesArray.find((img) => img.url === settingsWithDefaults.selectedImageUrl);
                } else {
                  // 選択された画像がない場合は最初の画像を表示
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
   * ランダムに画像を選択する
   * 動画は除外し、画像のみを対象にする
   * 画像が2枚以上ある場合は、現在の画像以外から選択する
   */
  const selectRandomImage = useCallback((): void => {
    if (images.length === 0) return;
    
    // 動画以外の画像のみをフィルタリング
    const imageOnlyList = images.filter((img) => 
      !img.url.startsWith("data:video/") &&
      !(img.url.startsWith("http") && /\.(mp4|mov|webm|avi|mkv|ogg|ogv|flv|wmv)$/i.test(img.url))
    );
    
    if (imageOnlyList.length === 0) return;
    
    // 現在の画像のData URLを取得
    let currentDataUrl: string | null = null;
    if (currentImage) {
      if (currentImage.startsWith("blob:")) {
        currentDataUrl = getDataUrlFromBlobUrl(currentImage);
      } else {
        currentDataUrl = currentImage;
      }
    }
    
    // 画像が2枚以上ある場合は、現在の画像以外から選択
    let availableImages = imageOnlyList;
    if (imageOnlyList.length > 1 && currentDataUrl) {
      availableImages = imageOnlyList.filter((img) => img.url !== currentDataUrl);
      // フィルタリング後に画像がない場合は、全画像から選択
      if (availableImages.length === 0) {
        availableImages = imageOnlyList;
      }
    }
    
    const randomIndex = Math.floor(Math.random() * availableImages.length);
    const targetUrl = availableImages[randomIndex].url;

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

      // 動画の場合は最後の変更時刻を保存
      if (url.startsWith("data:video/") || (url.startsWith("http") && /\.(mp4|mov|webm|avi|mkv|ogg|ogv|flv|wmv)$/i.test(url))) {
        try {
          localStorage.setItem(LOCALSTORAGE_KEY_LAST_VIDEO_CHANGE, Date.now().toString());
        } catch (error) {
          console.error("Failed to save last video change time:", error);
        }
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
  // 動画の場合は自動切り替えを行わない
  useEffect(() => {
    if (!settings.changeByTime || !settings.shuffle || images.length <= 1 || !settings.changeInterval) return;

    // 現在の背景が動画かどうかをチェック
    if (currentImage) {
      // Blob URLの場合は元のData URLを取得
      let urlToCheck = currentImage;
      if (currentImage.startsWith("blob:")) {
        const originalDataUrl = getDataUrlFromBlobUrl(currentImage);
        if (originalDataUrl) {
          urlToCheck = originalDataUrl;
        }
      }
      
      // 動画の場合は自動切り替えしない
      if (urlToCheck.startsWith("data:video/")) {
        return;
      }
      
      // URLの場合も動画形式かチェック
      try {
        const urlObj = new URL(urlToCheck);
        const pathname = urlObj.pathname.toLowerCase();
        if (/\.(mp4|mov|webm|avi|mkv|ogg|ogv|flv|wmv)$/i.test(pathname)) {
          return;
        }
      } catch {
        // URLとして解析できない場合は続行
      }
    }

    const interval = setInterval(() => {
      selectRandomImage();
    }, settings.changeInterval * 60 * 1000);

    return () => clearInterval(interval);
  }, [settings.changeByTime, settings.shuffle, settings.changeInterval, images.length, selectRandomImage, currentImage]);

  // 動画の時刻ベース変更チェック（1時間ごとにチェック）
  useEffect(() => {
    // videoChangeByTimeがfalse、またはvideoShuffleがfalseの場合は動画変更を行わない
    if (!settings.videoChangeByTime || !settings.videoShuffle || images.length <= 1 || !settings.videoChangeInterval) return;

    /**
     * 動画を変更すべきかチェックして、必要なら変更する
     */
    const checkAndChangeVideo = (): void => {
      if (!currentImage) return;

      // Blob URLの場合は元のData URLを取得
      let urlToCheck = currentImage;
      if (currentImage.startsWith("blob:")) {
        const originalDataUrl = getDataUrlFromBlobUrl(currentImage);
        if (originalDataUrl) {
          urlToCheck = originalDataUrl;
        }
      }

      // 動画かどうかをチェック
      const isVideoMedia = urlToCheck.startsWith("data:video/") || (urlToCheck.startsWith("http") && /\.(mp4|mov|webm|avi|mkv|ogg|ogv|flv|wmv)$/i.test(urlToCheck));
      
      if (!isVideoMedia) return;

      // 動画のリストを取得
      const videoImages = images.filter((img) => 
        img.url.startsWith("data:video/") || 
        (img.url.startsWith("http") && /\.(mp4|mov|webm|avi|mkv|ogg|ogv|flv|wmv)$/i.test(img.url))
      );

      if (videoImages.length <= 1) return;

      // 最後の変更時刻を取得
      try {
        const lastChangeTimeStr = localStorage.getItem(LOCALSTORAGE_KEY_LAST_VIDEO_CHANGE);
        if (lastChangeTimeStr) {
          const lastChangeTime = parseInt(lastChangeTimeStr, 10);
          const currentTime = Date.now();
          const elapsedHours = (currentTime - lastChangeTime) / (1000 * 60 * 60);

          // 設定された時間を超えていたら動画を変更
          if (elapsedHours >= settings.videoChangeInterval) {
            if (settings.videoShuffle) {
              // ランダムに別の動画を選択
              const otherVideos = videoImages.filter((img) => img.url !== urlToCheck);
              if (otherVideos.length > 0) {
                const randomIndex = Math.floor(Math.random() * otherVideos.length);
                void selectImage(otherVideos[randomIndex].url);
              }
            } else {
              // 順番に次の動画を選択
              const currentIndex = videoImages.findIndex((img) => img.url === urlToCheck);
              if (currentIndex !== -1) {
                const nextIndex = (currentIndex + 1) % videoImages.length;
                void selectImage(videoImages[nextIndex].url);
              }
            }
          }
        }
      } catch (error) {
        console.error("Failed to check video change time:", error);
      }
    };

    // 初回チェック
    checkAndChangeVideo();

    // 1時間ごとにチェック
    const interval = setInterval(checkAndChangeVideo, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentImage, images, settings.videoChangeInterval, settings.videoShuffle, settings.videoChangeByTime, selectImage]);

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

