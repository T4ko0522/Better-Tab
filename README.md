# <img src="assets/icon.png" alt="Better Tab" width="32" height="32" style="vertical-align: middle; margin-right: 8px;" /> Better Tab

カスタマイズ可能な新しいタブページ。時計、天気、カレンダー、トレンド記事を一つのページに集約した、モダンで使いやすい新しいタブページです。

![Better Tab Screenshot](assets/screen.png)

## ✨ 主な機能

### 🎨 背景のカスタマイズ
- **画像アップロード**: ローカルファイルから背景画像をアップロード
- **URL指定**: 画像URLを直接指定して背景を設定
- **動画対応**: 動画ファイルも背景として使用可能
- **画像クロップ**: アップロードした画像を自由にクロップ
- **自動切り替え**: 複数の背景画像をランダムまたは時間帯に応じて自動切り替え

### ⏰ 時計と天気
- **リアルタイム時計**: 日本時間（JST）で現在時刻を表示
- **天気情報**: 位置情報に基づいた天気予報（気象庁API）
  - 現在の気温と天気
  - 今後の予報（最大3日先）
  - 警報・注意報の表示

### 📅 カレンダー
- **月間カレンダー**: 現在の月のカレンダーを表示
- **祝日表示**: 日本の祝日を自動的に表示
- **今日のハイライト**: 今日の日付を強調表示

### 📰 トレンド記事
- **Qiitaトレンド**: Qiitaの人気記事を表示
- **記事タグ**: 各記事のタグを表示
- **外部リンク**: 記事をクリックして新しいタブで開く

### 🔍 検索機能
- **クイック検索**: 検索バーから直接検索
- **URLパラメータ対応**: `?q=検索語` で検索語を指定可能

### ⚙️ 設定
- **表示/非表示**: 各ウィジェット（天気、カレンダー、トレンド記事）の表示を切り替え
- **フォントカラー**: テキストの色を白または黒に変更
- **データ永続化**: IndexedDBを使用して設定と背景画像を保存

## 🛠️ 技術スタック

- **フレームワーク**: [Next.js](https://nextjs.org/) 16
- **UIライブラリ**: [React](https://react.dev/) 19
- **言語**: [TypeScript](https://www.typescriptlang.org/)
- **スタイリング**: [Tailwind CSS](https://tailwindcss.com/) 4
- **UIコンポーネント**: [Radix UI](https://www.radix-ui.com/)
- **データ保存**: IndexedDB
- **フォント**: [Geist](https://vercel.com/font)

## 📦 主要な依存関係

- `next`: Next.jsフレームワーク
- `react` / `react-dom`: Reactライブラリ
- `@radix-ui/react-dialog`: ダイアログコンポーネント
- `@radix-ui/react-slot`: スロットコンポーネント
- `lucide-react`: アイコンライブラリ
- `next-themes`: テーマ管理
- `react-easy-crop`: 画像クロップ機能
- `tailwindcss`: CSSフレームワーク

## 🌐 API

このプロジェクトは以下のAPIを使用しています：

- **気象庁API**: 天気予報と警報・注意報
- **OpenStreetMap Nominatim API**: 位置情報から市名を取得
- **holidays-jp.github.io API**: 日本の祝日情報
- **Qiita API**: トレンド記事

## 📁 プロジェクト構造

```
src/
├── app/
│   ├── api/          # APIルート
│   │   ├── weather/  # 天気情報API
│   │   ├── holidays/ # 祝日情報API
│   │   └── trending/ # トレンド記事API
│   ├── layout.tsx    # ルートレイアウト
│   ├── page.tsx      # ホームページ
│   └── globals.css   # グローバルスタイル
├── components/       # Reactコンポーネント
│   ├── calendar.tsx  # カレンダーコンポーネント
│   ├── clock.tsx     # 時計コンポーネント
│   ├── trending-articles.tsx # トレンド記事コンポーネント
│   └── ui/           # UIコンポーネント
├── hooks/            # カスタムフック
│   ├── useAppSettings.ts    # アプリ設定管理
│   └── useBackgroundImages.ts # 背景画像管理
└── lib/              # ユーティリティ
    ├── indexeddb-utils.ts   # IndexedDB操作
    ├── image-utils.ts        # 画像処理
    └── utils.ts              # 汎用ユーティリティ
```

## 🎯 使用方法

1. **背景画像の設定**
   - 設定アイコンをクリック
   - 「背景」タブを選択
   - 画像をアップロードするか、URLを入力
   - 必要に応じて画像をクロップ

2. **ウィジェットの表示/非表示**
   - 設定アイコンをクリック
   - 「表示設定」タブを選択
   - 各ウィジェットの表示/非表示を切り替え

3. **検索**
   - ページ中央の検索バーに検索語を入力
   - Enterキーを押すか検索ボタンをクリック

## 📝 ライセンス

このプロジェクトは [Apache License 2.0](LICENSE) の下で公開されています。