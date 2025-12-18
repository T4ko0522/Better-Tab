"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

/**
 * テーマプロバイダーコンポーネント
 * ライト/ダークテーマの管理とシステム設定への対応を提供
 *
 * @param {ThemeProviderProps} props - テーマプロバイダーのプロパティ
 * @returns {React.ReactElement} テーマプロバイダーコンポーネント
 */
export function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps): React.ReactElement {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}

