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
 * トレンド記事を表示するコンポーネント
 *
 * @returns {React.ReactElement} トレンド記事コンポーネント
 */
export function TrendingArticles(): React.ReactElement {
  const [articles, setArticles] = useState<TrendingArticle[]>(articlesCache.data);
  const [loading, setLoading] = useState(!articlesCache.data.length && articlesCache.loading);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    // クライアントサイドでのみ実行（ハイドレーションエラーを防ぐ）
    setMounted(true);

    /**
     * トレンド記事を取得する
     */
    const fetchArticles = async (): Promise<void> => {
      // 既にキャッシュがある場合はそれを使用
      if (articlesCache.data.length > 0) {
        setArticles(articlesCache.data);
        setLoading(false);
        return;
      }

      // 既にfetch中の場合はそのPromiseを待つ
      if (articlesCache.promise) {
        try {
          const data = await articlesCache.promise;
          setArticles(data);
        } catch {
          // エラー時は何もしない
        }
        setLoading(false);
        return;
      }

      // 初回fetch
      articlesCache.loading = true;
      setLoading(true);
      
      const fetchPromise = (async (): Promise<TrendingArticle[]> => {
        try {
          // デフォルト（Vercelデプロイ時）は相対パス、静的エクスポート時（.env.localにtrueを記述）は外部URLを使用
          const useExternalApi = process.env.NEXT_PUBLIC_USE_RELATIVE_API === "true";
          const response = useExternalApi
            ? await fetchTrending()
            : await fetch("/api/trending");
          if (response.ok) {
            const data: unknown = await response.json();
            if (Array.isArray(data)) {
              articlesCache.data = data;
              setArticles(data);
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
          setLoading(false);
        }
      })();

      articlesCache.promise = fetchPromise;
      await fetchPromise;
    };

    fetchArticles();
  }, []);

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

  const displayedArticles = articles;
  const hasMore = articles.length > 3;

  return (
    <div
      className={`md:fixed md:bottom-6 md:right-6 w-full md:w-80 bg-black/30 backdrop-blur-sm rounded-lg p-4 border border-border z-20 overflow-y-auto scrollbar-hide ${
        expanded ? "max-h-[500px]" : "max-h-96"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between mb-4 hover:opacity-80"
      >
        <h3 className="text-lg font-semibold text-foreground">トレンド記事</h3>
        {hasMore && (
          <div className="flex items-center gap-1 text-muted-foreground">
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
              <h4 className="text-sm font-medium text-foreground group-hover:text-primary line-clamp-2 flex-1">
                {article.title}
              </h4>
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
  );
}

