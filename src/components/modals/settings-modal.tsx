import * as React from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings, Github, Twitter } from "lucide-react";
import type { SearchEngine } from "@/hooks/useAppSettings";
import type { BackgroundSettings } from "@/hooks/useBackgroundImages";

/**
 * アプリ設定の型
 */
interface AppSettings {
  /** 天気を表示するか */
  showWeather: boolean;
  /** 天気の市町村名を表示するか */
  showWeatherLocation: boolean;
  /** カレンダーを表示するか */
  showCalendar: boolean;
  /** トレンド記事を表示するか */
  showTrendingArticles: boolean;
  /** 検索エンジン */
  searchEngine: SearchEngine;
}

/**
 * SettingsModalコンポーネントのプロパティ
 */
interface SettingsModalProps {
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
 * 設定モーダルコンポーネント
 * アプリと背景画像の設定を管理する
 *
 * @param {SettingsModalProps} props - コンポーネントのプロパティ
 * @returns {React.ReactElement} 設定モーダル
 */
export const SettingsModal = ({
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
  settingsTab,
  setSettingsTab,
  handleOpenSettings,
  isCurrentMediaVideo,
}: SettingsModalProps): React.ReactElement => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/90 dark:bg-black/30 backdrop-blur-sm border border-border hover:bg-white dark:hover:bg-black/40"
          onClick={handleOpenSettings}
        >
          <Settings className="size-4" />
          設定
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>設定</DialogTitle>
          <DialogDescription>
            各種設定を変更できます
          </DialogDescription>
        </DialogHeader>
        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="display">表示設定</TabsTrigger>
            <TabsTrigger value="background">背景画像</TabsTrigger>
          </TabsList>

          {/* 表示設定タブ */}
          <TabsContent value="display" className="space-y-6 mt-4">
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
                    id="showWeatherLocation"
                    checked={appSettings.showWeatherLocation}
                    onChange={(e) =>
                      updateAppSettings({ showWeatherLocation: e.target.checked })
                    }
                    disabled={!appSettings.showWeather}
                    className="size-4"
                  />
                  <label htmlFor="showWeatherLocation" className="text-sm">
                    天気の市町村名を表示
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
            <div>
              <h3 className="text-sm font-semibold mb-3">検索設定</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="searchEngine" className="text-sm block mb-2">
                    検索エンジン
                  </label>
                  <select
                    id="searchEngine"
                    value={appSettings.searchEngine}
                    onChange={(e) =>
                      updateAppSettings({
                        searchEngine: e.target.value as SearchEngine,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="google">Google</option>
                    <option value="bing">Bing</option>
                    <option value="duckduckgo">DuckDuckGo</option>
                    <option value="yahoo">Yahoo</option>
                    <option value="brave">Brave Search</option>
                  </select>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 背景画像設定タブ */}
          <TabsContent value="background" className="space-y-6 mt-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">背景画像</h3>
              {isCurrentMediaVideo && (
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ※ 現在の背景は動画のため、これらの設定は画像選択時のみ有効です。
                </p>
              )}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="changeByTime"
                    checked={settingsChangeByTime}
                    onChange={(e) => {
                      const value = e.target.checked;
                      setSettingsChangeByTime(value);
                      updateSettings({ changeByTime: value });
                    }}
                    disabled={isCurrentMediaVideo}
                    className="size-4"
                  />
                  <label htmlFor="changeByTime" className={`text-sm ${isCurrentMediaVideo ? "text-muted-foreground" : ""}`}>
                    画像を時間で変更する
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="shuffle"
                    checked={settingsShuffle}
                    onChange={(e) => {
                      const value = e.target.checked;
                      setSettingsShuffle(value);
                      updateSettings({ shuffle: value });
                    }}
                    disabled={isCurrentMediaVideo}
                    className="size-4"
                  />
                  <label htmlFor="shuffle" className={`text-sm ${isCurrentMediaVideo ? "text-muted-foreground" : ""}`}>
                    ランダムにシャッフル
                  </label>
                </div>
                <div>
                  <label htmlFor="interval" className={`text-sm block mb-2 ${isCurrentMediaVideo ? "text-muted-foreground" : ""}`}>
                    画像変更間隔（分）
                  </label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={settingsInterval}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setSettingsInterval(value);
                      updateSettings({ changeInterval: value });
                    }}
                    disabled={isCurrentMediaVideo || !settingsChangeByTime}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showOverlay"
                    checked={settingsShowOverlay}
                    onChange={(e) => {
                      const value = e.target.checked;
                      setSettingsShowOverlay(value);
                      updateSettings({ showOverlay: value });
                    }}
                    className="size-4"
                  />
                  <label htmlFor="showOverlay" className="text-sm">
                    背景画像の上にオーバーレイを表示
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="flex flex-row justify-between items-center pt-4 border-t border-border sm:justify-between">
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
  );
};

