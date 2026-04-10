"use client";

import { useEffect, useState, useCallback, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLenis } from "@/components/animation/SmoothScroll";
import { useInkTransition } from "@/components/animation/InkTransition";
import styles from "./Header.module.css";

const NAV_LINKS = [
  { href: "/", label: "HOME" },
  { href: "/about", label: "ABOUT" },
  { href: "/service", label: "SERVICE" },
  { href: "/works", label: "WORKS" },
  { href: "/contact", label: "CONTACT" },
] as const;

export default function Header() {
  const pathname = usePathname();
  const lenis = useLenis();
  const { navigate } = useInkTransition();

  const handleNav = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, href: string) => {
      if (href === pathname) return;
      e.preventDefault();
      navigate(href, { x: e.clientX, y: e.clientY });
    },
    [navigate, pathname],
  );
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isHome = pathname === "/";

  // Smart Header: ヒステリシスバッファ付きスクロール検知（旧common.js移植）
  useEffect(() => {
    const BUFFER = 50;
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        // トップ: 100vh / サブページ: data-fv要素の高さ（縮小後は50vh）
        const threshold = isHome
          ? window.innerHeight
          : (() => {
              const fv = document.querySelector<HTMLElement>("[data-fv]");
              return fv ? fv.offsetTop + fv.offsetHeight : window.innerHeight;
            })();

        if (!isVisible && currentY > threshold + BUFFER) {
          setIsVisible(true);
        } else if (isVisible && currentY < threshold - BUFFER) {
          setIsVisible(false);
        }

        ticking = false;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHome, isVisible]);

  // メニュー開閉時の body ロック
  useEffect(() => {
    if (isMenuOpen) {
      document.body.classList.add("is-locked");
      lenis?.stop();
    } else {
      document.body.classList.remove("is-locked");
      lenis?.start();
    }
  }, [isMenuOpen, lenis]);

  // ページ遷移時にメニューを閉じる
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  return (
    <>
      <header
        className={`${styles.header} ${isVisible ? styles.visible : styles.hidden}`}
      >
        <Link href="/" className={styles.logo} onClick={(e) => handleNav(e, "/")}>
          AKASHIKI
        </Link>

        <nav className={styles.nav} aria-label="メインナビゲーション">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navLink} ${pathname === href ? styles.active : ""}`}
              onClick={(e) => handleNav(e, href)}
            >
              {label}
            </Link>
          ))}
        </nav>

        <button
          className={`${styles.burger} ${isMenuOpen ? styles.burgerOpen : ""}`}
          onClick={toggleMenu}
          aria-label={isMenuOpen ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={isMenuOpen}
        >
          <span className={styles.burgerLine} />
          <span className={styles.burgerLine} />
          <span className={styles.burgerLine} />
        </button>
      </header>

      {/* SP フルスクリーンメニュー */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.nav
            className={styles.spMenu}
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            aria-label="モバイルナビゲーション"
          >
            {NAV_LINKS.map(({ href, label }, i) => (
              <motion.div
                key={href}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{
                  delay: 0.15 + i * 0.06,
                  duration: 0.4,
                  ease: [0.16, 1, 0.3, 1],
                }}
              >
                <Link
                  href={href}
                  className={`${styles.spMenuLink} ${pathname === href ? styles.active : ""}`}
                  onClick={(e) => { setIsMenuOpen(false); handleNav(e, href); }}
                >
                  {label}
                </Link>
              </motion.div>
            ))}
            <div className={styles.spMenuLogo}>AKASHIKI</div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
