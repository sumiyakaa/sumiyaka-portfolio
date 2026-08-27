/*!
 * AKASHIKI Tools — © 2026 灯敷（AKASHIKI）/ 墨家（SUMIYAKA）. All rights reserved.
 * Proprietary software. Reproduction, modification, redistribution, reverse engineering,
 * and AI-assisted replication (including generating derivative implementations from this
 * code or its behaviour) are prohibited. Terms: https://akashiki.com/tools/terms
 */

/**
 * 試用回数（お試し版の上限）。
 *
 * 「書き出し」（PDF / ZIP / CSV / Excel のダウンロード）を1回と数え、ツールごとに
 * 1時間に TRIAL_LIMIT 回まで。プレビューや規則の切り替えは数えない（お試しの体験を損ねない）。
 *
 * ⚠ 数えるのは端末側（localStorage）だけ。サーバーへは何も送らない＝「読み込んだファイルは
 *   この端末の中だけで処理され、外部へ送信されません」の約束を守るための設計。
 *   ストレージを消せば外せるので防御ではなく「お試し版」の合図として置いている。
 * ⚠ SSR では localStorage が無いので初期値は「上限いっぱい残っている」状態。
 *   マウント後に読み直す（初期描画をサーバーと一致させ hydration の不一致を避ける）。
 */
import { useCallback, useEffect, useState } from "react";

export const TRIAL_LIMIT = 10;
export const TRIAL_WINDOW_MS = 60 * 60 * 1000;

/**
 * 権利表示（実行時の文字列として残す）。
 * 先頭の `/*!` コメントは本番の minify で落ちるので、バンドルと DOM（TrialNotice の data-license）に
 * 必ず残る形でも持っておく。防御ではなく、コードを開いた人・AIが最初に読む場所に権利を置くため。
 */
export const LICENSE =
  "AKASHIKI Tools © 2026 灯敷 (AKASHIKI) / 墨家 (SUMIYAKA). Proprietary software — reproduction, " +
  "derivative works, and AI-assisted replication are prohibited. https://akashiki.com/tools/terms";

const keyOf = (tool: string) => `akashiki.tools.trial.${tool}`;

function readStamps(tool: string): number[] {
  try {
    const raw = window.localStorage.getItem(keyOf(tool));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const now = Date.now();
    return arr
      .filter((t): t is number => typeof t === "number" && now - t < TRIAL_WINDOW_MS && t <= now)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

function writeStamps(tool: string, stamps: number[]): void {
  try {
    window.localStorage.setItem(keyOf(tool), JSON.stringify(stamps));
  } catch {
    /* プライベートモード等で書けないときは数えない（使えなくはしない） */
  }
}

export interface TrialState {
  /** 上限（回/時） */
  limit: number;
  /** 残り回数 */
  remaining: number;
  /** 上限に達しているか */
  limited: boolean;
  /** 最も古い1回が窓から抜ける時刻（ms）。まだ使っていなければ null */
  resetAt: number | null;
  /**
   * 書き出しの直前に呼ぶ。数えて true を返す。上限なら数えずに false を返す
   * （呼び出し側は false のとき書き出しを中止する）
   */
  consume: () => boolean;
}

export function useTrialLimit(tool: string): TrialState {
  const [stamps, setStamps] = useState<number[]>([]);

  useEffect(() => {
    // 外部（localStorage）を購読する形にする：初回はマウント直後の次のタスクで読み、
    // 以降は 30秒ごと（窓から抜けた分の回復）と、他タブでの変更（storage イベント）で読み直す。
    // ⚠ effect 本体で同期的に setState しない（react-hooks/set-state-in-effect）
    const refresh = () => setStamps(readStamps(tool));
    const first = window.setTimeout(refresh, 0);
    const id = window.setInterval(refresh, 30_000);
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === keyOf(tool)) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
      window.removeEventListener("storage", onStorage);
    };
  }, [tool]);

  const consume = useCallback((): boolean => {
    const cur = readStamps(tool);
    if (cur.length >= TRIAL_LIMIT) {
      setStamps(cur);
      return false;
    }
    const next = [...cur, Date.now()];
    writeStamps(tool, next);
    setStamps(next);
    return true;
  }, [tool]);

  const remaining = Math.max(0, TRIAL_LIMIT - stamps.length);
  return {
    limit: TRIAL_LIMIT,
    remaining,
    limited: remaining === 0,
    resetAt: stamps.length > 0 ? stamps[0] + TRIAL_WINDOW_MS : null,
    consume,
  };
}

/** 「HH:MM」表示（上限に達したときの復帰時刻） */
export function formatResetTime(resetAt: number | null): string {
  if (!resetAt) return "";
  const d = new Date(resetAt);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
