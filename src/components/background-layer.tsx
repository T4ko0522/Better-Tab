"use client";

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
  /** 背景の明るさ調整（-50から+50、0がデフォルト） */
  backgroundBrightness: number;
}

/**
 * 背景レイヤーコンポーネント
 * 背景画像や動画を表示する
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
  backgroundBrightness,
}: BackgroundLayerProps): React.ReactElement => {
  // 動画イベントを監視して、停止時のみ再生を再開する
  React.useEffect(() => {
    if (!isVideo || !videoRef.current) return;

    const video = videoRef.current;

    const resumePlayback = (): void => {
      if (video.paused && !video.ended && video.readyState >= 2) {
        void video.play();
      }
    };

    const handleEnded = (): void => {
      video.currentTime = 0;
      void video.play();
    };

    const handleCanPlay = (): void => {
      resumePlayback();
      setIsVideoLoaded(true);
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("pause", resumePlayback);
    video.addEventListener("canplay", handleCanPlay);

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("pause", resumePlayback);
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
      {/* 背景の明るさ調整オーバーレイ */}
      {currentImage && backgroundBrightness !== 0 && (
        <div
          className="absolute inset-0 z-1"
          style={{
            backgroundColor: backgroundBrightness > 0 ? "white" : "black",
            opacity: Math.abs(backgroundBrightness) / 100,
          }}
        />
      )}
    </div>
  );
};
