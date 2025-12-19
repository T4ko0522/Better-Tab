/**
 * 画像を圧縮する
 *
 * @param {File} file - 圧縮する画像ファイル
 * @param {number} maxWidth - 最大幅（デフォルト: 1920）
 * @param {number} maxHeight - 最大高さ（デフォルト: 1080）
 * @param {number} quality - 品質（0-1、デフォルト: 0.8）
 * @returns {Promise<string>} 圧縮された画像のData URL
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1080,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // アスペクト比を保ちながらリサイズ
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context not available"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * ファイルをData URLに変換する
 *
 * @param {File} file - 変換するファイル
 * @returns {Promise<string>} Data URL
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * 動画ファイルまたは動画URLからサムネイル画像を生成する
 *
 * @param {File | string} source - 動画ファイルまたは動画URL
 * @param {number} seekTime - サムネイルを取得する時間（秒）、デフォルト: 0
 * @returns {Promise<string>} サムネイル画像のData URL
 */
export async function generateVideoThumbnail(
  source: File | string,
  seekTime: number = 0
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    let objectUrl: string | null = null;

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };

    video.onloadedmetadata = () => {
      // サムネイルのサイズを決定（最大1920x1080）
      let width = video.videoWidth;
      let height = video.videoHeight;
      const maxWidth = 1920;
      const maxHeight = 1080;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // 指定時間にシーク
      video.currentTime = Math.min(seekTime, video.duration || 0);
    };

    video.onseeked = () => {
      try {
        // 現在のフレームをキャンバスに描画
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        cleanup();
        resolve(dataUrl);
      } catch (error) {
        cleanup();
        reject(new Error(`Failed to generate thumbnail: ${error}`));
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video"));
    };

    // ソースを設定
    if (source instanceof File) {
      objectUrl = URL.createObjectURL(source);
      video.src = objectUrl;
    } else {
      video.src = source;
    }

    video.load();
  });
}

/**
 * 画質設定から数値に変換する
 *
 * @param {string} quality - 画質設定
 * @returns {number} 画質の数値（0-1）
 */
function qualityToNumber(quality: "performance" | "low" | "medium" | "high" | "highest"): number {
  const qualityMap: Record<string, number> = {
    performance: 0.3,
    low: 0.5,
    medium: 0.7,
    high: 0.85,
    highest: 1.0,
  };
  return qualityMap[quality] ?? 0.7;
}

/**
 * 動画圧縮の進捗コールバック
 */
export type VideoCompressionProgressCallback = (progress: number) => void;

/**
 * 動画を圧縮・変換する（進捗コールバック付き）
 * compressVideoのエイリアス関数
 *
 * @param {File} file - 変換する動画ファイル
 * @param {string} quality - 画質（"performance" | "low" | "medium" | "high" | "highest"、デフォルト: "performance"）
 * @param {number} fps - FPS（デフォルト: 15）
 * @param {VideoCompressionProgressCallback} onProgress - 進捗コールバック（オプション）
 * @returns {Promise<string>} 変換された動画のData URL
 */
export async function compressVideoAsync(
  file: File,
  quality: "performance" | "low" | "medium" | "high" | "highest" = "performance",
  fps: number = 15,
  onProgress?: VideoCompressionProgressCallback
): Promise<string> {
  return compressVideo(file, quality, fps, onProgress);
}

/**
 * 動画を圧縮・変換する
 *
 * @param {File} file - 変換する動画ファイル
 * @param {string} quality - 画質（"performance" | "low" | "medium" | "high" | "highest"、デフォルト: "performance"）
 * @param {number} fps - FPS（デフォルト: 15）
 * @param {VideoCompressionProgressCallback} onProgress - 進捗コールバック（オプション）
 * @returns {Promise<string>} 変換された動画のData URL
 */
