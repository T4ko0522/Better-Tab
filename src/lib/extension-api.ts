/**
 * APIクライアント
 * 通常ビルド時（Next.jsサーバー）用の外部URL呼び出し
 */

const API_BASE_URL = "https://better-tab.vercel.app";

/**
 * 天気情報を取得（通常ビルド時用）
 *
 * @param {string} lat - 緯度
 * @param {string} lon - 経度
 * @returns {Promise<Response>} レスポンス
 */
export async function fetchWeather(
  lat?: string,
  lon?: string
): Promise<Response> {
  const params = new URLSearchParams();
  if (lat) params.append("lat", lat);
  if (lon) params.append("lon", lon);
  const url = `${API_BASE_URL}/api/weather${params.toString() ? `?${params.toString()}` : ""}`;
  return fetch(url);
}

/**
 * 祝日情報を取得（通常ビルド時用）
 *
 * @param {string} year - 年
 * @returns {Promise<Response>} レスポンス
 */
export async function fetchHolidays(year?: string): Promise<Response> {
  const params = new URLSearchParams();
  if (year) params.append("year", year);
  const url = `${API_BASE_URL}/api/holidays${params.toString() ? `?${params.toString()}` : ""}`;
  return fetch(url);
}

/**
 * トレンド記事を取得（通常ビルド時用）
 *
 * @returns {Promise<Response>} レスポンス
 */
export async function fetchTrending(): Promise<Response> {
  return fetch(`${API_BASE_URL}/api/trending`);
}

