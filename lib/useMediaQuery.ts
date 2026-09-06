"use client";

import { useCallback, useSyncExternalStore } from "react";

const getServerSnapshot = () => false;

/**
 * メディアクエリの一致を React の状態として読む（hydration 安全・lint-clean）。
 *
 * サーバーと最初の hydration では常に false を返し、その直後にブラウザの実値へ
 * 切り替わる。以後は change イベントで追従するので、リサイズで境界をまたいでも
 * 正しく更新される。useEffect 内で同期 setState する書き方（react-hooks/
 * set-state-in-effect に引っかかる）の置き換えとして使う。
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return () => {};
      }
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
