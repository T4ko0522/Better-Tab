"use client";

import { useState, useEffect } from "react";
import type React from "react";
import Image from "next/image";
import { ExternalLink, ChevronUp, ChevronDown } from "lucide-react";
import { fetchTrending } from "@/lib/extension-api";

/**
 * トレンド記事の型定義
 */
export interface TrendingArticle {
  id: string;
  title: string;
  url: string;
  tags: string[];
  source: "qiita";
  createdAt: string;
}

// グローバルなトレンド記事データキャッシュ（二重fetchを防ぐ）
const articlesCache: {
  data: TrendingArticle[];
  loading: boolean;
  promise: Promise<TrendingArticle[]> | null;
} = {
  data: [],
  loading: false,
  promise: null,
};

const STORAGE_KEY = "trending-articles";
const HEIGHT_STORAGE_KEY = "trending-panel-height";
const EXPANDED_STORAGE_KEY = "trending-panel-expanded";
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12時間（ミリ秒）

/**
 * localStorageからトレンド記事データを取得する
 *
 * @returns {TrendingArticle[] | null} キャッシュされた記事データ、またはnull
 */
const getCachedArticles = (): TrendingArticle[] | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as {
      data: TrendingArticle[];
      timestamp: number;
    };

    // タイムスタンプをチェック（12時間以内か）
    const now = Date.now();
    const elapsed = now - parsed.timestamp;

    if (elapsed > CACHE_DURATION_MS) {
      // 12時間を超えている場合は無効
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed.data;
  } catch {
    // パースエラーなどで失敗した場合は無効
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

/**
 * localStorageにトレンド記事データを保存する
 *
 * @param {TrendingArticle[]} articles - 保存する記事データ
 */
const saveCachedArticles = (articles: TrendingArticle[]): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const data = {
      data: articles,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save trending articles to localStorage:", error);
  }
};

/**
 * localStorageからパネルの高さを取得する
 *
 * @returns {number} 保存された高さ、またはデフォルト値
 */
const getSavedHeight = (): number => {
  if (typeof window === "undefined") {
    return 384;
  }

  try {
    const saved = localStorage.getItem(HEIGHT_STORAGE_KEY);
    if (saved) {
      const height = Number.parseInt(saved, 10);
      if (!Number.isNaN(height) && height >= 200 && height <= 800) {
        return height;
      }
    }
  } catch {
    // エラー時はデフォルト値を返す
  }
  return 384;
};

/**
 * localStorageにパネルの高さを保存する
 *
 * @param {number} height - 保存する高さ
 */
const saveHeight = (height: number): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(HEIGHT_STORAGE_KEY, height.toString());
  } catch (error) {
    console.error("Failed to save panel height to localStorage:", error);
  }
};

/**
 * localStorageから展開状態を取得する
 *
 * @returns {boolean} 保存された展開状態、またはfalse
 */
const getSavedExpanded = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const saved = localStorage.getItem(EXPANDED_STORAGE_KEY);
    return saved === "true";
  } catch {
    return false;
  }
};

/**
 * localStorageに展開状態を保存する
 *
 * @param {boolean} expanded - 保存する展開状態
 */
const saveExpanded = (expanded: boolean): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(EXPANDED_STORAGE_KEY, expanded.toString());
  } catch (error) {
    console.error("Failed to save expanded state to localStorage:", error);
  }
};

/**
 * Qiitaアイコンコンポーネント
 *
 * @returns {React.ReactElement} Qiitaアイコン
 */
const QiitaIcon = (): React.ReactElement => (
  <Image
    src="/qiita.webp"
    alt="Qiita"
    width={16}
    height={16}
    className="size-4"
    unoptimized
  />
);

/**
 * Zennアイコンコンポーネント
 *
 * @returns {React.ReactElement} Zennアイコン
 */
const ZennIcon = (): React.ReactElement => (
  <Image
    src="/zenn.webp"
    alt="Zenn"
    width={16}
    height={16}
    className="size-4"
    unoptimized
  />
);

