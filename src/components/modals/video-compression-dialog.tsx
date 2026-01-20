"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { CompressionQuality } from "@/lib/video-compression";

interface VideoCompressionDialogProps {
  open: boolean;
  onClose: () => void;
  onCompress: (quality: CompressionQuality) => void;
  onSkip: () => void;
  fileName: string;
  fileSize: number;
}

/**
 * 動画圧縮確認ダイアログコンポーネント
 *
 * @param {VideoCompressionDialogProps} props - コンポーネントのプロパティ
 * @returns {React.ReactElement} ダイアログコンポーネント
 */
export function VideoCompressionDialog({
  open,
  onClose,
  onCompress,
  onSkip,
  fileName,
  fileSize,
}: VideoCompressionDialogProps): React.ReactElement {
  const [quality, setQuality] = useState<CompressionQuality>('medium');

  /**
   * ファイルサイズをフォーマットする
   *
   * @param {number} bytes - バイト数
   * @returns {string} フォーマットされたファイルサイズ
   */
  const formatFileSize = (bytes: number): string => {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>動画を圧縮しますか？</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">ファイル: {fileName}</p>
            <p className="text-sm text-muted-foreground">サイズ: {formatFileSize(fileSize)}</p>
          </div>

          <p className="text-sm">
            圧縮することでファイルサイズを削減し、より多くの動画を保存できるようになります。
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">圧縮品質:</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="low"
                  checked={quality === 'low'}
                  onChange={(e) => setQuality(e.target.value as CompressionQuality)}
                  className="cursor-pointer"
                />
                <span className="text-sm">低品質 (最小サイズ)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="medium"
                  checked={quality === 'medium'}
                  onChange={(e) => setQuality(e.target.value as CompressionQuality)}
                  className="cursor-pointer"
                />
                <span className="text-sm">中品質 (推奨)</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="high"
                  checked={quality === 'high'}
                  onChange={(e) => setQuality(e.target.value as CompressionQuality)}
                  className="cursor-pointer"
                />
                <span className="text-sm">高品質</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onSkip}>
              圧縮しない
            </Button>
            <Button onClick={() => onCompress(quality)}>
              圧縮する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
