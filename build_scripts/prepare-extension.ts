/**
 * ブラウザ拡張機能用のビルドを準備するスクリプト
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateManifest } from "./src/manifest.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * ディレクトリを再帰的にコピー
 *
 * @param {string} src - コピー元
 * @param {string} dest - コピー先
 */
function copyDir(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    // Chrome拡張機能では_で始まるファイル/ディレクトリ名は使用不可
    // 先頭のすべての_を削除
    const destName = entry.name.replace(/^_+/, "");
    const destPath = path.join(dest, destName);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * ファイルをコピー
 *
 * @param {string} src - コピー元
 * @param {string} dest - コピー先
 */
function copyFile(src: string, dest: string): void {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

/**
 * ディレクトリ内のファイル内の文字列を置換
 *
 * @param {string} dir - 対象ディレクトリ
 * @param {RegExp} pattern - 置換パターン
 * @param {string} replacement - 置換文字列
 */
function replaceInFiles(dir: string, pattern: RegExp, replacement: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      replaceInFiles(entryPath, pattern, replacement);
    } else if (entry.isFile()) {
      // HTML、JavaScript、JSON、CSS、TXTファイルを処理
      const ext = path.extname(entry.name).toLowerCase();
      if ([".html", ".js", ".json", ".css", ".txt"].includes(ext)) {
        try {
          let content = fs.readFileSync(entryPath, "utf-8");
          content = content.replace(pattern, replacement);
          fs.writeFileSync(entryPath, content, "utf-8");
        } catch {
          // バイナリファイルの場合はスキップ
        }
      }
    }
  }
}

/**
 * HTMLファイルからインラインスクリプトを抽出して外部ファイルに移動
 *
 * @param {string} htmlPath - HTMLファイルのパス
 */
function extractInlineScripts(htmlPath: string): void {
  try {
    let htmlContent = fs.readFileSync(htmlPath, "utf-8");
    const htmlDir = path.dirname(htmlPath);
    let scriptCounter = 0;
    const replacements: Array<{ original: string; replacement: string }> = [];

    // src属性がないインラインスクリプトを検出
    // <script>...</script> または <script id="..." async>...</script> のようなパターン
    const inlineScriptRegex = /<script(?![^>]*\ssrc=["'])([^>]*)>([\s\S]*?)<\/script>/gi;
    let match: RegExpExecArray | null;

    while ((match = inlineScriptRegex.exec(htmlContent)) !== null) {
      const fullMatch = match[0];
      const attributes = match[1] || "";
      const scriptContent = match[2].trim();

      // 空のスクリプトはスキップ
      if (!scriptContent) {
        continue;
      }

      // スクリプトファイルを生成
      const scriptFileName = `inline-script-${scriptCounter++}.js`;
      const scriptPath = path.join(htmlDir, scriptFileName);
      fs.writeFileSync(scriptPath, scriptContent, "utf-8");

      // 置換用の情報を保存
      // 属性を保持しつつ、src属性を追加
      const newAttributes = attributes.trim();
      const scriptTag = newAttributes
        ? `<script${newAttributes} src="${scriptFileName}"></script>`
        : `<script src="${scriptFileName}"></script>`;

      replacements.push({
        original: fullMatch,
        replacement: scriptTag,
      });
    }

    // 置換を実行（後ろから前に置換してインデックスを保持）
    for (let i = replacements.length - 1; i >= 0; i--) {
      htmlContent = htmlContent.replace(replacements[i].original, replacements[i].replacement);
    }

    if (replacements.length > 0) {
      fs.writeFileSync(htmlPath, htmlContent, "utf-8");
      console.log(`${path.basename(htmlPath)}: ${replacements.length}個のインラインスクリプトを抽出`);
    }
  } catch (error) {
    console.warn(`HTMLファイルの処理中にエラーが発生しました: ${htmlPath}`, error);
  }
}

/**
 * ディレクトリ内のすべてのHTMLファイルからインラインスクリプトを抽出
 *
 * @param {string} dir - 対象ディレクトリ
 */
function extractInlineScriptsFromDir(dir: string): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      extractInlineScriptsFromDir(entryPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
      extractInlineScripts(entryPath);
    }
  }
}

console.log("拡張機能用のファイルを準備中...");

const outDir = path.join(__dirname, "../../out");
const extensionDir = path.join(__dirname, "../extension");

// extensionディレクトリをクリーンアップ
if (fs.existsSync(extensionDir)) {
  fs.rmSync(extensionDir, { recursive: true, force: true });
}

// extensionディレクトリを作成
fs.mkdirSync(extensionDir, { recursive: true });

// outディレクトリからファイルをコピー
if (fs.existsSync(outDir)) {
  console.log("ビルド成果物をコピー中...");
  copyDir(outDir, extensionDir);
  
  // HTMLファイルとJavaScriptファイル内の/_next/を/next/に置換
  console.log("パスを修正中...");
  replaceInFiles(extensionDir, /\/_next\//g, "/next/");
  
  // インラインスクリプトを外部ファイルに抽出（CSP対応）
  console.log("インラインスクリプトを抽出中...");
  extractInlineScriptsFromDir(extensionDir);
} else {
  console.error(
    "outディレクトリが見つかりません。先にbuildを実行してください。"
  );
  process.exit(1);
}

// manifest.jsonを生成
console.log("manifest.jsonを生成中...");
const manifest = generateManifest();
fs.writeFileSync(
  path.join(extensionDir, "manifest.json"),
  JSON.stringify(manifest, null, 2)
);

// アイコンをコピー
const iconPath = path.join(__dirname, "../../src/app/icon.png");
if (fs.existsSync(iconPath)) {
  console.log("アイコンをコピー中...");
  copyFile(iconPath, path.join(extensionDir, "icon.png"));
} else {
  console.warn("アイコンファイルが見つかりません:", iconPath);
}

console.log("拡張機能の準備が完了しました！");
console.log(`extensionディレクトリ: ${extensionDir}`);