/**
 * 日付文字列を「M月D日」形式にフォーマットする
 *
 * @param {string} dateString - 日付文字列
 * @returns {string} フォーマットされた日付文字列
 */
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  } catch {
    return "";
  }
};

/**
 * トレンド記事を表示するコンポーネント
 *
 * @param {object} props - コンポーネントのプロップス
 * @param {boolean} props.isLightBackground - 背景が明るいかどうか
 * @returns {React.ReactElement} トレンド記事コンポーネント
 */
export function TrendingArticles({ isLightBackground = false }: { isLightBackground?: boolean }): React.ReactElement {
  const [articles, setArticles] = useState<TrendingArticle[]>(articlesCache.data);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState(384); // デフォルト高さ（max-h-96 = 384px）
  const [isResizing, setIsResizing] = useState(false);
  const [initialized, setInitialized] = useState(false); // 初期化フラグ

  useEffect(() => {
    // クライアントサイドでのみ実行（ハイドレーションエラーを防ぐ）
    setMounted(true);

    // 初回マウント時にlocalStorageから設定を読み込む
    const savedHeight = getSavedHeight();
    const savedExpanded = getSavedExpanded();
    setHeight(savedHeight);
    setExpanded(savedExpanded);
    setInitialized(true);

    /**
     * トレンド記事を取得する
     */
    const fetchArticles = async (): Promise<void> => {
      // 既にメモリキャッシュがある場合はそれを使用
      if (articlesCache.data.length > 0) {
        setArticles(articlesCache.data);
        setLoading(false);
        return;
      }

      // localStorageからキャッシュを確認
      const cachedArticles = getCachedArticles();
      if (cachedArticles && cachedArticles.length > 0) {
        articlesCache.data = cachedArticles;
        setArticles(cachedArticles);
        setLoading(false);
        return;
      }

      // 既にfetch中の場合はそのPromiseを待つ
      if (articlesCache.promise) {
        setLoading(true);
        try {
          const data = await articlesCache.promise;
          setArticles(data);
        } catch {
          // エラー時は何もしない
        } finally {
          setLoading(false);
        }
        return;
      }

      // 初回fetch
      articlesCache.loading = true;
      setLoading(true);
      
      const fetchPromise = (async (): Promise<TrendingArticle[]> => {
        try {
          // 拡張機能環境を検出
          const isExtension = typeof window !== "undefined" && window.location.protocol === "chrome-extension:";
          // デフォルト（Vercelデプロイ時）は相対パス、静的エクスポート時（.env.localにtrueを記述）は外部URLを使用
          const useExternalApi = isExtension || process.env.NEXT_PUBLIC_USE_RELATIVE_API === "true";
          const response = useExternalApi
            ? await fetchTrending()
            : await fetch("/api/trending");
          if (response.ok) {
            const data: unknown = await response.json();
            if (Array.isArray(data)) {
              articlesCache.data = data;
              setArticles(data);
              // localStorageに保存
              saveCachedArticles(data);
              return data;
            }
          }
          return [];
        } catch (error) {
          console.error("Failed to fetch trending articles:", error);
          return [];
        } finally {
          articlesCache.loading = false;
          articlesCache.promise = null;
        }
      })();

      articlesCache.promise = fetchPromise;
      try {
        await fetchPromise;
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, []);

  // 展開状態が手動で変更されたときの処理
  const handleExpandToggle = (): void => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    saveExpanded(newExpanded);

    if (newExpanded) {
      // 展開時: 保存された高さがあればそれを使用、なければ600px
      const savedHeight = getSavedHeight();
      const newHeight = savedHeight > 384 ? savedHeight : 600;
      setHeight(newHeight);
      saveHeight(newHeight);
    } else {
      // 折りたたみ時は384pxに戻す
      setHeight(384);
    }
  };

  // リサイズ機能のマウスイベントハンドラ
  useEffect(() => {
    let currentHeight = height;

    const handleMouseMove = (e: MouseEvent): void => {
      if (!isResizing) return;

      // 画面の下からカーソルまでの距離を計算（md:bottom-6 = 1.5rem = 24px を考慮）
      const bottomOffset = 24; // md:bottom-6
      const newHeight = window.innerHeight - e.clientY - bottomOffset;

      // 最小高さ200px、最大高さ800pxに制限
      const clampedHeight = Math.max(200, Math.min(800, newHeight));
      currentHeight = clampedHeight;
      setHeight(clampedHeight);
    };

    const handleMouseUp = (): void => {
      setIsResizing(false);
      // リサイズ完了時に高さを保存
      saveHeight(currentHeight);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, height]);

  if (!mounted) {
    return <div />;
  }

  // スケルトンUIを表示
  if (loading) {
    return (
      <div className="md:fixed md:bottom-6 md:right-6 w-full md:w-80 bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-border z-20">
        <div className="mb-4">
          <div className="h-6 w-32 bg-white/20 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-black/20 rounded-lg p-3 border border-border/50"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="size-4 bg-white/20 rounded shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-4 bg-white/20 rounded w-full" />
                  <div className="h-4 bg-white/20 rounded w-4/5" />
                </div>
                <div className="size-4 bg-white/20 rounded shrink-0 mt-0.5" />
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                <div className="h-5 w-16 bg-white/20 rounded" />
                <div className="h-5 w-20 bg-white/20 rounded" />
                <div className="h-5 w-18 bg-white/20 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return <div />;
  }

  const displayedArticles = expanded ? articles : articles.slice(0, 3);
  const hasMore = articles.length > 3;

  return (
    <div
      className={`md:fixed md:bottom-6 md:right-6 w-full md:w-80 bg-black/30 backdrop-blur-sm rounded-lg border border-border z-20 ${
        expanded ? 'flex flex-col' : ''
      } ${!expanded ? 'max-h-96 overflow-hidden' : ''}`}
      style={expanded && mounted ? { height: `${height}px` } : {}}
    >
      {/* リサイズハンドル（展開時のみ表示） */}
      {expanded && (
        <div
          className="w-full h-2 cursor-ns-resize hover:bg-white/10 rounded-t-lg flex items-center justify-center"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="w-12 h-1 bg-white/30 rounded-full" />
        </div>
      )}

      {/* コンテンツエリア */}
      <div className={`${expanded ? 'flex-1 overflow-y-auto' : 'overflow-hidden'} scrollbar-hide p-4 ${expanded ? 'pt-2' : ''}`}>
      <button
        onClick={handleExpandToggle}
        className="w-full flex items-center justify-between mb-4 hover:opacity-80"
      >
        <h3 className="text-lg font-semibold text-foreground">トレンド記事</h3>
        {hasMore && (
          <div className={`flex items-center gap-1 ${
            isLightBackground ? "text-gray-600" : "text-white/80"
          }`}>
            {expanded ? (
              <>
                <span className="text-xs">折りたたむ</span>
                <ChevronDown className="size-4" />
              </>
            ) : (
              <>
                <span className="text-xs">展開</span>
                <ChevronUp className="size-4" />
              </>
            )}
          </div>
        )}
      </button>
      <div className="space-y-3">
        {displayedArticles.map((article) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/20 hover:bg-black/40 rounded-lg p-3 border border-border/50 cursor-pointer group block"
          >
            <div className="flex items-start gap-2 mb-2">
              <div className="mt-0.5 shrink-0 text-foreground">
                {article.source === "qiita" ? <QiitaIcon /> : <ZennIcon />}
              </div>
              <div className="flex-1 min-w-0">
                {article.createdAt && (
                  <p className="text-xs mb-1 text-white">
                    {formatDate(article.createdAt)}
                  </p>
                )}
                <h4 className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-2">
                  {article.title}
                </h4>
              </div>
              <ExternalLink className="size-4 shrink-0 text-muted-foreground mt-0.5" />
            </div>
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {article.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 bg-primary/20 text-primary rounded border border-primary/30"
                  >
                    {tag}
                  </span>
                ))}
                {article.tags.length > 3 && (
                  <span className="text-xs px-2 py-0.5 text-muted-foreground">
                    +{article.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </a>
        ))}
      </div>
      </div>
    </div>
  );
}

