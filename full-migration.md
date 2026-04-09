# full-migration.md — AKASHIKI Portfolio Next.js 移行 実装指示書

> **実行前に必ず CLAUDE.md を読み込むこと。**
> 設計書承認以外ではノンストップで完了まで自走すること。
> 指示された Phase のみ実装し、次の Phase には絶対に着手しないこと。

---

## 移行元情報

- **現行サイト:** https://sumiyakaa.github.io/portfolio/
- **現行ソース:** `C:\Users\lelie\OneDrive\デスクトップ\VScode\制作物\portfolio\`（参照用。直接編集しない）
- **現行技術:** HTML / CSS / JavaScript / GSAP / ScrollTrigger / Lenis / WebGL（GLSL シェーダー）/ Three.js

---

## Phase 1 — プロジェクト初期化 + 基盤構築

### タスク

1. `npx create-next-app@latest akashiki-portfolio` で初期化
   - TypeScript: Yes
   - Tailwind CSS: Yes
   - ESLint: Yes
   - App Router: Yes
   - src/ directory: No
   - import alias: `@/*`

2. 追加パッケージインストール
   ```
   npm install gsap @studio-freight/lenis framer-motion three
   npm install -D @types/three
   ```

3. Tailwind 設定（`tailwind.config.ts`）
   - カラーパレット定義（モノトーン基調）
   - フォントファミリー定義（barlow / noto-sans-jp / ibm-plex-mono / anton）
   - アニメーション用カスタムキーフレーム

4. `next.config.ts` 設定
   - `images.formats: ['image/webp']`
   - webpack 設定: `.glsl` / `.frag` / `.vert` ファイルを raw-loader で読み込み

5. フォント設定（`app/layout.tsx`）
   - `next/font/google` で Barlow / Noto Sans JP / IBM Plex Mono / Anton を読み込み
   - CSS 変数として body に適用

6. グローバル CSS（`app/globals.css`）
   - Tailwind ディレクティブ
   - CSS 変数定義（カラー / フォント / スペーシング）
   - リセット・ベーススタイル

7. 型定義作成（`types/work.ts`）
   ```typescript
   export interface Work {
     slug: string;
     title: string;
     tier: "S" | "A" | "B" | "C";
     category: string[];
     technologies: string[];
     description: string;
     thumbnail: string;
     images: string[];
     liveUrl?: string;
     isPickUp: boolean;
     order: number;
   }
   ```

8. Works データ作成（`data/works.json`）
   - 現行ポートフォリオの 21 作品を全件登録
   - Pick Up 6: Reform / GYM / Bistro / Beauty Clinic No2 / Atelier / Caldwell
   - Tier 分類: S / A / B を現行通り設定

9. Works ユーティリティ（`lib/works.ts`）
   - `getAllWorks()`: 全作品取得
   - `getWorkBySlug(slug)`: slug で 1 件取得
   - `getPickUpWorks()`: Pick Up 作品取得
   - `getWorksByCategory(category)`: カテゴリフィルタ
   - `getWorksByTechnology(tech)`: 技術フィルタ
   - `getAllCategories()`: 全カテゴリ一覧
   - `getAllTechnologies()`: 全技術一覧

10. ESLint + Prettier 設定

### 完了条件
- `npm run dev` でエラーなく起動
- `npm run build` が正常完了
- TypeScript 型エラーなし
- 完了報告テンプレートを出力

---

## Phase 2 — レイアウト + 共通コンポーネント

### タスク

1. **SmoothScroll プロバイダー**（`components/animation/SmoothScroll.tsx`）
   - `"use client"`
   - Lenis インスタンスを Context で提供
   - GSAP ScrollTrigger との連携設定
   - `app/layout.tsx` でラップ

2. **Header**（`components/layout/Header.tsx`）
   - 現行デザインを移植
   - ナビゲーション: Home / About / Service / Works / Contact
   - SP: ハンバーガーメニュー（Framer Motion でアニメーション）
   - スクロール時の背景変化

3. **Footer**（`components/layout/Footer.tsx`）
   - クレジット: `© 2026 AKASHIKI. All rights reserved.`
   - ナビリンク
   - Privacy Policy リンク

4. **PageTransition**（`components/animation/PageTransition.tsx`）
   - `"use client"`
   - Framer Motion `AnimatePresence` + `motion.div`
   - フェード + スライドの遷移アニメーション
   - `app/layout.tsx` の children をラップ（App Router の template.tsx 活用も検討）

5. **ScrollReveal**（`components/animation/ScrollReveal.tsx`）
   - `"use client"`
   - GSAP ScrollTrigger ベースの汎用スクロールアニメーションラッパー
   - Props: `direction` (`up` | `down` | `left` | `right`), `delay`, `duration`

6. **ルートレイアウト**（`app/layout.tsx`）
   - フォント適用
   - SmoothScroll > Header + PageTransition(children) + Footer
   - メタデータベース設定

### 完了条件
- 全ページでヘッダー/フッターが表示される
- Lenis スムーススクロールが動作
- ページ遷移アニメーションが動作
- SP ハンバーガーメニューが動作
- 完了報告テンプレートを出力

---

## Phase 3 — トップ + About + Service ページ

### 前提
- WebGL 演出（ランタン / 墨流し / Opening 3D テキスト）はこの Phase では**プレースホルダー**とする（背景色 + ローディングテキストのダミー要素）
- 静的コンテンツ・レイアウト・非 WebGL アニメーションを完成させる

### トップページ（`app/page.tsx`）

1. **Hero セクション**
   - Opening アニメーション用プレースホルダー（`<div>` + "Loading 3D..." テキスト）
   - メインコピー: 現行サイトから移植
   - スクロールインジケーター

2. **Pick Up Works セクション**
   - `getPickUpWorks()` で 6 作品取得
   - カード形式で表示（サムネイルのみカラー、他はモノトーン）
   - ホバー: `translateY(-6px)` + shadow
   - GSAP ScrollTrigger でスタガード表示

3. **その他セクション**
   - 現行トップページの各セクションを移植
   - レイアウトパターン 5 種以上を厳守
   - マーキー / パララックス等のスクロール連動演出

4. **ランタン WebGL 用プレースホルダー配置**

### About ページ（`app/about/page.tsx`）

1. **墨流し WebGL 用プレースホルダー配置**
2. **プロフィールセクション** — 現行内容移植（個人情報は含めない）
3. **Tech Stack セクション** — 使用技術をグリッド or リスト表示（Next.js / TypeScript / Three.js / GSAP / Tailwind CSS / WordPress 等）
4. **経歴・スキルセクション** — 現行内容移植
5. **タイポグラフィの緩急** — セクション見出しは極端に大きく

### Service ページ（`app/service/page.tsx`）

1. 現行の提供サービス情報を移植
2. サービスカード: ホバーアニメーション付き
3. FAQ セクション（JSON-LD 構造化データ付き — Phase 6 で JSON-LD 実装、ここでは HTML 構造のみ）

### 全ページ共通
- レスポンシブ対応（PC + SP）
- GSAP ScrollTrigger による各セクションの表示アニメーション
- `next/image` で全画像を最適化
- メタデータ設定（`generateMetadata`）

### 完了条件
- 3 ページとも PC / SP で正常表示
- WebGL プレースホルダーが所定の位置に配置されている
- ScrollTrigger アニメーションが動作
- Pick Up Works の 6 作品が表示される
- 完了報告テンプレートを出力

---

## Phase 4 — Works + Finder 統合

### Works 一覧ページ（`app/works/page.tsx`）

1. **フィルタ UI**（`components/works/WorksFilter.tsx` — `"use client"`）
   - カテゴリフィルタ（タグ形式 or ドロップダウン）
   - 技術フィルタ（タグ形式 or ドロップダウン）
   - アクティブフィルタの視覚表示
   - フィルタリセットボタン
   - **カラー:** ポートフォリオのモノトーン基調に統一（白ベースではない）
   - Framer Motion で `AnimatePresence` フィルタ切替アニメーション

2. **作品グリッド**（`components/works/WorksGrid.tsx`）
   - フィルタ結果を反映したグリッド表示
   - Framer Motion `layoutId` でフィルタ切替時のスムーズな並び替え
   - 作品数表示

3. **作品カード**（`components/works/WorkCard.tsx`）
   - サムネイル（カラー）+ タイトル + カテゴリタグ + 技術タグ
   - ホバー: `translateY(-6px)` + `scale(1.06)` on image
   - `/works/[slug]` へのリンク

4. **Tier 別セクション or 表示**
   - Tier S / A / B の区分が視覚的に認識できる表示
   - ただし過度な分離ではなく、フィルタと共存する形

### Works 詳細ページ（`app/works/[slug]/page.tsx`）

1. `generateStaticParams` で全 21 作品の静的ページを事前生成
2. `generateMetadata` で作品ごとのメタデータ
3. **表示内容:**
   - 作品タイトル（大きく）
   - スクリーンショットギャラリー（複数枚、ライトボックス or スワイプ）
   - 使用技術タグ
   - 制作意図・概要テキスト
   - ライブ URL リンク（外部リンク）
   - 前後の作品へのナビゲーション
4. **レイアウト:** 画像を贅沢に使い、モノトーン基調

### 完了条件
- フィルタが正常に動作（カテゴリ / 技術 / 複合 / リセット）
- 全 21 作品が一覧に表示される
- 各作品の詳細ページが `/works/[slug]` で表示される
- フィルタ切替アニメーションが動作
- PC / SP レスポンシブ対応
- 完了報告テンプレートを出力

---

## Phase 5 — WebGL / 3D アニメーション移植

### 前提
- 現行サイトのシェーダーコード・Three.js コードを `public/shaders/` および各コンポーネントに移植
- 全て `"use client"` + `next/dynamic` + `ssr: false`

### タスク

1. **Opening 3D テキストアニメーション**（`components/webgl/OpeningAnimation.tsx`）
   - Three.js + TextGeometry で「AKASHIKI — 灯敷」を 3D 表示
   - Anton フォント使用（英字部分）
   - ZZZ W-ENGINE 風の演出
   - typeface.js JSON ファイルの配置と読み込み
   - Phase 3 のプレースホルダーを置換

2. **ランタンアニメーション**（`components/webgl/LanternScene.tsx`）
   - 現行のカスタム GLSL シェーダーを移植
   - `public/shaders/` にシェーダーファイル配置
   - raw-loader（webpack config）で読み込み
   - Phase 3 のプレースホルダーを置換

3. **墨流し（インク流体シミュレーション）**（`components/webgl/InkFluidScene.tsx`）
   - 現行のカスタム GLSL シェーダーを移植
   - About ページの Phase 3 プレースホルダーを置換

4. **パフォーマンス最適化**
   - `requestAnimationFrame` の適切な cleanup（useEffect return）
   - canvas の resize ハンドリング
   - メモリリーク防止（dispose 処理）
   - IntersectionObserver でビューポート外ではレンダリング停止

5. **フォールバック**
   - WebGL 非対応ブラウザ / モバイル低スペック向けの静的フォールバック表示
   - `dynamic` の `loading` プロパティでローディング UI

### 完了条件
- 3 つの WebGL 演出が全て動作する
- Phase 3 のプレースホルダーが全て置換されている
- ブラウザコンソールにエラーなし
- SP でもクラッシュせず動作（低スペック時はフォールバック）
- `npm run build` が正常完了
- 完了報告テンプレートを出力

---

## Phase 6 — Contact API + SEO / AIO + 最終仕上げ

### Contact ページ（`app/contact/page.tsx`）

1. **ContactForm**（`components/contact/ContactForm.tsx` — `"use client"`）
   - フィールド: 氏名 / メールアドレス / お問い合わせ種別（セレクト）/ 本文
   - クライアントサイドバリデーション
   - 送信中 / 完了 / エラーの状態管理
   - Framer Motion で状態遷移アニメーション

2. **Route Handler**（`app/api/contact/route.ts`）
   - POST リクエスト受信
   - サーバーサイドバリデーション
   - Resend API でメール送信
   - 環境変数: `RESEND_API_KEY`, `CONTACT_EMAIL_TO`
   - レート制限（簡易実装）

3. `.env.local` テンプレート作成
   ```
   RESEND_API_KEY=your_api_key_here
   CONTACT_EMAIL_TO=your_email_here
   ```

### Privacy ページ（`app/privacy/page.tsx`）
- 現行のプライバシーポリシーを移植

### SEO / AIO 施策

1. **メタデータ最適化**
   - 全ページの `generateMetadata` を最終確認・調整
   - OGP 画像設定（`opengraph-image.tsx` or 静的画像）

2. **サイトマップ**（`app/sitemap.ts`）
   - 全ページ + 全 Works 詳細ページを含む

3. **robots.txt**（`app/robots.ts`）

4. **AIO 4 施策実装**
   - ① 結論ファースト: 各ページの構造を確認・調整
   - ② FAQ JSON-LD: Service ページに FAQPage スキーマ実装
   - ③ E-E-A-T: Organization スキーマ、見出し階層の確認
   - ④ llms.txt: `public/llms.txt` 作成（サイト概要・主要ページ・提供サービス）

5. **構造化データ**
   - Organization JSON-LD（layout.tsx）
   - FAQPage JSON-LD（Service ページ）
   - WebSite JSON-LD（トップページ）

### 最終仕上げ

1. **Lighthouse チェック**
   - Accessibility: 100 目標
   - SEO: 100 目標
   - Performance: WebGL のため 100 未満許容（現行方針）

2. **404 ページ**（`app/not-found.tsx`）
   - ブランドに合ったデザイン

3. **loading.tsx** — 必要なページに配置

4. **全ページ最終レスポンシブ確認**

### 完了条件
- Contact フォームが送信〜メール受信まで動作する（Resend API キー設定後）
- 全ページのメタデータが適切に設定されている
- sitemap.xml / robots.txt が生成される
- JSON-LD 構造化データが正しく出力される
- llms.txt が配置されている
- 404 ページが表示される
- `npm run build` が正常完了、TypeScript エラーなし
- 完了報告テンプレートを出力（最終版）
