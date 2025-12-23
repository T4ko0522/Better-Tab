/**
 * ブラウザ拡張機能のマニフェストファイルを生成
 */

/**
 * マニフェストの型定義
 */
interface Manifest {
  manifest_version: number;
  name: string;
  version: string;
  description: string;
  icons: {
    [key: string]: string;
  };
  chrome_url_overrides: {
    newtab: string;
  };
  permissions: string[];
  host_permissions: string[];
  content_security_policy: {
    extension_pages: string;
  };
}

/**
 * マニフェストデータを生成
 *
 * @returns {Manifest} マニフェストオブジェクト
 */
export function generateManifest(): Manifest {
  return {
    manifest_version: 3,
    name: "Better Tab - Customized New Tab!",
    version: "1.0.0",
    description: "カスタマイズ可能な新しいタブページ",
    icons: {
      "16": "icon.png",
      "48": "icon.png",
      "128": "icon.png",
    },
    chrome_url_overrides: {
      newtab: "index.html",
    },
    permissions: ["storage", "geolocation"],
    host_permissions: [
      "https://better-tab.vercel.app/*",
      "https://openweathermap.org/*",
    ],
    content_security_policy: {
      extension_pages:
        "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
    },
  };
}

