import * as React from "react";

/**
 * BackgroundLayerコンポーネントのプロパティ
 */
interface BackgroundLayerProps {
  /** 現在の背景画像URL */
  currentImage: string | null;
  /** 動画かどうか */
  isVideo: boolean;
  /** 背景スタイル */
  backgroundStyle: React.CSSProperties;
  /** ビデオ要素のRef */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** 動画が読み込まれたか */
  isVideoLoaded: boolean;
  /** 動画読み込み状態を更新する関数 */
  setIsVideoLoaded: (loaded: boolean) => void;
  /** オーバーレイを表示するか */
  showOverlay: boolean;
}

/**
 * 背景レイヤーコンポーネント
 * 背景画像や動画、オーバーレイを表示する
 *
 * @param {BackgroundLayerProps} props - コンポーネントのプロパティ
 * @returns {React.ReactElement} 背景レイヤー
 */
export const BackgroundLayer = ({
  currentImage,
  isVideo,
  backgroundStyle,
  videoRef,
  isVideoLoaded,
  setIsVideoLoaded,
  showOverlay,
}: BackgroundLayerProps): React.ReactElement => {
  // 動画の再生状態を監視し、停止した場合に自動的に再生を再開
  React.useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const video = videoRef.current;
    let checkInterval: NodeJS.Timeout | null = null;

    /**
     * 動画の再生状態をチェックし、停止している場合は再生を再開
     */
    const checkAndResume = (): void => {
      if (!video) return;

      // 動画が終了している場合（endedがtrueで、currentTimeがdurationに近い場合）
      if (video.ended && video.duration > 0) {
        video.currentTime = 0;
        void video.play();
        return;
      }

      // 動画が一時停止している場合（pausedがtrueで、endedがfalseの場合）
      if (video.paused && !video.ended && video.readyState >= 2) {
        void video.play();
        return;
      }
    };

    // 定期的に再生状態をチェック（100msごと）
    checkInterval = setInterval(checkAndResume, 100);

    // 動画のイベントリスナーを追加
    const handleTimeUpdate = (): void => {
      // 動画が最後に近づいたとき（残り0.1秒以内）に次のループの準備
      if (video.duration > 0 && video.currentTime >= video.duration - 0.1) {
        // ループが確実に動作するように、少し前に戻してから再生を継続
        if (video.ended) {
          video.currentTime = 0;
          void video.play();
        }
      }
    };

    const handleCanPlay = (): void => {
      // 動画が再生可能になったら確実に再生
      if (video.paused && !video.ended) {
        void video.play();
      }
      setIsVideoLoaded(true);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, [isVideo, videoRef, setIsVideoLoaded]);

  return (
    <div
      className="fixed inset-0 w-full h-full bg-background"
      style={backgroundStyle}
    >
      {/* 背景動画 */}
      {currentImage && isVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover z-0"
          src={currentImage}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          onLoadedData={() => {
            setIsVideoLoaded(true);
          }}
          onEnded={(e) => {
            // ループ時に確実に再生を継続
            const video = e.currentTarget;
            video.currentTime = 0;
            void video.play();
          }}
          onSeeking={() => {
            // シーク中も動画を表示し続ける
            setIsVideoLoaded(true);
          }}
          onSeeked={() => {
            // シーク完了後も動画を表示し続ける
            setIsVideoLoaded(true);
          }}
          onError={(e) => {
            const video = e.currentTarget;
            console.error("Video load error:", {
              error: video.error,
              code: video.error?.code,
              message: video.error?.message,
              src: currentImage,
              networkState: video.networkState,
              readyState: video.readyState,
            });
          }}
          style={{
            opacity: isVideoLoaded ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
        />
      )}
      {/* オーバーレイ（背景メディアがある場合かつ設定で有効な場合のみ表示） */}
      {currentImage && showOverlay && (
        <div className="absolute inset-0 bg-background/20 dark:bg-background/40 z-1" />
      )}
    </div>
  );
};

