import { getCachedBlobUrl } from "@/hooks/useBackgroundImages";
import { isImageMediaUrl, isVideoMediaUrl } from "@/lib/media-type-utils";

/**
 * サムネイル用のBlob URLを取得（キャッシュ付き）
 *
 * @param {string} url - メディアURL
 * @param {Map<string, string>} thumbnailCache - サムネイルキャッシュ
 * @param {(callback: (prev: Map<string, string>) => Map<string, string>) => void} setThumbnailCache - サムネイルキャッシュ更新関数
 * @returns {string} キャッシュされたBlob URLまたは元のURL
 */
export const getThumbnailUrl = (
  url: string,
  thumbnailCache: Map<string, string>,
  setThumbnailCache: (callback: (prev: Map<string, string>) => Map<string, string>) => void
): string => {
  // 既にBlob URLの場合はそのまま返す
  if (url.startsWith("blob:")) {
    return url;
  }
  
  // キャッシュから取得
  if (thumbnailCache.has(url)) {
    return thumbnailCache.get(url)!;
  }
  
  // Data URLの場合はバックグラウンドでBlob URLに変換
  if (url.startsWith("data:")) {
    getCachedBlobUrl(url).then((blobUrl) => {
      setThumbnailCache((prev) => new Map(prev).set(url, blobUrl));
    }).catch(() => {
      // エラー時は何もしない
    });
  }
  
  // キャッシュがない場合は元のURLを返す
  return url;
};

/**
 * URLが動画かどうかを判定する
 *
 * @param {string} url - 判定するURL
 * @returns {boolean} 動画の場合はtrue
 */
export const isVideoUrl = (url: string): boolean => {
  return isVideoMediaUrl(url);
};

export const isVideo = isVideoUrl;

export const isImage = (url: string): boolean => {
  return isImageMediaUrl(url);
};

/**
 * メディアURLを表示用に短縮する
 *
 * @param {string} url - メディアURL
 * @returns {string} 短縮された表示用URL
 */
export const getDisplayUrl = (url: string): string => {
  // Data URLの場合は「アップロードメディア」と表示
  if (url.startsWith("data:")) {
    if (url.startsWith("data:video/")) {
      return "アップロード動画";
    }
    return "アップロード画像";
  }
  // URLの場合はドメイン名を抽出
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // URLとして解析できない場合はそのまま返す（最大50文字）
    return url.length > 50 ? `${url.substring(0, 50)}...` : url;
  }
};

/**
 * テキストを指定された長さで省略表示する
 *
 * @param {string} text - 表示するテキスト
 * @param {number} maxLength - 最大文字数（デフォルト: 30）
 * @returns {string} 省略されたテキスト
 */
export const truncateText = (text: string, maxLength: number = 30): string => {
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength)}...`;
};

/**
 * 画像の平均輝度を計算する
 *
 * @param {string} imageUrl - 画像のURL
 * @returns {Promise<number>} 0-255の輝度値
 */
export const calculateBrightness = async (imageUrl: string): Promise<number> => {
  return new Promise((resolve) => {
    const img = document.createElement("img");
    img.crossOrigin = "Anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(128); // デフォルト値
          return;
        }

        // パフォーマンスのため、小さいサイズでサンプリング
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);

        const imageData = ctx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        let brightness = 0;

        // RGB値から輝度を計算（人間の視覚に基づいた重み付け）
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          brightness += (r * 0.299 + g * 0.587 + b * 0.114);
        }

        const avgBrightness = brightness / (100 * 100);
        resolve(avgBrightness);
      } catch (error) {
        console.error("Failed to calculate brightness:", error);
        resolve(128); // エラー時はデフォルト値
      }
    };

    img.onerror = () => {
      resolve(128); // エラー時はデフォルト値
    };

    img.src = imageUrl;
  });
};

