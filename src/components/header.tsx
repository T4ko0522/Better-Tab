import * as React from "react";
import { Button } from "@/components/ui/button";
import { BackgroundImageModal } from "@/components/modals/background-image-modal";
import { SettingsModal } from "@/components/modals/settings-modal";
import type { BackgroundSettings } from "@/hooks/useBackgroundImages";
import type { AppSettings } from "@/hooks/useAppSettings";

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
 * Headerコンポーネントのプロパティ
 */
interface HeaderProps {
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
  /** アプリ設定 */
  appSettings: AppSettings;
  /** アプリ設定を更新する関数 */
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  /** 背景画像設定を更新する関数 */
  updateSettings: (settings: Partial<BackgroundSettings>) => void;
  /** シャッフル設定 */
  settingsShuffle: boolean;
  /** シャッフル設定を更新する関数 */
  setSettingsShuffle: (value: boolean) => void;
  /** 画像変更間隔設定 */
  settingsInterval: number;
  /** 画像変更間隔設定を更新する関数 */
  setSettingsInterval: (value: number) => void;
  /** オーバーレイ表示設定 */
  settingsShowOverlay: boolean;
  /** オーバーレイ表示設定を更新する関数 */
  setSettingsShowOverlay: (value: boolean) => void;
  /** 時間で変更設定 */
  settingsChangeByTime: boolean;
  /** 時間で変更設定を更新する関数 */
  setSettingsChangeByTime: (value: boolean) => void;
  /** 動画変更間隔設定 */
  settingsVideoChangeInterval: number;
  /** 動画変更間隔設定を更新する関数 */
  setSettingsVideoChangeInterval: (value: number) => void;
  /** 動画シャッフル設定 */
  settingsVideoShuffle: boolean;
  /** 動画シャッフル設定を更新する関数 */
  setSettingsVideoShuffle: (value: boolean) => void;
  /** 現在のタブ */
  settingsTab: string;
  /** タブを変更する関数 */
  setSettingsTab: (tab: string) => void;
  /** 設定を開いた時のハンドラー */
  handleOpenSettings: () => void;
  /** 現在のメディアが動画かどうか */
  isCurrentMediaVideo: boolean;
}

/**
 * ヘッダーコンポーネント
 * 背景画像モーダル、設定モーダル、Gmailボタンを含む
 *
 * @param {HeaderProps} props - コンポーネントのプロパティ
 * @returns {React.ReactElement} ヘッダー
 */
export const Header = ({
  images,
  currentImage,
  imageUrl,
  setImageUrl,
  isUploading,
  addImage,
  removeImage,
  selectImage,
  handleFileSelect,
  handleAddImage,
  thumbnailCache,
  setThumbnailCache,
  appSettings,
  updateAppSettings,
  updateSettings,
  settingsShuffle,
  setSettingsShuffle,
  settingsInterval,
  setSettingsInterval,
  settingsShowOverlay,
  setSettingsShowOverlay,
  settingsChangeByTime,
  setSettingsChangeByTime,
  settingsVideoChangeInterval,
  setSettingsVideoChangeInterval,
  settingsVideoShuffle,
  setSettingsVideoShuffle,
  settingsTab,
  setSettingsTab,
  handleOpenSettings,
  isCurrentMediaVideo,
}: HeaderProps): React.ReactElement => {
  return (
    <header className="flex justify-center md:justify-end items-start p-6 gap-4">
      <BackgroundImageModal
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
      />

      <SettingsModal
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
        isCurrentMediaVideo={isCurrentMediaVideo}
      />

      <Button
        variant="outline"
        size="sm"
        className="bg-white/90 dark:bg-black/30 backdrop-blur-sm border border-border hover:bg-white dark:hover:bg-black/40 flex items-center gap-2 text-foreground"
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
  );
};