export async function compressVideo(
  file: File,
  quality: "performance" | "low" | "medium" | "high" | "highest" = "performance",
  fps: number = 15,
  onProgress?: VideoCompressionProgressCallback
): Promise<string> {
  const qualityNumber = qualityToNumber(quality);
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    if (!ctx) {
      reject(new Error("Canvas context not available"));
      return;
    }

    video.preload = "auto";
    video.muted = true;
    video.playsInline = true;

    let isProcessing = false;
    let mediaRecorder: MediaRecorder | null = null;
    let animationFrameId: number | null = null;

    /**
     * クリーンアップ処理
     */
    const cleanup = (): void => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      if (mediaRecorder && mediaRecorder.state !== "inactive") {
        try {
          mediaRecorder.stop();
        } catch {
          // 既に停止している場合は無視
        }
      }
      if (video.src) {
        URL.revokeObjectURL(video.src);
      }
    };

    video.onloadedmetadata = () => {
      if (isProcessing) return;
      isProcessing = true;

      // 解像度を調整（最大1920x1080）
      let width = video.videoWidth;
      let height = video.videoHeight;
      const maxWidth = 1920;
      const maxHeight = 1080;

      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = Math.min(width, maxWidth);
          height = width / aspectRatio;
        } else {
          height = Math.min(height, maxHeight);
          width = height * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // MediaRecorderで動画を録画
      const stream = canvas.captureStream(fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: Math.floor(qualityNumber * 5000000), // 画質に応じたビットレート
      });
      mediaRecorder = recorder;

      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: "video/webm" });
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            resolve(e.target.result as string);
          } else {
            reject(new Error("Failed to read compressed video"));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read compressed video"));
        reader.readAsDataURL(blob);
      };

      recorder.onerror = (e) => {
        cleanup();
        reject(new Error(`MediaRecorder error: ${e}`));
      };

      // 動画を再生しながらCanvasに描画
      let frameCount = 0;
      const frameInterval = 1000 / fps;
      let isSeeking = false;
      let hasStarted = false;
      let lastProgressUpdate = 0;

      /**
       * フレームを描画して次のフレームに移動する
       */
      const processNextFrame = (): void => {
        if (!isProcessing || !mediaRecorder) {
          return;
        }

        // 録画を開始
        if (!hasStarted) {
          hasStarted = true;
          if (mediaRecorder.state === "inactive") {
            try {
              mediaRecorder.start();
            } catch (error) {
              cleanup();
              reject(new Error(`Failed to start recording: ${error}`));
              return;
            }
          }
        }

        // 現在のフレームを描画
        ctx.drawImage(video, 0, 0, width, height);
        frameCount++;

        const nextFrameTime = frameCount * frameInterval;
        const totalDuration = video.duration * 1000;
        const progress = Math.min((nextFrameTime / totalDuration) * 100, 100);

        // 進捗を通知（3%ごと、または完了時）
        if (onProgress && (progress - lastProgressUpdate >= 3 || progress >= 100)) {
          onProgress(Math.floor(progress));
          lastProgressUpdate = progress;
        }

        if (nextFrameTime < totalDuration) {
          // 次のフレームに移動
          if (!isSeeking) {
            isSeeking = true;
            video.currentTime = nextFrameTime / 1000;
          }
        } else {
          // 最後のフレームまで到達したら停止
          if (mediaRecorder.state === "recording") {
            mediaRecorder.stop();
          }
        }
      };

      // シーク完了時に次のフレームを処理
      video.onseeked = () => {
        if (!isProcessing || !mediaRecorder || isSeeking === false) {
          return;
        }

        isSeeking = false;
        processNextFrame();
      };

      // 最初のフレームを処理
      video.oncanplay = () => {
        if (!isProcessing || !mediaRecorder || hasStarted) {
          return;
        }
        processNextFrame();
      };

      // 動画の再生を開始（最初のフレームを処理するため）
      video.currentTime = 0;
      video.play().catch((error) => {
        cleanup();
        reject(new Error(`Failed to play video: ${error}`));
      });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video"));
    };

    // 動画のソースを設定
    video.src = URL.createObjectURL(file);
    video.load();
  });
}

