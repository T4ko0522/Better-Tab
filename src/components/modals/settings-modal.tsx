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
import type { BackgroundSettingsUpdate } from "@/types/background";

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
  /** アナログ時計を表示するか */
  showAnalogClock: boolean;
  /** 背景の明るさ調整（-50から+50、0がデフォルト） */
  backgroundBrightness: number;
  /** カレンダーに元号を表示するか */
  showCalendarEra: boolean;
}

/** 背景設定（フックから取得した settings の型） */
interface BackgroundSettingsShape {
  backgroundAutoChange: {
    enabled: boolean;
    intervalMinutes: number;
  };
}

/**
 * SettingsModalコンポーネントのプロパティ
 */
interface SettingsModalProps {
  /** アプリ設定 */
  appSettings: AppSettings;
  /** アプリ設定を更新する関数 */
  updateAppSettings: (settings: Partial<AppSettings>) => void;
  /** 背景設定 */
  backgroundSettings: BackgroundSettingsShape;
  /** 背景設定を更新する関数 */
  updateSettings: (settings: BackgroundSettingsUpdate) => void;
  /** 現在のタブ */
  settingsTab: string;
  /** タブを変更する関数 */
  setSettingsTab: (tab: string) => void;
  /** 設定を開いた時のハンドラー */
  handleOpenSettings: () => void;
}

/**
 * 設定モーダルコンポーネント
 * アプリと背景（画像・動画）の設定を管理する
 *
 * @param {SettingsModalProps} props - コンポーネントのプロパティ
 * @returns {React.ReactElement} 設定モーダル
 */
export const SettingsModal = ({
  appSettings,
  updateAppSettings,
  backgroundSettings,
  updateSettings,
  settingsTab,
  setSettingsTab,
  handleOpenSettings,
}: SettingsModalProps): React.ReactElement => {
  const ac = backgroundSettings.backgroundAutoChange;
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            #backgroundBrightness::-webkit-slider-thumb {
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
            #backgroundBrightness::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: #3b82f6;
              cursor: pointer;
              border: 2px solid white;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            }
          `,
        }}
      />
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
        <Tabs
          value={settingsTab === "video" ? "background" : settingsTab}
          onValueChange={setSettingsTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="display">表示設定</TabsTrigger>
            <TabsTrigger value="background">背景</TabsTrigger>
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
                    id="showCalendarEra"
                    checked={appSettings.showCalendarEra}
                    onChange={(e) =>
                      updateAppSettings({ showCalendarEra: e.target.checked })
                    }
                    disabled={!appSettings.showCalendar}
                    className="size-4"
                  />
                  <label htmlFor="showCalendarEra" className="text-sm">
                    カレンダーに元号を表示
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="showAnalogClock"
                    checked={appSettings.showAnalogClock}
                    onChange={(e) =>
                      updateAppSettings({
                        showAnalogClock: e.target.checked,
                      })
                    }
                    className="size-4"
                  />
                  <label htmlFor="showAnalogClock" className="text-sm">
                    アナログ時計を表示
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
            <div>
              <h3 className="text-sm font-semibold mb-3">背景設定</h3>
              <div className="space-y-3">
                <div>
                  <label htmlFor="backgroundBrightness" className="text-sm block mb-2">
                    背景の明るさ調整
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-12">暗く</span>
                    <input
                      id="backgroundBrightness"
                      type="range"
                      min="-50"
                      max="50"
                      value={appSettings.backgroundBrightness}
                      onChange={(e) =>
                        updateAppSettings({
                          backgroundBrightness: Number(e.target.value),
                        })
                      }
                      className="flex-1 h-2 bg-blue-500 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${((appSettings.backgroundBrightness + 50) / 100) * 100}%, #e5e7eb ${((appSettings.backgroundBrightness + 50) / 100) * 100}%, #e5e7eb 100%)`,
                      }}
                    />
                    <span className="text-xs text-muted-foreground w-12">明るく</span>
                  </div>
                  <div className="mt-2">
                    <Input
                      type="number"
                      min="-50"
                      max="50"
                      value={appSettings.backgroundBrightness}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        if (!isNaN(value) && value >= -50 && value <= 50) {
                          updateAppSettings({
                            backgroundBrightness: value,
                          });
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 背景設定タブ（画像・動画共通） */}
          <TabsContent value="background" className="space-y-6 mt-4">
            <div>
              <h3 className="text-sm font-semibold mb-3">背景の自動切り替え</h3>
              <p className="text-xs text-muted-foreground mb-3">
                画像・動画をまとめて「背景」として扱い、設定した間隔でランダムに自動切り替えします。
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="changeByTime"
                    checked={ac.enabled}
                    onChange={(e) =>
                      updateSettings({
                        backgroundAutoChange: { enabled: e.target.checked },
                      })
                    }
                    className="size-4"
                  />
                  <label htmlFor="changeByTime" className="text-sm">
                    時間で切り替える（常にランダム）
                  </label>
                </div>
                <div>
                  <label
                    htmlFor="interval"
                    className={`text-sm block mb-2 ${!ac.enabled ? "text-muted-foreground" : ""}`}
                  >
                    切り替え間隔（分）
                  </label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={ac.intervalMinutes}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value >= 1) {
                        updateSettings({
                          backgroundAutoChange: { intervalMinutes: value },
                        });
                      }
                    }}
                    disabled={!ac.enabled}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    例: 5分・60分・1440分（24時間）。時刻を参照して切り替えます（タブを開いているかに関係なく動作）
                  </p>
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
    </>
  );
};

