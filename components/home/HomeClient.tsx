"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalRoot(document.body);
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
      {showOverlay && portalRoot &&
        createPortal(
          <OpeningAnimation onComplete={handleComplete} />,
          portalRoot
        )}
      <Hero openingDone={openingDone} />
      {children}
    </>
  );
}
