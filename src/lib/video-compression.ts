import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export type CompressionQuality = 'low' | 'medium' | 'high';

export interface CompressionProgress {
  ratio: number; // 0-1
  currentTime: number;
  totalDuration: number;
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // 削減率（%）
}

const QUALITY_PRESETS = {
  low: {
    maxResolution: { width: 1280, height: 720 },
    videoBitrate: '1M',
  },
  medium: {
    maxResolution: { width: 1920, height: 1080 },
    videoBitrate: '2.5M',
  },
  high: {
    maxResolution: { width: 1920, height: 1080 },
    videoBitrate: '5M',
  },
} as const;

/**
 * 動画圧縮クラス
 */
export class VideoCompressor {
  private ffmpeg: FFmpeg | null = null;
  private isLoaded = false;
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  /**
   * FFmpegを初期化（遅延ロード）
   */
  private async initialize(): Promise<void> {
    if (this.isLoaded) return;

    // 既にロード中の場合は、そのPromiseを待機
    if (this.isLoading && this.loadPromise) {
      await this.loadPromise;
      return;
    }

    this.isLoading = true;
    this.loadPromise = this._doInitialize();

    try {
      await this.loadPromise;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  /**
   * FFmpegの実際の初期化処理
   */
  private async _doInitialize(): Promise<void> {
    if (this.isLoaded) return;

    this.ffmpeg = new FFmpeg();

    // FFmpegのログを有効化（デバッグ用）
    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    // 拡張環境では blob: が CSP で禁止されるため同梱済み core を getURL で読み込む
    const isExtension =
      typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function';
    let coreURL: string;
    let wasmURL: string;
    if (isExtension) {
      coreURL = chrome.runtime.getURL('ffmpeg/ffmpeg-core.js');
      wasmURL = chrome.runtime.getURL('ffmpeg/ffmpeg-core.wasm');
    } else {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
      wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
    }
    await this.ffmpeg.load({ coreURL, wasmURL });

    this.isLoaded = true;
  }

  /**
   * FFmpegをバックグラウンドで事前ロード
   * エラーが発生しても例外を投げず、ログに記録する
   */
  async preload(): Promise<void> {
    if (this.isLoaded || this.isLoading) {
      return;
    }

    // バックグラウンドでロード開始（エラーは無視）
    this.initialize().catch((error) => {
      console.warn('[FFmpeg] Background preload failed:', error);
    });
  }

  /**
   * 動画を圧縮
   *
   * @param {File} file - 圧縮する動画ファイル
   * @param {CompressionQuality} quality - 圧縮品質（デフォルト: 'medium'）
   * @param {((progress: CompressionProgress) => void) | undefined} onProgress - プログレスコールバック
   * @returns {Promise<CompressionResult>} 圧縮結果
   */
  async compress(
    file: File,
    quality: CompressionQuality = 'medium',
    onProgress?: (progress: CompressionProgress) => void
  ): Promise<CompressionResult> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.initialize();
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg initialization failed');
    }

    const preset = QUALITY_PRESETS[quality];
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';

    // プログレスリスナーのハンドラーを保持（クリーンアップ用）
    let progressHandler: (({ progress, time }: { progress: number; time: number }) => void) | null = null;

    try {
      // ファイルをFFmpegのファイルシステムに書き込み
      const fileData = await fetchFile(file);
      await this.ffmpeg.writeFile(inputName, fileData);

      // ファイルが正しく書き込まれたか確認（オプション検証）
      try {
        const verifyData = await this.ffmpeg.readFile(inputName);
        if (verifyData.length === 0) {
          throw new Error('入力ファイルの書き込みに失敗しました（ファイルサイズが0）');
        }
      } catch (verifyError) {
        console.warn('File verification failed, but continuing:', verifyError);
        // 検証エラーは警告として記録するが、処理は続行
      }

      // プログレスリスナーを設定
      if (onProgress) {
        progressHandler = ({ progress, time }) => {
          onProgress({
            ratio: progress,
            currentTime: time,
            totalDuration: 0, // 総時間は取得困難なため0
          });
        };
        this.ffmpeg.on('progress', progressHandler);
      }

      // FFmpegコマンドを実行
      // -i: 入力ファイル
      // -c:v libx264: H.264コーデックを使用
      // -b:v: ビデオビットレート
      // -vf scale: 解像度制限
      // -an: 音声トラックを削除（背景動画として使用するため音声は不要）
      // -movflags +faststart: Web再生最適化（2パス処理でAborted()が発生する場合があるが、ファイルは正常に生成される）
      console.log('[FFmpeg] Executing command:', [
        '-i', inputName,
        '-c:v', 'libx264',
        '-b:v', preset.videoBitrate,
        '-vf', `scale='min(${preset.maxResolution.width},iw)':'min(${preset.maxResolution.height},ih)':force_original_aspect_ratio=decrease`,
        '-an',
        '-movflags', '+faststart',
        outputName,
      ]);

      try {
        await this.ffmpeg.exec([
          '-i', inputName,
          '-c:v', 'libx264',
          '-b:v', preset.videoBitrate,
          '-vf', `scale='min(${preset.maxResolution.width},iw)':'min(${preset.maxResolution.height},ih)':force_original_aspect_ratio=decrease`,
          '-an',
          '-movflags', '+faststart',
          outputName,
        ]);
        console.log('[FFmpeg] Command execution completed successfully');
      } catch (execError) {
        // -movflags +faststart の2パス処理でAborted()が発生することがあるが、
        // ファイルは正常に生成されている可能性があるため、続行を試みる
        console.warn('[FFmpeg] Command execution may have been aborted, but checking if output file exists:', execError);
        // エラーが発生しても、出力ファイルの読み取りを試みる
      }

      console.log('[FFmpeg] Reading output file...');

      // 圧縮されたファイルを読み取り
      let data: Uint8Array;
      try {
        data = await this.ffmpeg.readFile(outputName) as Uint8Array;
        console.log('[FFmpeg] Output file read successfully, size:', data.length);

        if (data.length === 0) {
          throw new Error('出力ファイルのサイズが0です。圧縮が失敗した可能性があります。');
        }
      } catch (readError) {
        console.error('[FFmpeg] Failed to read output file:', readError);
        console.error('[FFmpeg] Read error details:', {
          message: readError instanceof Error ? readError.message : String(readError),
          errno: readError && typeof readError === 'object' && 'errno' in readError ? (readError as { errno?: number }).errno : undefined,
        });
        throw new Error(`出力ファイルの読み取りに失敗しました: ${readError instanceof Error ? readError.message : String(readError)}`);
      }
      const compressedBlob = new Blob([data as BlobPart], { type: 'video/mp4' });
      const compressedFile = new File(
        [compressedBlob],
        file.name.replace(/\.[^.]+$/, '.mp4'),
        { type: 'video/mp4' }
      );

      const originalSize = file.size;
      const compressedSize = compressedFile.size;
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;

      return {
        compressedFile,
        originalSize,
        compressedSize,
        compressionRatio,
      };
    } catch (error) {
      console.error('Compression failed:', error);
      console.error('Error type:', error?.constructor?.name);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errno: error && typeof error === 'object' && 'errno' in error ? (error as { errno?: number }).errno : undefined,
        code: error && typeof error === 'object' && 'code' in error ? (error as { code?: string }).code : undefined,
        name: error && typeof error === 'object' && 'name' in error ? (error as { name?: string }).name : undefined,
      });

