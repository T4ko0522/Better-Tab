import type { NextConfig } from "next";

/**
 * 静的エクスポートを使用するかどうか
 * .env.localでSTATIC_EXPORT=trueを設定すると静的エクスポートが有効になる
 * デフォルトではfalse（APIルートを使用可能）
 */
const isStaticExport =
  process.env.STATIC_EXPORT === "true" &&
  process.env.VERCEL !== "1";

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(isStaticExport && { output: "export" }),
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
