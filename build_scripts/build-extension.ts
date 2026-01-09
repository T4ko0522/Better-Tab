/**
 * 拡張機能用のビルドスクリプト
 * APIルートを一時的に移動してから静的ビルドを実行し、その後復元する
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// build_scripts/dist/build-extension.js から実行されるため、2階層上がってプロジェクトルートに到達
const projectRoot = path.resolve(__dirname, "../..");
const apiDir = path.resolve(projectRoot, "src/app/api");
// Next.jsがルートとして認識しないよう、src/appの外にバックアップを配置
const apiBackupDir = path.resolve(projectRoot, ".api-backup");
const notFoundFile = path.resolve(projectRoot, "src/app/not-found.tsx");
const notFoundBackupFile = path.resolve(projectRoot, ".not-found-backup.tsx");

/**
 * APIルートを一時的にバックアップ
 */
function backupApiRoutes(): void {
  console.log(`APIディレクトリ: ${apiDir}`);
  console.log(`API存在確認: ${fs.existsSync(apiDir)}`);

  if (fs.existsSync(apiDir)) {
    console.log("APIルートをバックアップ中...");
    if (fs.existsSync(apiBackupDir)) {
      fs.rmSync(apiBackupDir, { recursive: true, force: true });
    }
    // Windowsでの権限問題を避けるため、コピー＆削除を使用
    fs.cpSync(apiDir, apiBackupDir, { recursive: true });
    fs.rmSync(apiDir, { recursive: true, force: true });
    console.log("✓ APIルートをバックアップしました");
  } else {
    console.log("⚠ APIディレクトリが見つかりません");
  }
}

/**
 * not-found.tsxを一時的にバックアップ
 */
function backupNotFound(): void {
  if (fs.existsSync(notFoundFile)) {
    console.log("not-found.tsxをバックアップ中...");
    fs.copyFileSync(notFoundFile, notFoundBackupFile);
    fs.unlinkSync(notFoundFile);
    console.log("✓ not-found.tsxをバックアップしました");
  }
}

/**
 * APIルートを復元
 */
function restoreApiRoutes(): void {
  if (fs.existsSync(apiBackupDir)) {
    console.log("APIルートを復元中...");
    if (fs.existsSync(apiDir)) {
      fs.rmSync(apiDir, { recursive: true, force: true });
    }
    // Windowsでの権限問題を避けるため、コピー＆削除を使用
    fs.cpSync(apiBackupDir, apiDir, { recursive: true });
    fs.rmSync(apiBackupDir, { recursive: true, force: true });
    console.log("✓ APIルートを復元しました");
  }
}

/**
 * not-found.tsxを復元
 */
function restoreNotFound(): void {
  if (fs.existsSync(notFoundBackupFile)) {
    console.log("not-found.tsxを復元中...");
    fs.copyFileSync(notFoundBackupFile, notFoundFile);
    fs.unlinkSync(notFoundBackupFile);
    console.log("✓ not-found.tsxを復元しました");
  }
}

try {
  // APIルートをバックアップ
  backupApiRoutes();
  // not-found.tsxをバックアップ
  backupNotFound();

  // 静的ビルドを実行
  console.log("\n静的ビルドを実行中...");
  execSync("cross-env STATIC_EXPORT=true pnpm run build:web", {
    cwd: projectRoot,
    stdio: "inherit",
  });

  // 拡張機能用アセットを準備
  console.log("\n拡張機能用アセットを準備中...");
  execSync("pnpm run build:extension-assets", {
    cwd: projectRoot,
    stdio: "inherit",
  });

  console.log("\n✓ 拡張機能のビルドが完了しました！");
} catch (error) {
  console.error("\n✗ ビルドエラーが発生しました");
  throw error;
} finally {
  // エラーが発生してもAPIルートとnot-found.tsxを必ず復元
  restoreApiRoutes();
  restoreNotFound();
}