      // エラーの詳細情報を取得
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      const errorDetails = error instanceof Error && 'errno' in error
        ? ` (errno: ${(error as { errno?: number }).errno})`
        : '';
      const errorCode = error && typeof error === 'object' && 'code' in error
        ? ` (code: ${(error as { code?: string }).code})`
        : '';

      throw new Error(`動画の圧縮に失敗しました: ${errorMessage}${errorDetails}${errorCode}`);
    } finally {
      // プログレスリスナーをクリーンアップ
      if (progressHandler) {
        this.ffmpeg?.off('progress', progressHandler);
      }

      // クリーンアップ（エラーが発生しても続行）
      try {
        await this.ffmpeg?.deleteFile(inputName);
      } catch (e) {
        console.warn('Failed to delete input file:', e);
      }
      try {
        await this.ffmpeg?.deleteFile(outputName);
      } catch (e) {
        console.warn('Failed to delete output file:', e);
      }
    }
  }

  /**
   * リソースをクリーンアップ
   */
  cleanup(): void {
    this.ffmpeg = null;
    this.isLoaded = false;
  }
}

// シングルトンインスタンス
let compressorInstance: VideoCompressor | null = null;

/**
 * 動画圧縮器のシングルトンインスタンスを取得
 *
 * @returns {VideoCompressor} 動画圧縮器インスタンス
 */
export const getVideoCompressor = (): VideoCompressor => {
  if (!compressorInstance) {
    compressorInstance = new VideoCompressor();
  }
  return compressorInstance;
};

/**
 * FFmpegをバックグラウンドで事前ロード
 * アプリケーション起動時に呼び出すことを推奨
 */
export const preloadFFmpeg = (): void => {
  const compressor = getVideoCompressor();
  compressor.preload();
};
