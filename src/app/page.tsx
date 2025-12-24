"use client";

import { useState } from "react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { useBackgroundImages, getDataUrlFromBlobUrl } from "@/hooks/useBackgroundImages";
import { useAppSettings, type SearchEngine } from "@/hooks/useAppSettings";
import { Search } from "lucide-react";
import { fileToDataUrl, generateVideoThumbnail } from "@/lib/image-utils";
import { isVideoUrl, calculateBrightness } from "@/lib/media-utils";
import { ImageCropper } from "@/components/image-cropper";
import { Clock } from "@/components/clock";
import { Calendar } from "@/components/calendar";
import { TrendingArticles } from "@/components/trending-articles";
import { BackgroundLayer } from "@/components/background-layer";
import { Header } from "@/components/header";

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
  const [settingsChangeByTime, setSettingsChangeByTime] = useState(false);
  const [settingsVideoChangeInterval, setSettingsVideoChangeInterval] = useState(24);
  const [settingsVideoShuffle, setSettingsVideoShuffle] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageSrc, setSelectedImageSrc] = useState<string>("");
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, string>>(new Map());
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isLightBackground, setIsLightBackground] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  // ページ読み込み時にURLパラメータから検索語を取得
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const queryParam = params.get("q");
      if (queryParam) {
        setSearchQuery(decodeURIComponent(queryParam));
      }
    }
  }, []);

  // ページ読み込み時に検索inputにフォーカス
  React.useEffect(() => {
    // 少し遅延させて確実にフォーカスできるようにする
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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

  const [settingsTab, setSettingsTab] = useState("display");


  /**
   * 検索フォームの送信を処理する
   *
   * @param {React.FormEvent<HTMLFormElement>} e - フォームイベント
   */
  /**
   * 検索エンジンに応じた検索URLを生成する
   *
   * @param {string} query - 検索クエリ
   * @param {SearchEngine} searchEngine - 使用する検索エンジン
   * @returns {string} 検索URL
   */
  const getSearchUrl = (query: string, searchEngine: SearchEngine): string => {
    const encodedQuery = encodeURIComponent(query);
    switch (searchEngine) {
      case "google":
        return `https://www.google.com/search?q=${encodedQuery}`;
      case "bing":
        return `https://www.bing.com/search?q=${encodedQuery}`;
      case "duckduckgo":
        return `https://duckduckgo.com/?q=${encodedQuery}`;
      case "yahoo":
        return `https://search.yahoo.com/search?p=${encodedQuery}`;
      case "brave":
        return `https://search.brave.com/search?q=${encodedQuery}`;
      default:
        return `https://www.google.com/search?q=${encodedQuery}`;
    }
  };

  /**
   * 検索を実行する
   * URLの場合は直接移動、それ以外は設定された検索エンジンで検索
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
      // URLとして解析できない場合は検索エンジンで検索
    }

    // URLでない場合は設定された検索エンジンで検索
    window.location.href = getSearchUrl(query, appSettings.searchEngine);
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

    // 画像または動画ファイルかチェック
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      alert("画像または動画ファイルを選択してください");
      return;
    }

    // ファイルサイズチェック（バイト単位）
    const fileSizeMB = file.size / (1024 * 1024);
    const WARNING_SIZE_MB = 100;
    const ERROR_SIZE_MB = 250;

    // 100MB以上はエラー
    if (fileSizeMB >= ERROR_SIZE_MB) {
      alert(
        `ファイルサイズが大きすぎます（${fileSizeMB.toFixed(1)}MB）。\n` +
        `${ERROR_SIZE_MB}MB以下のファイルを選択してください。`
      );
      if (e.target) {
        e.target.value = "";
      }
      return;
    }

    // 50MB以上は警告
    if (fileSizeMB >= WARNING_SIZE_MB) {
      const shouldContinue = confirm(
        `ファイルサイズが大きいです（${fileSizeMB.toFixed(1)}MB）。\n` +
        `アップロードに時間がかかる場合があります。続行しますか？`
      );
      if (!shouldContinue) {
        if (e.target) {
          e.target.value = "";
        }
        return;
      }
    }

    try {
      setIsUploading(true);

      // 動画の場合は元ファイルをそのまま保存
      if (isVideo) {
        // 1. サムネイルを生成（すぐに背景として表示するため）
        const thumbnail = await generateVideoThumbnail(file);

        // 2. 元ファイルをData URLに変換して追加
        const videoDataUrl = await fileToDataUrl(file);
        addImage(videoDataUrl, thumbnail);
      } else {
        // 画像の場合はトリミングモーダルを表示
        const dataUrl = await fileToDataUrl(file);
        setSelectedImageSrc(dataUrl);
        setCropperOpen(true);
      }
    } catch (error) {
      console.error("Failed to process file:", error);
      alert("ファイルの処理に失敗しました");
    } finally {
      setIsUploading(false);
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
   * 設定ダイアログを開いたときに現在の設定を反映する
   */
  const handleOpenSettings = (): void => {
    setSettingsShuffle(settings.shuffle);
    setSettingsInterval(settings.changeInterval);
    setSettingsShowOverlay(settings.showOverlay);
    setSettingsChangeByTime(settings.changeByTime);
    setSettingsVideoChangeInterval(settings.videoChangeInterval);
    setSettingsVideoShuffle(settings.videoShuffle);
  };


  // 背景スタイルを構築
  const backgroundStyle: React.CSSProperties = {};
  // currentImageがBlob URLの場合は元のData URLを取得して判定
  let isVideo = false;
  if (currentImage) {
    if (currentImage.startsWith("blob:")) {
      const originalDataUrl = getDataUrlFromBlobUrl(currentImage);
      if (originalDataUrl) {
        isVideo = isVideoUrl(originalDataUrl);
      } else {
        // 元のData URLが見つからない場合はBlob URLで判定（フォールバック）
        isVideo = isVideoUrl(currentImage);
      }
    } else {
      isVideo = isVideoUrl(currentImage);
    }
  }

  // 現在の画像のサムネイルを取得
  // currentImageがBlob URLの場合は、元のData URLを取得してから検索
  let currentImageData: typeof images[0] | undefined;
  if (currentImage) {
    if (currentImage.startsWith("blob:")) {
      // Blob URLの場合は元のData URLを取得して検索
      const originalDataUrl = getDataUrlFromBlobUrl(currentImage);
      if (originalDataUrl) {
        currentImageData = images.find((img) => img.url === originalDataUrl);
      }
      // 見つからない場合はBlob URLで直接検索（フォールバック）
      if (!currentImageData) {
        currentImageData = images.find((img) => img.url === currentImage);
      }
    } else {
      // Data URLまたは通常のURLの場合はそのまま検索
      currentImageData = images.find((img) => img.url === currentImage);
    }
  }
  const currentThumbnail = currentImageData?.thumbnail;

  if (currentImage && isVideo && currentThumbnail) {
    // 動画の場合は常にサムネイルを背景に表示（ブラックアウト防止）
    backgroundStyle.backgroundImage = `url(${currentThumbnail})`;
    backgroundStyle.backgroundSize = "cover";
    backgroundStyle.backgroundPosition = "center";
    backgroundStyle.backgroundRepeat = "no-repeat";
  } else if (currentImage && !isVideo) {
    // 画像の場合
    backgroundStyle.backgroundImage = `url(${currentImage})`;
    backgroundStyle.backgroundSize = "cover";
    backgroundStyle.backgroundPosition = "center";
    backgroundStyle.backgroundRepeat = "no-repeat";
  } else if (!currentImage) {
    backgroundStyle.backgroundColor = "#000000";
  }

  // currentImageが変わったら動画の読み込み状態をリセット
  React.useEffect(() => {
    setIsVideoLoaded(false);
  }, [currentImage, isVideo]);

  // バックグラウンド時に動画を停止する
  React.useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    /**
     * ページの可視性が変更されたときの処理
     */
    const handleVisibilityChange = (): void => {
      if (!videoRef.current) return;

      if (document.hidden) {
        // タブがバックグラウンドになったら動画を一時停止
        videoRef.current.pause();
      } else {
        // タブがフォアグラウンドに戻ったら動画を再生
        void videoRef.current.play();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isVideo]);

  // 背景画像の明るさを判定
  React.useEffect(() => {
    /**
     * 背景の明るさを判定して状態を更新
     */
    const checkBackgroundBrightness = async (): Promise<void> => {
      if (!currentImage) {
        setIsLightBackground(false);
        return;
      }

      try {
        // 動画の場合はサムネイルで判定
        if (isVideo && currentThumbnail) {
          const brightness = await calculateBrightness(currentThumbnail);
          setIsLightBackground(brightness > 128);
        } else if (!isVideo) {
          const brightness = await calculateBrightness(currentImage);
          setIsLightBackground(brightness > 128);
        }
      } catch (error) {
        console.error("Failed to check background brightness:", error);
        setIsLightBackground(false);
      }
    };

    checkBackgroundBrightness();
  }, [currentImage, isVideo, currentThumbnail]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-y-auto">
      {/* 背景レイヤー（固定） */}
      <BackgroundLayer
        currentImage={currentImage}
        isVideo={isVideo}
        backgroundStyle={backgroundStyle}
        videoRef={videoRef}
        isVideoLoaded={isVideoLoaded}
        setIsVideoLoaded={setIsVideoLoaded}
        showOverlay={settings.showOverlay}
      />

      {/* メインコンテンツ */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* デスクトップ: 左上に時計とカレンダー */}
        <div className="hidden md:block absolute top-6 left-6 z-20 space-y-4">
          {appSettings.showWeather && <Clock />}
          {appSettings.showCalendar && <Calendar />}
        </div>

        {/* ヘッダー（右上にGmailボタンと設定ボタン） */}
        <Header
          images={images}
          currentImage={currentImage}
          imageUrl={imageUrl}
          setImageUrl={setImageUrl}
          isUploading={isUploading}
          addImage={addImage}
          removeImage={removeImage}
          selectImage={selectImage}
          handleFileSelect={handleFileSelect}
          handleAddImage={handleAddImage}
          thumbnailCache={thumbnailCache}
          setThumbnailCache={setThumbnailCache}
          appSettings={appSettings}
          updateAppSettings={updateAppSettings}
          updateSettings={updateSettings}
          settingsShuffle={settingsShuffle}
          setSettingsShuffle={setSettingsShuffle}
          settingsInterval={settingsInterval}
          setSettingsInterval={setSettingsInterval}
          settingsShowOverlay={settingsShowOverlay}
          setSettingsShowOverlay={setSettingsShowOverlay}
          settingsChangeByTime={settingsChangeByTime}
          setSettingsChangeByTime={setSettingsChangeByTime}
          settingsVideoChangeInterval={settingsVideoChangeInterval}
          setSettingsVideoChangeInterval={setSettingsVideoChangeInterval}
          settingsVideoShuffle={settingsVideoShuffle}
          setSettingsVideoShuffle={setSettingsVideoShuffle}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          handleOpenSettings={handleOpenSettings}
          isCurrentMediaVideo={isVideo}
        />

        {/* メインコンテンツエリア */}
        <main className="flex-1 flex flex-col items-center px-3 sm:px-4 md:px-6 py-6 sm:py-8 md:py-12 md:justify-center">
          {/* 検索ボックス */}
          <form onSubmit={handleSearch} id="search-form" className="w-full max-w-xs sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mb-4 sm:mb-6 md:mb-8">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search 
                  className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 size-4 sm:size-5 md:size-5 z-10 cursor-pointer ${
                    isLightBackground ? "text-gray-600" : "text-muted-foreground"
                  }`}
                  onClick={() => {
                    const form = document.getElementById("search-form") as HTMLFormElement;
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="検索またはドメイン..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-8 sm:pl-9 md:pl-10 h-10 sm:h-11 md:h-9 text-sm sm:text-base md:text-sm backdrop-blur-lg relative z-0 ${
                    isLightBackground 
                      ? "bg-white/70 text-gray-900 placeholder:text-gray-600" 
                      : "bg-black/50 text-white placeholder:text-white/80"
                  }`}
                />
              </div>
            </div>
          </form>

          {/* スマホ: 時計とカレンダー（縦並び、中央揃え） */}
          <div className="md:hidden w-full flex flex-col items-center gap-4 mb-6">
            <Clock hideWeather={true} />
            {appSettings.showCalendar && <Calendar isMobile={true} />}
          </div>

          {/* スマホ: トレンド記事（中央揃え） */}
          {appSettings.showTrendingArticles && (
            <div className="md:hidden w-full px-4 mb-6 flex justify-center">
              <TrendingArticles isLightBackground={isLightBackground} />
            </div>
          )}
        </main>
      </div>

      {/* デスクトップ: トレンド記事（右下） */}
      {appSettings.showTrendingArticles && (
        <div className="hidden md:block absolute bottom-6 right-6 z-20">
          <TrendingArticles isLightBackground={isLightBackground} />
        </div>
      )}

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
    </div>
  );
}
