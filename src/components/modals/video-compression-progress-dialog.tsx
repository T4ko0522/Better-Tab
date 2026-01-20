"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CompressionProgress } from "@/lib/video-compression";

interface VideoCompressionProgressDialogProps {
  open: boolean;
  onCancel: () => void;
  progress: CompressionProgress;
  originalSize: number;
  estimatedSize?: number;
}

/**
 * 動画圧縮進捗ダイアログコンポーネント
 *
 * @param {VideoCompressionProgressDialogProps} props - コンポーネントのプロパティ
 * @returns {React.ReactElement} ダイアログコンポーネント
 */
export function VideoCompressionProgressDialog({
  open,
  onCancel,
  progress,
  originalSize,
  estimatedSize,
}: VideoCompressionProgressDialogProps): React.ReactElement {
  /**
   * ファイルサイズをフォーマットする
   *
   * @param {number} bytes - バイト数
   * @returns {string} フォーマットされたファイルサイズ
   */
  const formatFileSize = (bytes: number): string => {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const progressPercent = Math.round(progress.ratio * 100);

  // 推定サイズを計算（進捗に基づいて簡易計算）
  const calculatedEstimatedSize = estimatedSize || Math.round(originalSize * (1 - progress.ratio * 0.5));

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>動画を圧縮中</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* プログレスバー */}
          <div className="space-y-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              {progressPercent}%
            </p>
          </div>

          {/* ファイルサイズ情報 */}
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              元のサイズ: {formatFileSize(originalSize)}
            </p>
            <p className="text-muted-foreground">
              推定サイズ: {formatFileSize(calculatedEstimatedSize)}
            </p>
          </div>

          {/* キャンセルボタン */}
          <div className="flex justify-center">
            <Button variant="outline" onClick={onCancel}>
              キャンセル
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
