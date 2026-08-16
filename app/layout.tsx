import type { Metadata, Viewport } from "next";
import {
  Barlow,
  Noto_Sans_JP,
  IBM_Plex_Mono,
  Anton,
  Shippori_Mincho,
  Zen_Kaku_Gothic_New,
} from "next/font/google";
import SmoothScroll from "@/components/animation/SmoothScroll";
import InkTransitionProvider from "@/components/animation/InkTransition";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RouteTheme from "@/components/layout/RouteTheme";
import { SITE_ORIGIN } from "@/lib/site";
import "./globals.css";
import "./theme-washi.css";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "600", "800"],
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700"],
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// washi テーマ（トップページ）用フォント。既存4フォントはサブページが使用中のため残す。
const shipporiMincho = Shippori_Mincho({
  variable: "--font-shippori-mincho",
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  display: "swap",
});

const zenKakuGothicNew = Zen_Kaku_Gothic_New({
  variable: "--font-zen-kaku",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "墨家 / SUMIYAKA — バラバラな事務作業を、ひとりでに回る仕組みに変えます。",
    template: "%s",
  },
  description:
    "バラバラな事務作業を、ひとりでに回る仕組みに変えます。業務の自動化・ツール開発、Web制作、AI導入の設計・教育。設計から実装・公開まで、すべて一人で対応します。灯敷（AKASHIKI）／墨家。",
  // og:image 等の相対URLの解決基準。実際に到達できるオリジンでないとOGカードが取得されない。
  // canonical / sitemap は akashiki.com のまま（ブランドの本命ドメイン）。
  metadataBase: new URL(SITE_ORIGIN),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "墨家 / SUMIYAKA — 灯敷（AKASHIKI）",
    title: "墨家 / SUMIYAKA — バラバラな事務作業を、ひとりでに回る仕組みに変えます。",
    description:
      "バラバラな事務作業を、ひとりでに回る仕組みに変えます。業務の自動化・ツール開発、Web制作、AI導入の設計・教育。設計から実装・公開まで、すべて一人で対応します。",
    // canonical と同様、"./" でページ自身のURLに解決させる。
    url: "./",
    images: [
      {
        // OG画像は /api/og が日本語フォント未搭載（Satoriデフォルトのみ）のため英字を維持
        url: "/api/og?title=AKASHIKI&sub=Web+Design+%26+Development+Portfolio",
        width: 1200,
        height: 630,
        alt: "墨家 / SUMIYAKA — 灯敷（AKASHIKI）",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@sumiyakastudio",
    creator: "@sumiyakastudio",
  },
  alternates: {
    // "./" は metadataBase を基準に「そのページ自身のURL」へ解決される。
    // 固定URLを書くと全ページがトップの重複として扱われ、下層がインデックスされない。
    canonical: "./",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
  modal,
}: Readonly<{
  children: React.ReactNode;
  modal: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${barlow.variable} ${notoSansJP.variable} ${ibmPlexMono.variable} ${anton.variable} ${shipporiMincho.variable} ${zenKakuGothicNew.variable}`}
      // pre-hydration script が html へ data-theme を付与するため、
      // その属性差分の警告のみ抑止（html 要素1階層に限定）。
      suppressHydrationWarning
    >
      <body>
        {/* pre-hydration テーマ判定 — トップ（/）のみ washi を初期描画前に付与
            （同期インラインscript＝後続DOMのペイント前に実行され、フラッシュを防ぐ） */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{if(location.pathname==="/"){document.documentElement.dataset.theme="washi"}}catch(e){}})()',
          }}
        />
        <RouteTheme />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "灯敷（AKASHIKI）",
              alternateName: "墨家 / SUMIYAKA",
              url: "https://akashiki.com",
              description:
                "業務効率化の設計と実装。業務の自動化・ツール開発、Web制作、AI導入の設計・教育を、設計から実装・公開まで一人で一貫して提供。",
              sameAs: ["https://github.com/sumiyakastudio"],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                url: "https://akashiki.com/contact",
                availableLanguage: ["Japanese"],
              },
            }),
          }}
        />
        <InkTransitionProvider>
          <SmoothScroll>
            <Header />
            {children}
            {modal}
            <Footer />
          </SmoothScroll>
        </InkTransitionProvider>
      </body>
    </html>
  );
}
