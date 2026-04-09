import type { Metadata } from "next";
import { Barlow, Noto_Sans_JP, IBM_Plex_Mono, Anton } from "next/font/google";
import SmoothScroll from "@/components/animation/SmoothScroll";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import "./globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "AKASHIKI — Web Design & Development Portfolio",
    template: "%s",
  },
  description:
    "灯敷（AKASHIKI）— Webデザイン・コーディングのポートフォリオサイト。LP制作・WordPress構築を中心に、設計から実装までワンストップで対応します。",
  metadataBase: new URL("https://akashiki.com"),
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: "AKASHIKI — 灯敷",
    title: "AKASHIKI — Web Design & Development Portfolio",
    description:
      "Webデザイン・コーディングのポートフォリオ。LP制作・WordPress構築を中心に、設計から実装までワンストップで対応。",
    url: "https://akashiki.com",
  },
  twitter: {
    card: "summary_large_image",
    site: "@sumiyakaaa",
    creator: "@sumiyakaaa",
  },
  alternates: {
    canonical: "https://akashiki.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${barlow.variable} ${notoSansJP.variable} ${ibmPlexMono.variable} ${anton.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "AKASHIKI",
              alternateName: "灯敷",
              url: "https://akashiki.com",
              description:
                "Webデザイン・フロントエンド開発。LP制作・WordPress構築を中心に、設計から実装までワンストップで対応。",
              sameAs: [
                "https://x.com/sumiyakaaa",
                "https://github.com/sumiyakaa",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "customer service",
                url: "https://akashiki.com/contact",
                availableLanguage: ["Japanese"],
              },
            }),
          }}
        />
        <SmoothScroll>
          <Header />
          {children}
          <Footer />
        </SmoothScroll>
      </body>
    </html>
  );
}
