/**
 * 墨塵（ぼくじん）— トップ FV の時間軸（秒）
 *
 * ステージ時計 t=0 ＝「題字の採点（DOM の文字矩形 → 粒の目標座標）が済み、
 * 粒の描画が始まった瞬間」。フォント読込を待つぶんだけ壁時計より遅れてよいが、
 * 一度走り出したら以下の時刻で必ず進む（画面外・背面タブでは時計ごと止まる）。
 *
 *   0        散らばって漂う（バラバラ）… 描画は fadeIn 秒かけて現れる
 *   gatherStart  書き順の掃引が始まる（ひとりでに）… 先頭の文字から順に粒が流れ込む
 *   gatherStart + gatherDur × (i+1)/n + letterLag
 *            i 番目の DOM 文字が letterFade 秒かけて現れる（粒の上に定着＝仕組み）
 *   settle   灯が一点ともる・他要素（肩書き／サブ／宣言／隅）の入場が始まる
 *   settle + settleDim  粒が縁だけ残して減光し切る（以後は呼吸）
 *
 * 末尾の文字が読める時刻 = gatherStart + gatherDur + letterLag + letterFade ≒ 1.53s
 */
export const BOKUJIN_T = {
  fadeIn: 0.35,
  gatherStart: 0.4,
  gatherDur: 0.55,
  letterLag: 0.28,
  letterFade: 0.3,
  settle: 1.15,
  settleDim: 1.2,
  /** 何があっても DOM の題字を出す壁時計の上限（フォント遅延・WebGL 失敗の保険） */
  hardDeadline: 2.6,
} as const;

/** 軽量経路（タッチ・狭幅・reduced-motion）＝CSS 入場の刻み（Hero.module.css と同値） */
export const BOKUJIN_STILL = {
  letterDelay: 0.15,
  letterStagger: 0.03,
  letterDur: 0.55,
  /** 他要素の入場を始める時刻 */
  settle: 0.85,
} as const;
