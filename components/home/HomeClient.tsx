"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Hero from "./Hero";

const OpeningAnimation = dynamic(
  () => import("@/components/webgl/OpeningAnimation"),
  { ssr: false }
);

interface HomeClientProps {
  children: React.ReactNode;
}

export default function HomeClient({ children }: HomeClientProps) {
  const [openingDone, setOpeningDone] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  useEffect(() => {
    if (sessionStorage.getItem("akashiki-splash") === "done") {
      setOpeningDone(true);
      setShowOverlay(false);
    }
  }, []);

  const handleComplete = useCallback(() => {
    setOpeningDone(true);
    setTimeout(() => setShowOverlay(false), 200);
  }, []);

  return (
    <>
      {showOverlay && <OpeningAnimation onComplete={handleComplete} />}
      <Hero openingDone={openingDone} />
      {children}
    </>
  );
}
