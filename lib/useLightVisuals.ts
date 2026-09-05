"use client";

import { useSyncExternalStore } from "react";
import { prefersLightVisuals } from "./device";

const subscribe = () => () => {};
const getServerSnapshot = () => false;

/**
 * prefersLightVisuals() を React の状態として読む（hydration 安全）。
 * サーバーと最初の hydration では false、購読直後に実機の判定へ切り替わる。
 * useEffect 内で setState する書き方は react-hooks/set-state-in-effect に
 * 引っかかるので、useSyncExternalStore で同じ意味を lint-clean に実現する。
 */
export function useLightVisuals(): boolean {
  return useSyncExternalStore(subscribe, prefersLightVisuals, getServerSnapshot);
}
