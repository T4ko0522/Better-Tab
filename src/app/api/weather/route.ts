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
  warnings?: Array<{
    type: string;
    status: string;
  }>;
}

/**
 * 天気コードから天気の説明を取得
 *
 * @param {string} weatherCode - 天気コード
 * @returns {string} 天気の説明
 */
function getWeatherDescription(weatherCode: string): string {
  const code = parseInt(weatherCode, 10);
  if (isNaN(code)) {
    return "晴れ";
  }

  // 気象庁の天気コード分類
  // 1xx: 晴れ
  if (code >= 100 && code < 200) {
    return "晴れ";
  }
  // 2xx: 曇り
  if (code >= 200 && code < 300) {
    // 212, 213は雨
    if (code === 212 || code === 213) {
      return "雨";
    }
    return "曇り";
  }
  // 3xx: 雨
  if (code >= 300 && code < 400) {
    return "雨";
  }
  // 4xx: 雪
  if (code >= 400 && code < 500) {
    return "雪";
  }

  return "晴れ";
}

/**
 * 天気コードからアイコンを取得
 *
 * @param {string} weatherCode - 天気コード
 * @returns {string} アイコン名
 */
function getWeatherIcon(weatherCode: string): string {
  const code = parseInt(weatherCode, 10);
  if (isNaN(code)) {
    return "01d";
  }

  // 気象庁の天気コード分類
  // 1xx: 晴れ
  if (code >= 100 && code < 200) {
    return "01d";
  }
  // 2xx: 曇り
  if (code >= 200 && code < 300) {
    // 212, 213は雨
    if (code === 212 || code === 213) {
      return "10d";
    }
    return "02d";
  }
  // 3xx: 雨
  if (code >= 300 && code < 400) {
    return "10d";
  }
  // 4xx: 雪
  if (code >= 400 && code < 500) {
    return "13d";
  }

  return "01d";
}

/**
 * 日付を「今日」「明日」「明後日」などの表示に変換
 *
 * @param {Date} date - 日付
 * @param {Date} today - 今日の日付
 * @returns {string} 日付の表示文字列
 */
