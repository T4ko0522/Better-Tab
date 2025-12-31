import * as React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImagePlus, X, Upload } from "lucide-react";
import { getDataUrlFromBlobUrl } from "@/hooks/useBackgroundImages";
import { getThumbnailUrl, isVideoUrl, getDisplayUrl, truncateText } from "@/lib/media-utils";

/**
 * 背景画像データの型
 */
interface BackgroundImage {
  /** 画像ID */
  id: string;
  /** 画像URL */
  url: string;
  /** サムネイルURL（オプション） */
  thumbnail?: string;
  /** 表示名（ファイル名またはURL、オプション） */
  name?: string;
}

/**
 * BackgroundImageModalコンポーネントのプロパティ
 */
interface BackgroundImageModalProps {
  /** 背景画像リスト */
  images: BackgroundImage[];
  /** 現在の背景画像URL */
  currentImage: string | null;
  /** 画像URL入力値 */
  imageUrl: string;
  /** 画像URL入力値を更新する関数 */
  setImageUrl: (url: string) => void;
  /** アップロード中かどうか */
  isUploading: boolean;
  /** 背景画像を追加する関数 */
  addImage: (url: string, thumbnail?: string, name?: string) => void;
  /** 背景画像を削除する関数 */
  removeImage: (id: string) => void;
  /** 背景画像を選択する関数 */
  selectImage: (url: string) => void;
  /** ファイル選択時のハンドラー */
  handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** 画像追加ハンドラー */
  handleAddImage: () => void;
  /** サムネイルキャッシュ */
  thumbnailCache: Map<string, string>;
  /** サムネイルキャッシュ更新関数 */
  setThumbnailCache: (callback: (prev: Map<string, string>) => Map<string, string>) => void;
}

/**
 * 背景画像モーダルコンポーネント
 * 背景画像の追加・管理を行う
 *
 * @param {BackgroundImageModalProps} props - コンポーネントのプロパティ
 * @returns {React.ReactElement} 背景画像モーダル
 */
export const BackgroundImageModal = ({
  images,
  currentImage,
  imageUrl,
  setImageUrl,
  isUploading,
  removeImage,
  selectImage,
  handleFileSelect,
  handleAddImage,
  thumbnailCache,
  setThumbnailCache,
}: BackgroundImageModalProps): React.ReactElement => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white/90 dark:bg-black/30 backdrop-blur-sm border border-border hover:bg-white dark:hover:bg-black/40">
          <ImagePlus className="size-4" />
          背景画像
        </Button>
      </DialogTrigger>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>背景メディアを追加</DialogTitle>
          <DialogDescription>
            画像・動画ファイルをアップロードするか、URLを入力してください
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* ファイルアップロード */}
          <div>
            <label className="text-sm font-medium block mb-2">
              画像・動画ファイルをアップロード
            </label>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mb-2">
              ※ 注意: ファイルサイズは100MB以下を推奨します。50MB以上の場合、警告が表示されます。
            </p>
            <div className="flex gap-2">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="flex-1 cursor-pointer"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="size-4 mr-2" />
                    {isUploading ? "アップロード中..." : "ファイルを選択"}
                  </span>
                </Button>
              </label>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              様々な画像、動画形式に対応
            </p>
          </div>

          {/* URL入力 */}
          <div>
            <label className="text-sm font-medium block mb-2">
              または画像・動画URLを入力
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="画像・動画URLを入力"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddImage();
                }}
                autoFocus={false}
              />
              <Button onClick={handleAddImage} disabled={!imageUrl.trim()}>
                追加
              </Button>
            </div>
          </div>
        </div>
        {images.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">登録済みメディア</p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {images.map((img) => {
                // currentImageがBlob URLの場合は元のData URLに変換して比較
                let isSelected = false;
                if (currentImage) {
                  if (currentImage.startsWith("blob:")) {
                    const originalDataUrl = getDataUrlFromBlobUrl(currentImage);
                    isSelected = originalDataUrl === img.url || currentImage === img.url;
                  } else {
                    isSelected = currentImage === img.url;
                  }
                }
                const isVideoItem = isVideoUrl(img.url);
                
                // 動画のサムネイルを取得（img.thumbnailがあればそれを使用、なければローカルストレージから取得）
                let thumbnailUrl = img.thumbnail;
                if (isVideoItem && !thumbnailUrl) {
                  try {
                    const cachedThumbnail = localStorage.getItem("current_thumbnail");
                    if (cachedThumbnail) {
                      thumbnailUrl = cachedThumbnail;
                    }
                  } catch (error) {
                    console.error("Failed to get thumbnail from localStorage:", error);
                  }
                }
                
                return (
                  <div
                    key={img.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-500/30 border-2 border-blue-500"
                        : "bg-muted hover:bg-muted/80 border-2 border-transparent"
                    }`}
                    onClick={() => selectImage(img.url)}
                  >
                    <div
                      className={`relative w-16 h-16 rounded overflow-hidden shrink-0 ${
                        isSelected ? "ring-2 ring-blue-500" : ""
                      }`}
                    >
                      {isVideoItem ? (
                        thumbnailUrl ? (
                          <Image
                            src={thumbnailUrl}
                            alt="背景メディア"
                            fill
                            className="object-cover"
                            unoptimized
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <video
                            src={getThumbnailUrl(img.url, thumbnailCache, setThumbnailCache)}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        )
                      ) : (
                        <Image
                          src={getThumbnailUrl(img.url, thumbnailCache, setThumbnailCache)}
                          alt="背景メディア"
                          fill
                          className="object-cover"
                          unoptimized
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs truncate ${
                          isSelected ? "text-blue-300 font-medium" : ""
                        }`}
                        title={img.name || img.url}
                      >
                        {img.name ? truncateText(img.name) : truncateText(getDisplayUrl(img.url))}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.id);
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

