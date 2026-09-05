"use client";

import { useCallback, useSyncExternalStore, type RefObject } from "react";
import { FV_PHASE_EVENT, type FVPhase } from "./contract";

const getServerSnapshot = (): FVPhase => "idle";

/**
 * 最寄りの section[data-fv] の位相（idle→enter→shrink→settled）を購読する。
 * ref は FV の内側にある任意の要素でよい（closest("[data-fv]") で親を探す）。
 * マウント時点で既に位相が進んでいれば、その値から始まる。
 *
 * 実装メモ：useEffect + setState だと react-hooks/set-state-in-effect に
 * 引っかかるため useSyncExternalStore にしている。初回レンダーでは ref が
 * 未接続なので "idle"、購読直後に React が snapshot を再評価して追いつく。
 */
export function useFVPhase(ref: RefObject<HTMLElement | null>): FVPhase {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const host = ref.current?.closest<HTMLElement>("[data-fv]") ?? null;
      if (!host) return () => {};
      host.addEventListener(FV_PHASE_EVENT, onChange);
      return () => host.removeEventListener(FV_PHASE_EVENT, onChange);
    },
    [ref]
  );

  const getSnapshot = useCallback((): FVPhase => {
    const host = ref.current?.closest<HTMLElement>("[data-fv]") ?? null;
    const v = host?.getAttribute("data-fv-phase") as FVPhase | null;
    return v ?? "idle";
  }, [ref]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