function formatDateLabel(date: Date, today: Date): string {
  const diffDays = Math.floor(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return "今日";
  } else if (diffDays === 1) {
    return "明日";
  } else if (diffDays === 2) {
    return "明後日";
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }
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
 * 警報・注意報を取得
 *
 * @param {string} areaCode - エリアコード
 * @returns {Promise<Array<{type: string, status: string}>>} 警報・注意報の配列
 */
async function getWarnings(
  areaCode: string
): Promise<Array<{ type: string; status: string }>> {
  try {
    const response = await fetch(
      `https://www.jma.go.jp/bosai/warning/data/warning/${areaCode}.json`,
      {
        headers: {
          "User-Agent": "Homepage-Weather-Widget",
        },
        next: { revalidate: 600 }, // 10分キャッシュ
      }
    );

    if (!response.ok) {
      return [];
    }

    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null) {
      return [];
    }

    const warnings: Array<{ type: string; status: string }> = [];

    // 警報・注意報データを解析
    if ("areaTypes" in data && Array.isArray(data.areaTypes)) {
      for (const areaType of data.areaTypes) {
        if (
          typeof areaType === "object" &&
          areaType !== null &&
          "areas" in areaType &&
          Array.isArray(areaType.areas)
        ) {
          for (const area of areaType.areas) {
            if (
              typeof area === "object" &&
              area !== null &&
              "warnings" in area &&
              Array.isArray(area.warnings)
            ) {
              for (const warning of area.warnings) {
                if (
                  typeof warning === "object" &&
                  warning !== null &&
                  "status" in warning &&
                  "name" in warning
                ) {
                  const status = String(warning.status);
                  const name = String(warning.name);

                  // 発表中の警報・注意報のみを追加
                  if (
                    status === "発表" ||
                    status === "継続" ||
                    status === "special_warning"
                  ) {
                    warnings.push({
                      type: name,
                      status: status,
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return warnings;
  } catch (error) {
    console.error("Failed to get warnings:", error);
    return [];
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
        next: { revalidate: 3600 }, // 1時間キャッシュ
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

    // forecastData[0]: 短期予報（今日、明日、明後日）
    const shortTermData = forecastData[0] as {
      timeSeries: Array<{
        timeDefines?: string[];
        areas: Array<{
          area: { name: string; code?: string };
          weatherCodes?: string[];
          temps?: string[];
        }>;
      }>;
    };

    // forecastData[1]: 7日間予報（明日から7日後まで）
    const longTermData = forecastData[1] as {
      timeSeries: Array<{
        timeDefines?: string[];
        areas: Array<{
          area: { name: string; code?: string };
          weatherCodes?: string[];
          tempsMin?: string[];
          tempsMax?: string[];
          pops?: string[];
        }>;
      }>;
    } | undefined;

    // 短期予報から今日の天気を取得
    const shortTermWeatherSeries = shortTermData.timeSeries[0];
    if (!shortTermWeatherSeries || !shortTermWeatherSeries.areas || shortTermWeatherSeries.areas.length === 0) {
      return NextResponse.json({
        temperature: null,
        description: "晴れ",
        icon: "01d",
        location: "東京",
      });
    }

    const shortTermArea = shortTermWeatherSeries.areas[0];
    const shortTermTimeDefines = shortTermWeatherSeries.timeDefines || [];

    // 短期予報から気温を取得（timeSeries[2]に気温データがある）
    const shortTermTempSeries = shortTermData.timeSeries[2];
    const shortTermTempArea = shortTermTempSeries?.areas?.find(
      (area) => area.area.name === "東京" || area.area.code === "44132"
    ) || shortTermTempSeries?.areas?.[0];

    // 今日の天気コードを取得（最初の予報日）
    const todayWeatherCode = shortTermArea.weatherCodes?.[0] || "100";
    const weatherDescription = getWeatherDescription(todayWeatherCode);

    // 今日の気温を取得（短期予報のtempsから）
    // tempsの構造: [現在時刻の気温, 今日の最低気温, 明日の最低気温, 明日の最高気温]
    let temperature: number | null = null;
    if (shortTermTempArea?.temps && shortTermTempArea.temps.length > 0) {
      // 現在時刻の気温を優先、なければ今日の最低気温
      const currentTempStr = shortTermTempArea.temps[0];
      if (currentTempStr && currentTempStr !== "--") {
        const temp = parseFloat(currentTempStr);
        if (!isNaN(temp)) {
          temperature = temp;
        }
      }
    }

    // エリア名を取得（市名を使用）
    const location = cityName || shortTermArea.area?.name || "東京";

    // 警報・注意報を取得
    const warnings = await getWarnings(areaCode);

    // 日ごとの天気予報を取得（最大3日先まで）
    const futureForecast: Array<{
      time: string;
      description: string;
      icon: string;
      precipitation?: string;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 時刻を0時にリセット

    // 7日間予報がある場合はそれを使用、なければ短期予報を使用
    if (longTermData && longTermData.timeSeries && longTermData.timeSeries.length > 0) {
      const longTermWeatherSeries = longTermData.timeSeries[0];
      const longTermTempSeries = longTermData.timeSeries[1];

      if (longTermWeatherSeries && longTermWeatherSeries.areas && longTermWeatherSeries.areas.length > 0) {
        const longTermArea = longTermWeatherSeries.areas[0];
        const longTermTimeDefines = longTermWeatherSeries.timeDefines || [];
        const longTermTempArea = longTermTempSeries?.areas?.find(
          (area) => area.area.name === "東京" || area.area.code === "44132"
        ) || longTermTempSeries?.areas?.[0];
        const longTermTempTimeDefines = longTermTempSeries?.timeDefines || [];

        // 7日間予報から最大3日分を取得
        if (longTermArea.weatherCodes && longTermTimeDefines.length > 0) {
          for (let i = 0; i < Math.min(longTermArea.weatherCodes.length, 3); i++) {
            const code = longTermArea.weatherCodes[i];
            const timeStr = longTermTimeDefines[i];

            if (code && timeStr) {
              const forecastDate = new Date(timeStr);
              forecastDate.setHours(0, 0, 0, 0);

              // 今日以降の予報のみ追加
              if (forecastDate >= today) {
                const desc = getWeatherDescription(code);

                // 対応する気温を取得
                let tempInfo = "";
                if (longTermTempArea && longTermTempTimeDefines.length > 0) {
                  // 同じ日付の気温を探す
                  for (let j = 0; j < longTermTempTimeDefines.length; j++) {
                    const tempDate = new Date(longTermTempTimeDefines[j]);
                    tempDate.setHours(0, 0, 0, 0);
                    if (tempDate.getTime() === forecastDate.getTime()) {
                      const minTemp = longTermTempArea.tempsMin?.[j];
                      const maxTemp = longTermTempArea.tempsMax?.[j];
                      if (minTemp && minTemp !== "" && maxTemp && maxTemp !== "") {
                        tempInfo = `${minTemp}°/${maxTemp}°`;
                      } else if (maxTemp && maxTemp !== "") {
                        tempInfo = `${maxTemp}°`;
                      } else if (minTemp && minTemp !== "") {
                        tempInfo = `${minTemp}°`;
                      }
                      break;
                    }
                  }
                }

                futureForecast.push({
                  time: formatDateLabel(forecastDate, today),
                  description: desc,
                  icon: getWeatherIcon(code),
                  precipitation: tempInfo || undefined,
                });
              }
            }
          }
        }
      }
    } else {
      // 7日間予報がない場合は短期予報を使用
      if (shortTermArea.weatherCodes && shortTermTimeDefines.length > 0) {
        for (let i = 0; i < Math.min(shortTermArea.weatherCodes.length, 3); i++) {
          const code = shortTermArea.weatherCodes[i];
          const timeStr = shortTermTimeDefines[i];

          if (code && timeStr) {
            const forecastDate = new Date(timeStr);
            forecastDate.setHours(0, 0, 0, 0);

            // 今日以降の予報のみ追加
            if (forecastDate >= today) {
              const desc = getWeatherDescription(code);

              futureForecast.push({
                time: formatDateLabel(forecastDate, today),
                description: desc,
                icon: getWeatherIcon(code),
              });
            }
          }
        }
      }
    }

    const response = NextResponse.json({
      temperature,
      description: weatherDescription,
      icon: getWeatherIcon(todayWeatherCode),
      location,
      futureForecast: futureForecast.length > 0 ? futureForecast : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    });

    // 1時間キャッシュを設定
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    return response;
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
