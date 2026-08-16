"use client";

import { useCallback, useState } from "react";
import Hero from "./Hero";
import OpeningLite from "./OpeningLite";

/**
 * E↔F 結合契約（P3_SPEC）: prop なしの client コンポーネント。
 * 内部で OpeningLite → openingDone state → <Hero openingDone={...} /> を配線する。
 * Hero の props インターフェースは現行から変えない。
 * page.tsx（子CC-F）は <Hero openingDone /> を <HomeIntro /> に置き換えるだけでよい。
 */
export default function HomeIntro() {
  const [openingDone, setOpeningDone] = useState(false);

  const handleDone = useCallback(() => {
    setOpeningDone(true);
  }, []);

  return (
    <>
      <OpeningLite onDone={handleDone} />
      <Hero openingDone={openingDone} />
    </>
  );
}
