import { NextResponse } from "next/server";

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

/**
 * Qiitaのトレンド記事を取得
 *
 * @returns {Promise<TrendingArticle[]>} トレンド記事の配列
 */
async function getQiitaTrending(): Promise<TrendingArticle[]> {
  try {
    // Qiita API: 人気順で記事を取得（1ページあたり最大15件）
    const response = await fetch(
      "https://qiita.com/api/v2/items?page=1&per_page=20&query=stocks:>10",
      {
        headers: {
          "User-Agent": "Homepage-Trending-Articles",
        },
        next: { revalidate: 3600 }, // 1時間キャッシュ
      }
    );

    if (!response.ok) {
      console.error("Qiita API error:", response.status);
      return [];
    }

    const data: unknown = await response.json();
    if (!Array.isArray(data)) {
      return [];
    }

    const articles: TrendingArticle[] = [];
    for (const item of data) {
      if (
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "title" in item &&
        "url" in item &&
        "tags" in item &&
        "created_at" in item
      ) {
        const article = item as {
          id: string;
          title: string;
          url: string;
          tags: Array<{ name: string }>;
          created_at: string;
        };
        articles.push({
          id: `qiita-${article.id}`,
          title: article.title,
          url: article.url,
          tags: article.tags.map((tag) => tag.name),
          source: "qiita",
          createdAt: article.created_at,
        });
      }
    }
    return articles;
  } catch (error) {
    console.error("Failed to fetch Qiita trending:", error);
    return [];
  }
}


/**
 * GET リクエストハンドラー
 * Qiitaのトレンド記事を取得して返す
 *
 * @returns {Promise<NextResponse>} トレンド記事のJSONレスポンス
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Qiitaの記事を取得
    const articles = await getQiitaTrending();

    return NextResponse.json(articles);
  } catch (error) {
    console.error("Failed to fetch trending articles:", error);
    return NextResponse.json(
      { error: "Failed to fetch trending articles" },
      { status: 500 }
    );
  }
}

