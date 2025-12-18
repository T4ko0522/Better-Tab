"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * 画像をトリミングするための型
 */
interface ImageCropperProps {
  /** トリミングする画像のURL */
  imageSrc: string;
  /** トリミングが完了したときに呼ばれるコールバック */
  onCropComplete: (croppedImageUrl: string) => void;
  /** ダイアログを閉じる関数 */
  onClose: () => void;
  /** ダイアログが開いているかどうか */
  open: boolean;
}

/**
 * 画像トリミングコンポーネント
 * react-easy-cropを使用して画像をトリミングできるモーダルを提供
 *
 * @param {ImageCropperProps} props - コンポーネントのプロパティ
 * @returns {React.ReactElement} 画像トリミングコンポーネント
 */
export function ImageCropper({
  imageSrc,
  onCropComplete,
  onClose,
  open,
}: ImageCropperProps): React.ReactElement {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * トリミング領域が変更されたときに呼ばれる
   *
   * @param {Area} croppedArea - トリミング領域
   * @param {Area} croppedAreaPixels - ピクセル単位のトリミング領域
   */
  const onCropChange = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  /**
   * トリミングされた画像を生成する
   *
   * @returns {Promise<string>} トリミングされた画像のData URL
   */
  const createCroppedImage = async (): Promise<string> => {
    if (!croppedAreaPixels) {
      throw new Error("No cropped area");
    }

    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    // キャンバスのサイズをトリミング領域に合わせる
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    // 画像を描画
    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    // Data URLに変換（JPEG形式、品質0.9）
    return canvas.toDataURL("image/jpeg", 0.9);
  };

  /**
   * 画像オブジェクトを作成する
   *
   * @param {string} src - 画像のURL
   * @returns {Promise<HTMLImageElement>} 画像オブジェクト
   */
  const createImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = src;
    });
  };

  /**
   * トリミングを完了する
   */
  const handleComplete = async (): Promise<void> => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedImageUrl = await createCroppedImage();
      onCropComplete(croppedImageUrl);
      onClose();
    } catch (error) {
      console.error("Failed to crop image:", error);
      alert("画像のトリミングに失敗しました");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>画像をトリミング</DialogTitle>
          <DialogDescription>
            画像をドラッグして位置を調整し、ズームでサイズを変更できます
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 relative bg-black rounded-lg overflow-hidden min-h-0">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropChange}
            cropShape="rect"
            showGrid={true}
          />
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-2">
              ズーム: {Math.round(zoom * 100)}%
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full zoom-slider"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            キャンセル
          </Button>
          <Button onClick={handleComplete} disabled={isProcessing}>
            {isProcessing ? "処理中..." : "完了"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

