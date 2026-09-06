"use client";

import Hero from "./Hero";

/**
 * E↔F 結合契約（P3_SPEC）: prop なしの client コンポーネント。
 * page.tsx は <HomeIntro /> を置くだけでよい（呼び出し形は不変）。
 *
 * 2026-09-06 墨塵（ぼくじん）化：
 * 旧オープニング「一筆と灯」（OpeningLite・1.4s）は撤去した。
 * FV の粒が散らばった状態から集まって題字を書き上げること自体が開幕なので、
 * その前に別の幕を挟むと二重の前置きになる。openingDone は初期値 true。
 * Hero の props インターフェース { openingDone: boolean } は現行から変えない。
 */
export default function HomeIntro() {
  return <Hero openingDone />;
}
