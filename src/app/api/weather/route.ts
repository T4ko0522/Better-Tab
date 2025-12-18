import { NextResponse } from "next/server";

/**
 * 天気情報の型定義
 */
export interface WeatherData {
  temperature: number | null;
  description: string;
  icon: string;
  location: string;
  futureForecast?: Array<{
    time: string;
    description: string;
    icon: string;
    precipitation?: string;
  }>;
}

/**
 * 天気コードからアイコンを取得
 *
 * @param {string} weatherCode - 天気コード
 * @returns {string} アイコン名
 */
function getWeatherIcon(weatherCode: string): string {
  // 気象庁の天気コードをアイコンに変換
  if (weatherCode.includes("100") || weatherCode.includes("晴")) {
    return "01d";
  }
  if (weatherCode.includes("200") || weatherCode.includes("曇")) {
    return "02d";
  }
  if (weatherCode.includes("300") || weatherCode.includes("雨")) {
    return "10d";
  }
  if (weatherCode.includes("400") || weatherCode.includes("雪")) {
    return "13d";
  }
  return "01d";
}

/**
 * 逆ジオコーディングで市名を取得
 *
 * @param {string} lat - 緯度
 * @param {string} lon - 経度
 * @returns {Promise<string>} 市名
 */
async function getCityName(lat: string, lon: string): Promise<string> {
  try {
    // OpenStreetMapのNominatim APIを使用して逆ジオコーディング
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=ja`,
      {
        headers: {
          "User-Agent": "Homepage-Weather-Widget",
        },
        next: { revalidate: 3600 }, // 1時間キャッシュ
      }
    );

    if (!response.ok) {
      return "東京";
    }

    const data: unknown = await response.json();
    if (
      typeof data === "object" &&
      data !== null &&
      "address" in data &&
      typeof data.address === "object" &&
      data.address !== null
    ) {
      const address = data.address as {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        prefecture?: string;
      };

      // 市名を取得（優先順位: city > municipality > town > village）
      const cityName =
        address.city ||
        address.municipality ||
        address.town ||
        address.village ||
        "東京";

      return cityName;
    }

    return "東京";
  } catch (error) {
    console.error("Failed to get city name:", error);
    return "東京";
  }
}

/**
 * 市名からエリアコードを取得（デフォルトは東京）
 *
 * @param {string} cityName - 市名
 * @returns {string} エリアコード
 */
function getAreaCodeFromCity(cityName: string): string {
  // 主要都市のエリアコードマッピング
  const cityCodeMap: Record<string, string> = {
    東京: "130000",
    大阪: "270000",
    名古屋: "230000",
    福岡: "400000",
    札幌: "016000",
    横浜: "140000",
    仙台: "040000",
    広島: "340000",
    京都: "260000",
    神戸: "280000",
    千葉: "120000",
    さいたま: "110000",
    川崎: "140000",
    静岡: "220000",
    新潟: "150000",
    浜松: "220000",
    岡山: "330000",
    熊本: "430000",
    鹿児島: "460000",
    沖縄: "470000",
  };

  // 市名に含まれるキーワードからエリアコードを判定
  for (const [city, code] of Object.entries(cityCodeMap)) {
    if (cityName.includes(city) || city.includes(cityName)) {
      return code;
    }
  }

  // 都道府県名から判定
  if (cityName.includes("都") || cityName.includes("東京")) {
    return "130000";
  }
  if (cityName.includes("府") || cityName.includes("大阪") || cityName.includes("京都")) {
    return cityName.includes("京都") ? "260000" : "270000";
  }
  if (cityName.includes("県")) {
    // 県名から大まかに判定（簡易版）
    if (cityName.includes("愛知") || cityName.includes("名古屋")) {
      return "230000";
    }
    if (cityName.includes("福岡")) {
      return "400000";
    }
    if (cityName.includes("北海道") || cityName.includes("札幌")) {
      return "016000";
    }
  }

  // デフォルトは東京
  return "130000";
}

/**
 * GET リクエストハンドラー
 * 気象庁APIから天気情報を取得して返す
 *
 * @param {Request} request - リクエストオブジェクト
 * @returns {Promise<NextResponse>} 天気情報のJSONレスポンス
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    // クエリパラメータから緯度・経度を取得（デフォルトは東京）
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get("lat") || "35.6762";
    const lon = searchParams.get("lon") || "139.6503";

    // 市名を取得
    const cityName = await getCityName(lat, lon);
    
    // エリアコードを取得
    const areaCode = getAreaCodeFromCity(cityName);

    // 気象庁の天気予報APIからデータを取得
    const forecastResponse = await fetch(
      `https://www.jma.go.jp/bosai/forecast/data/forecast/${areaCode}.json`,
      {
        headers: {
          "User-Agent": "Homepage-Weather-Widget",
        },
        next: { revalidate: 600 }, // 10分キャッシュ
      }
    );

    if (!forecastResponse.ok) {
      console.error("Weather API error:", forecastResponse.status);
      // エラーの場合はデフォルト値を返す
      return NextResponse.json({
        temperature: null,
        description: "晴れ",
        icon: "01d",
        location: "東京",
      });
    }

    const forecastData: unknown = await forecastResponse.json();
    if (
      !Array.isArray(forecastData) ||
      forecastData.length === 0 ||
      typeof forecastData[0] !== "object" ||
      forecastData[0] === null
    ) {
      return NextResponse.json({
        temperature: null,
        description: "晴れ",
        icon: "01d",
        location: "東京",
      });
    }

    const areaData = forecastData[0] as {
      timeSeries: Array<{
        areas: Array<{
          area: { name: string };
          weatherCodes?: string[];
          temps?: string[];
        }>;
      }>;
    };

    // 最初のエリアのデータを取得
    const firstArea =
      areaData.timeSeries[0]?.areas?.[0] ||
      areaData.timeSeries[1]?.areas?.[0];

    if (!firstArea) {
      return NextResponse.json({
        temperature: null,
        description: "晴れ",
        icon: "01d",
        location: "東京",
      });
    }

    // 天気コードから天気を取得
    const weatherCode =
      firstArea.weatherCodes?.[0] || firstArea.weatherCodes?.[1] || "100";
    const weatherDescription = weatherCode.includes("100")
      ? "晴れ"
      : weatherCode.includes("200")
      ? "曇り"
      : weatherCode.includes("300")
      ? "雨"
      : weatherCode.includes("400")
      ? "雪"
      : "晴れ";

    // 気温を取得（可能な場合）
    let temperature: number | null = null;
    if (firstArea.temps && firstArea.temps.length > 0) {
      const tempStr = firstArea.temps[0];
      if (tempStr && tempStr !== "--") {
        const temp = parseFloat(tempStr);
        if (!isNaN(temp)) {
          temperature = temp;
        }
      }
    }

    // エリア名を取得（市名を使用）
    const location = cityName || firstArea.area?.name || "東京";

    // 数時間後の天気予報を取得
    const futureForecast: Array<{
      time: string;
      description: string;
      icon: string;
      precipitation?: string;
    }> = [];

    // timeSeriesから数時間後の天気を取得
    for (const timeSeries of areaData.timeSeries) {
      if (timeSeries.areas && timeSeries.areas.length > 0) {
        const area = timeSeries.areas[0];
        if (area.weatherCodes && area.weatherCodes.length > 1) {
          // 最初の3時間分の予報を取得（現在を除く）
          for (let i = 1; i < Math.min(4, area.weatherCodes.length); i++) {
            const code = area.weatherCodes[i];
            if (code) {
              const desc = code.includes("100")
                ? "晴れ"
                : code.includes("200")
                ? "曇り"
                : code.includes("300")
                ? "雨"
                : code.includes("400")
                ? "雪"
                : "晴れ";
              
              futureForecast.push({
                time: `${i * 3}時間後`,
                description: desc,
                icon: getWeatherIcon(code),
              });
            }
          }
        }
      }
    }

    return NextResponse.json({
      temperature,
      description: weatherDescription,
      icon: getWeatherIcon(weatherCode),
      location,
      futureForecast: futureForecast.length > 0 ? futureForecast : undefined,
    });
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    // エラーの場合はデフォルト値を返す
    return NextResponse.json({
      temperature: null,
      description: "晴れ",
      icon: "01d",
      location: "東京",
    });
  }
}
