/**
 * 重い WebGL / 演出をフル再生してよい端末かどうかの判定。
 *
 * タッチ主体の端末（スマホ・タブレット = pointer:coarse）、OSの「視差効果を減らす」
 * 設定（prefers-reduced-motion: reduce）、または狭い画面では true を返し、
 * 呼び出し側は軽量フォールバックへ切り替える。
 * マウス操作の PC（pointer:fine）のみ false（= フル演出）になる。
 *
 * 幅ではなく「ポインタ種別」で切るのが要点：iPad Pro のように幅が広くても
 * タッチ端末は GPU 負荷の高い演出をスキップして滑らかさを優先する。
 *
 * SSR 安全（window 不在時は false を返す）。
 */
export function prefersLightVisuals(): boolean {
  if (typeof window === "undefined") return false;
  const canMatch = typeof window.matchMedia === "function";
  const coarsePointer = canMatch && window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion =
    canMatch && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = window.innerWidth <= 768;
  return coarsePointer || reducedMotion || narrow;
}
