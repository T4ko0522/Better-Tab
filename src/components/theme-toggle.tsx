"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * テーマ切り替えボタンコンポーネント
 * ライト/ダークテーマの切り替えを提供
 *
 * @returns {React.ReactElement} テーマ切り替えボタンコンポーネント
 */
export function ThemeToggle(): React.ReactElement {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // マウント後にレンダリング（ハイドレーションエラーを防ぐ）
  useEffect(() => {
    // ハイドレーションエラーを防ぐためにuseEffectでマウント状態を設定する必要がある
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="sm" className="bg-background/90 hover:bg-background">
        <Sun className="size-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="bg-background/90 hover:bg-background"
      onClick={() => {
        if (theme === "dark") {
          setTheme("light");
        } else if (theme === "light") {
          setTheme("system");
        } else {
          setTheme("dark");
        }
      }}
      title={
        theme === "dark"
          ? "ダークテーマ（クリックでライトに変更）"
          : theme === "light"
          ? "ライトテーマ（クリックでシステムに変更）"
          : "システム設定に従う（クリックでダークに変更）"
      }
    >
      {theme === "dark" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </Button>
  );
}

