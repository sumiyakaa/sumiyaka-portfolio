# CLAUDE.md — AKASHIKI Portfolio v2（Next.js 移行）

## 絶対ルール（違反厳禁）

1. **個人情報禁止** — あおきさんの本名・年齢・住所・連絡先等を一切コード内・コメント内・コミットメッセージに含めない
2. **Phase 厳守** — 指示された Phase のみ実装すること。次の Phase には絶対に着手しない
3. **設計書承認以外ではノンストップで完了まで自走すること** — 途中で確認を求めず、Phase 内の全タスクを完了してから報告する
4. **`/exit` 前に必ず完了報告** — 実装内容・残課題・次 Phase への申し送りを出力する

---

## プロジェクト情報

- **プロジェクト名:** akashiki-portfolio
- **作業ディレクトリ:** `C:\Users\lelie\OneDrive\デスクトップ\VScode\制作物\akashiki-portfolio\`
- **技術スタック:** Next.js (App Router) / TypeScript / Tailwind CSS + CSS Modules / GSAP + Lenis + Framer Motion / Three.js / Resend
- **デプロイ:** Vercel（カスタムドメイン予定）
- **Node.js:** 最新 LTS を使用
- **パッケージマネージャ:** npm

---

## コーディング規約

### TypeScript
- `strict: true`
- 型定義は `types/` ディレクトリに集約
- `any` 禁止。やむを得ない場合は `unknown` + 型ガード
- コンポーネント props は interface で定義

### コンポーネント設計
- Server Component をデフォルトとし、必要な箇所のみ `"use client"` を付与
- WebGL / アニメーション / フォーム等のインタラクティブ要素のみ Client Component
- Three.js 関連は `next/dynamic` + `ssr: false` で動的インポート
- コンポーネントファイル名: PascalCase（`WorkCard.tsx`）

### スタイリング
- Tailwind CSS を主軸とする
- WebGL コンポーネント・複雑なアニメーション用に CSS Modules を併用
- CSS Modules ファイル名: `ComponentName.module.css`
- グローバルCSS は `app/globals.css` のみ
- カラーパレット（Tailwind config で定義）:
  - `primary`: モノトーン黒系
  - `secondary`: モノトーングレー系
  - `accent`: 必要に応じて
  - `background`: 黒〜ダークグレー
  - `foreground`: 白〜ライトグレー

### ホバー・アニメーション基準値
- カード: `translateY(-6px)` + `box-shadow` 増加
- 画像: `scale(1.06)`
- リンク/ボタン: `opacity: 0.8` or カラー変化
- transition: `300ms ease` を基準

### 画像
- `next/image` を必須使用
- 形式: WebP
- 1 枚 500KB 以下厳守
- `sizes` 属性を必ず指定

### フォント（`next/font`）
- 見出し: Barlow
- 本文（日本語）: Noto Sans JP
- コード/技術表記: IBM Plex Mono
- オープニング 3D テキスト: Anton

---

## ディレクトリ構成

```
akashiki-portfolio/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── about/page.tsx
│   ├── service/page.tsx
│   ├── works/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── contact/page.tsx
│   ├── privacy/page.tsx
│   ├── api/contact/route.ts
│   ├── sitemap.ts
│   └── robots.ts
├── components/
│   ├── webgl/
│   │   ├── LanternScene.tsx
│   │   ├── InkFluidScene.tsx
│   │   └── OpeningAnimation.tsx
│   ├── animation/
│   │   ├── PageTransition.tsx
│   │   ├── ScrollReveal.tsx
│   │   └── SmoothScroll.tsx
│   ├── works/
│   │   ├── WorksGrid.tsx
│   │   ├── WorksFilter.tsx
│   │   └── WorkCard.tsx
│   ├── contact/
│   │   └── ContactForm.tsx
│   └── layout/
│       ├── Header.tsx
│       └── Footer.tsx
├── data/
│   └── works.json
├── types/
│   └── work.ts
├── lib/
│   ├── works.ts
│   └── mail.ts
├── public/
│   ├── works/
│   ├── shaders/
│   └── llms.txt
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
└── package.json
```

---

## デザイン品質基準（全 Phase 共通）

1. 画面幅 100% 使い切り（中央寄せ + 両端余白 NG）
2. 写真・イラストはページ面積の 50% 以上
3. レイアウトパターン 5 種以上、同一パターン 2 回連続禁止
4. 装飾要素で空間を埋め尽くす（静止セクション禁止）
5. タイポグラフィの極端なサイズコントラスト（Hero テキスト = 画面の約 60%）
6. アニメーション必須：パララックス / マーキー / スクロール連動
7. カーソル追従エフェクトは不採用
8. 実績数字のカウントアップ横並び 4 つは NG（文章内に数字を溶け込ませる形式を推奨）

---

## ページ濃度 4 原則（最優先）

1. **CSS 密度** — padding/margin/hover/装飾を各要素に細かく定義
2. **メディアの見せ方バリエーション** — カード内/全幅帯/オーバーレイ等を使い分け
3. **タイポグラフィの緩急** — 極端に大きい数字・見出しと小さいラベルの落差
4. **画像は贅沢に使う** — 素材不足を考慮した控えめな設計は禁止

---

## 完了報告テンプレート（各 Phase 終了時に出力）

```
## Phase X 完了報告

### 実装内容
- [ ] タスク1
- [ ] タスク2

### 自己診断（11 項目）
1. 画面幅 100% 使い切り: ✅ / ❌
2. 写真面積 50% 以上: ✅ / ❌
3. レイアウトパターン 5 種以上: ✅ / ❌
4. 静止セクションなし: ✅ / ❌
5. タイポ緩急あり: ✅ / ❌
6. ホバーアニメーション全要素: ✅ / ❌
7. CSS 密度（padding/margin 細かく定義）: ✅ / ❌
8. メディア見せ方 3 パターン以上: ✅ / ❌
9. AI 感・テンプレート感の排除: ✅ / ❌
10. レスポンシブ（PC + SP）: ✅ / ❌
11. TypeScript 型エラーなし: ✅ / ❌

### 残課題・次 Phase への申し送り
-
```

---

## フッター

制作者クレジット: `© 2026 AKASHIKI. All rights reserved.`
