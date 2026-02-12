export interface BackgroundImage {
  id: string;
  url: string;
  thumbnail?: string;
  name?: string;
}

/** 背景（画像・動画共通）の自動切り替え設定。ON の場合は常にランダムで切り替える */
export interface BackgroundAutoChangeSettings {
  enabled: boolean;
  /** 切り替え間隔（分）。動画も同じ単位で扱う（例: 24時間 = 1440） */
  intervalMinutes: number;
}

export interface BackgroundSettings {
  selectedImageUrl: string | null;
  backgroundAutoChange: BackgroundAutoChangeSettings;
}

/** 旧形式（imageAutoChange / videoAutoChange 別々）からの移行用 */
export interface LegacyBackgroundSettings {
  selectedImageUrl?: string | null;
  shuffle?: boolean;
  changeInterval?: number;
  changeByTime?: boolean;
  videoChangeInterval?: number;
  videoShuffle?: boolean;
  videoChangeByTime?: boolean;
  imageAutoChange?: {
    enabled?: boolean;
    shuffle?: boolean;
    intervalMinutes?: number;
  };
  videoAutoChange?: {
    enabled?: boolean;
    shuffle?: boolean;
    intervalHours?: number;
  };
}

export interface BackgroundSettingsUpdate {
  selectedImageUrl?: string | null;
  backgroundAutoChange?: Partial<BackgroundAutoChangeSettings>;
}
