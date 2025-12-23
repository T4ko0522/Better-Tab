import { NextResponse } from "next/server";

/**
 * 静的エクスポート用の設定
 */
export const dynamic = "force-static";

/**
 * GET リクエストハンドラー
 * holidays-jp.github.io APIから祝日情報を取得して返す
 *
 * @param {Request} request - リクエストオブジェクト
 * @returns {Promise<NextResponse>} 祝日情報のJSONレスポンス
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    // クエリパラメータから年を取得（デフォルトは現在の年）
    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year") || new Date().getFullYear().toString();

    // holidays-jp.github.io APIから祝日を取得
    const response = await fetch(
      `https://holidays-jp.github.io/api/v1/${year}/date.json`,
      {
        headers: {
          "User-Agent": "Homepage-Calendar-Widget",
        },
        next: { revalidate: 86400 }, // 1日キャッシュ
      }
    );

    if (!response.ok) {
      console.error("Holidays API error:", response.status);
      // エラーの場合は空オブジェクトを返す
      return NextResponse.json({ holidays: {} });
    }

    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null) {
      // 日付をキーとしたオブジェクトをそのまま返す
      return NextResponse.json({ holidays: data });
    }

    return NextResponse.json({ holidays: {} });
  } catch (error) {
    console.error("Failed to fetch holidays:", error);
    // エラーの場合は空オブジェクトを返す
    return NextResponse.json({ holidays: {} });
  }
}

