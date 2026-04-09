"use client";

import PageTransition from "@/components/animation/PageTransition";
import type { ReactNode } from "react";

export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
