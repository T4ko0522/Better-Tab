"use client";

import { useState } from "react";
import type React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useBackgroundImages } from "@/hooks/useBackgroundImages";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Settings, ImagePlus, X, Search, Upload, Github, Twitter } from "lucide-react";
import { fileToDataUrl } from "@/lib/image-utils";
import { ImageCropper } from "@/components/image-cropper";
import { Clock } from "@/components/clock";
import { Calendar } from "@/components/calendar";
import { TrendingArticles } from "@/components/trending-articles";

/**
 * ホームページのメインコンポーネント
 * 背景画像、検索機能を提供
 *
 * @returns {React.ReactElement} ホームページのコンポーネント
 */
export default function Home(): React.ReactElement {
  const [searchQuery, setSearchQuery] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [settingsShuffle, setSettingsShuffle] = useState(true);
  const [settingsInterval, setSettingsInterval] = useState(5);
  const [settingsShowOverlay, setSettingsShowOverlay] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>("");

  const {
    images,
    currentImage,
    settings,
    addImage,
    removeImage,
    selectImage,
    updateSettings,
  } = useBackgroundImages();

  const {
    settings: appSettings,
    updateSettings: updateAppSettings,
  } = useAppSettings();


  /**
   * 検索フォームの送信を処理する
   *
   * @param {React.FormEvent<HTMLFormElement>} e - フォームイベント
   */
  /**
   * 検索を実行する
   * URLの場合は直接移動、それ以外はGoogle検索
   *
   * @param {React.FormEvent<HTMLFormElement>} e - フォームイベント
   */
  const handleSearch = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      return;
    }

    // URLかどうかを判定
    try {
      // http:// または https:// で始まる場合はURLとして扱う
      if (query.startsWith("http://") || query.startsWith("https://")) {
        new URL(query); // URLとして有効かチェック
        window.location.href = query;
        return;
      }
      // http:// や https:// がなくても、ドメイン形式（例: example.com）の場合は https:// を付ける
      if (
        /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.([a-zA-Z]{2,}\/?)+/.test(
          query
        )
      ) {
        window.location.href = `https://${query}`;
        return;
      }
    } catch {
      // URLとして解析できない場合はGoogle検索
    }

    // URLでない場合はGoogle検索
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(
      query
    )}`;
  };

  /**
   * 背景画像を追加する
   */
  const handleAddImage = (): void => {
    if (imageUrl.trim()) {
      addImage(imageUrl.trim());
      setImageUrl("");
    }
  };

  /**
   * ファイル選択時のハンドラー
   *
   * @param {React.ChangeEvent<HTMLInputElement>} e - ファイル入力イベント
   */
  const handleFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 画像ファイルかチェック
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください");
      return;
    }

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      alert("ファイルサイズは10MB以下にしてください");
      return;
    }

    try {
      // 画像をData URLに変換してトリミングモーダルを表示
      const dataUrl = await fileToDataUrl(file);
      setSelectedImageSrc(dataUrl);
      setCropperOpen(true);
    } catch (error) {
      console.error("Failed to read file:", error);
      alert("画像の読み込みに失敗しました");
    } finally {
      // ファイル入力をリセット
      if (e.target) {
        e.target.value = "";
      }
    }
  };

  /**
   * トリミングが完了したときのハンドラー
   *
   * @param {string} croppedImageUrl - トリミングされた画像のURL
   */
  const handleCropComplete = async (croppedImageUrl: string): Promise<void> => {
    setIsUploading(true);
    try {
      // トリミングされた画像を追加
      addImage(croppedImageUrl);
      setSelectedImageSrc("");
    } catch (error) {
      console.error("Failed to add image:", error);
      alert("画像の追加に失敗しました");
    } finally {
      setIsUploading(false);
    }
  };


  /**
   * 背景画像の設定を保存する
   */
  const handleSaveSettings = (): void => {
    updateSettings({
      shuffle: settingsShuffle,
      changeInterval: settingsInterval,
      showOverlay: settingsShowOverlay,
    });
  };

  /**
   * 設定ダイアログを開いたときに現在の設定を反映する
   */
  const handleOpenSettings = (): void => {
    setSettingsShuffle(settings.shuffle);
    setSettingsInterval(settings.changeInterval);
    setSettingsShowOverlay(settings.showOverlay);
  };

  /**
   * 画像URLを表示用に短縮する
   *
   * @param {string} url - 画像URL
   * @returns {string} 短縮された表示用URL
   */
  const getDisplayUrl = (url: string): string => {
    // Data URLの場合は「アップロード画像」と表示
    if (url.startsWith("data:")) {
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

  // 背景スタイルを構築
  const backgroundStyle: React.CSSProperties = {};
  if (currentImage) {
    backgroundStyle.backgroundImage = `url(${currentImage})`;
    backgroundStyle.backgroundSize = "cover";
    backgroundStyle.backgroundPosition = "center";
    backgroundStyle.backgroundRepeat = "no-repeat";
  } else {
    backgroundStyle.backgroundImage =
      "linear-gradient(to bottom, #1e293b, #0f172a)";
  }

  return (
    <div
      className="min-h-screen w-full relative bg-background"
      style={backgroundStyle}
    >
      {/* オーバーレイ（背景画像がある場合かつ設定で有効な場合のみ表示） */}
      {currentImage && settings.showOverlay && (
        <div className="absolute inset-0 bg-background/20 dark:bg-background/40" />
      )}

      {/* メインコンテンツ */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* デスクトップ: 左上に時計とカレンダー */}
        <div className="hidden md:block absolute top-6 left-6 z-20 space-y-4">
          {appSettings.showWeather && <Clock />}
          {appSettings.showCalendar && <Calendar />}
        </div>

        {/* ヘッダー（右上にGmailボタンと設定ボタン） */}
        <header className="flex justify-center md:justify-end items-start p-6 gap-4">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="bg-black/30 hover:bg-black/40 backdrop-blur-sm">
                <ImagePlus className="size-4" />
                背景画像
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>背景画像を追加</DialogTitle>
                <DialogDescription>
                  画像ファイルをアップロードするか、URLを入力してください
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* ファイルアップロード */}
                <div>
                  <label className="text-sm font-medium block mb-2">
                    画像ファイルをアップロード
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
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
                    JPEG, PNG, GIF形式、最大10MB
                  </p>
                </div>

                {/* URL入力 */}
                <div>
                  <label className="text-sm font-medium block mb-2">
                    または画像URLを入力
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="画像URLを入力"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddImage();
                      }}
                    />
                    <Button onClick={handleAddImage} disabled={!imageUrl.trim()}>
                      追加
                    </Button>
                  </div>
                </div>
              </div>
              {images.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium">登録済み画像</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {images.map((img) => {
                      const isSelected = currentImage === img.url;
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
                            <Image
                              src={img.url}
                              alt="背景画像"
                              fill
                              className="object-cover"
                              unoptimized
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs truncate ${
                                isSelected ? "text-blue-300 font-medium" : ""
                              }`}
                              title={img.url}
                            >
                              {getDisplayUrl(img.url)}
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

          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-black/30 hover:bg-black/40 backdrop-blur-sm"
                onClick={handleOpenSettings}
              >
                <Settings className="size-4" />
                設定
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>設定</DialogTitle>
                <DialogDescription>
                  各種設定を変更できます
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* 背景画像設定 */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">背景画像</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="shuffle"
                        checked={settingsShuffle}
                        onChange={(e) => setSettingsShuffle(e.target.checked)}
                        className="size-4"
                      />
                      <label htmlFor="shuffle" className="text-sm">
                        ランダムにシャッフル
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showOverlay"
                        checked={settingsShowOverlay}
                        onChange={(e) =>
                          setSettingsShowOverlay(e.target.checked)
                        }
                        className="size-4"
                      />
                      <label htmlFor="showOverlay" className="text-sm">
                        背景画像の上にオーバーレイを表示
                      </label>
                    </div>
                    <div>
                      <label htmlFor="interval" className="text-sm block mb-2">
                        画像変更間隔（分）
                      </label>
                      <Input
                        id="interval"
                        type="number"
                        min="1"
                        value={settingsInterval}
                        onChange={(e) =>
                          setSettingsInterval(Number(e.target.value))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* 表示設定 */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">表示設定</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showWeather"
                        checked={appSettings.showWeather}
                        onChange={(e) =>
                          updateAppSettings({ showWeather: e.target.checked })
                        }
                        className="size-4"
                      />
                      <label htmlFor="showWeather" className="text-sm">
                        天気を表示
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showCalendar"
                        checked={appSettings.showCalendar}
                        onChange={(e) =>
                          updateAppSettings({ showCalendar: e.target.checked })
                        }
                        className="size-4"
                      />
                      <label htmlFor="showCalendar" className="text-sm">
                        カレンダーを表示
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="showTrendingArticles"
                        checked={appSettings.showTrendingArticles}
                        onChange={(e) =>
                          updateAppSettings({
                            showTrendingArticles: e.target.checked,
                          })
                        }
                        className="size-4"
                      />
                      <label htmlFor="showTrendingArticles" className="text-sm">
                        トレンド記事を表示
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex justify-between items-center pt-4 border-t border-border">
                <span className="text-sm text-foreground">製作者 T4ko0522</span>
                <div className="flex items-center gap-4">
                  <a
                    href="https://github.com/T4ko0522"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Github className="size-5" />
                    <span>GitHub</span>
                  </a>
                  <a
                    href="https://twitter.com/T4ko0522"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors"
                  >
                    <Twitter className="size-5" />
                    <span>Twitter</span>
                  </a>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            className="bg-black/30 hover:bg-black/40 backdrop-blur-sm flex items-center gap-2 text-foreground"
            onClick={() =>
              (window.location.href = "https://mail.google.com/mail/u/0/#inbox")
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 192 192"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              className="size-4"
            >
              <path
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="12"
                d="M22 57.265V142c0 5.523 4.477 10 10 10h24V95.056l40 30.278 40-30.278V152h24c5.523 0 10-4.477 10-10V57.265c0-13.233-15.15-20.746-25.684-12.736L96 81.265 47.684 44.53C37.15 36.519 22 44.032 22 57.265Z"
              />
            </svg>
            Gmail
          </Button>
        </header>

        {/* メインコンテンツエリア */}
        <main className="flex-1 flex flex-col items-center px-6 py-12 md:justify-center">
          {/* 検索ボックス */}
          <form onSubmit={handleSearch} id="search-form" className="w-full max-w-2xl mb-8">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search 
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground z-10 cursor-pointer" 
                  onClick={() => {
                    const form = document.getElementById("search-form") as HTMLFormElement;
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                />
                <Input
                  type="text"
                  placeholder="検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-black/30 backdrop-blur-sm relative z-0 text-white placeholder:text-white"
                />
              </div>
            </div>
          </form>

          {/* スマホ: 天気とカレンダー（横並び、中央揃え） */}
          <div className="md:hidden w-full flex flex-row items-center justify-center gap-4 mb-6">
            {appSettings.showWeather && <Clock />}
            {appSettings.showCalendar && <Calendar />}
          </div>

          {/* スマホ: トレンド記事（中央揃え） */}
          {appSettings.showTrendingArticles && (
            <div className="md:hidden w-full max-w-2xl">
              <TrendingArticles />
            </div>
          )}
        </main>
      </div>

      {/* 画像トリミングモーダル */}
      <ImageCropper
        imageSrc={selectedImageSrc}
        onCropComplete={handleCropComplete}
        onClose={() => {
          setCropperOpen(false);
          setSelectedImageSrc("");
        }}
        open={cropperOpen}
      />

      {/* デスクトップ: トレンド記事（右下） */}
      {appSettings.showTrendingArticles && (
        <div className="hidden md:block">
          <TrendingArticles />
        </div>
      )}
    </div>
  );
}
