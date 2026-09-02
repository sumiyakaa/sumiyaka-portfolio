import { gsap } from "gsap";

/**
 * サムネイルのホバースクロール（画像が縦に流れる演出）の共通定義。
 *
 * 【設計の要点】固定するのは「速度」であって「所要時間」ではない。
 * サムネは全て縦長のフルスクショで、縦横比が作品ごとに 2.8〜21 と 7.6倍も違う。
 * 所要時間を固定すると、縦に長い作品ほど猛烈に速く流れてしまう（実測で最大9.5倍のばらつき）。
 * そこで所要時間は「移動距離 ÷ 速度」で毎回計算する。
 * 一周にかかる時間は作品ごとに約8.7〜77秒とばらつくが、それは意図どおり。
 *
 * 【新規作品を追加するとき】やることは無い。画像を置くだけで同じ速度になる。
 * 縦横比はブラウザが読んだ実寸から求めるので、works.ts に速度用のフィールドは不要。
 */

/**
 * 巡航速度。単位＝「サムネ枠の高さ何個ぶんを1秒で流すか」。
 * 枠幅に依存しないので、Worksページとトップで枠の大きさが違っても体感速度は揃う。
 * 基準は aoki-atelier の旧実装（8秒固定）の実測平均＝0.43。
 * それでは遅すぎたため、2026-08-13 に 2倍の 0.86 へ引き上げた（あおき指示。0.73＝1.7倍を経由）。
 *
 * ★速度を変えたいときは、この数値だけを触ること。
 */
export const CRUISE_SPEED = 0.86;

/**
 * 立ち上がり（加速）と最後の減速にかける時間。
 * ★秒で固定すること。画像の長さに比例させると巡航速度がずれて統一が崩れる。
 */
export const RAMP_IN = 0.6;
export const RAMP_OUT = 0.9;

/** ホバーを外したときに先頭へ戻る時間 */
export const RETURN_DURATION = 0.5;

/**
 * サムネ枠の縦横比（高さ ÷ 幅）。CSS の `aspect-ratio: 16 / 10` と一致させること。
 * 枠の比を変えるときはここも直す。
 */
export const FRAME_RATIO = 10 / 16;

/**
 * 動かせる距離を「枠の高さ何個ぶん」で返す。
 *
 * object-fit: cover なので、画像は枠幅にあわせて拡大され、はみ出した縦方向が
 * object-position で移動できる量になる。
 *
 * @param hoverScale ホバー時に画像へ掛かる transform: scale の倍率。
 *   拡大されるぶん画面上の移動量も増えるので、そのぶん時間を伸ばして実速度を揃える。
 */
export function measureTravel(
  naturalWidth: number,
  naturalHeight: number,
  hoverScale = 1,
): number {
  if (!naturalWidth || !naturalHeight) return 0;
  const imageHeightInFrames = naturalHeight / naturalWidth / FRAME_RATIO;
  return (imageHeightInFrames - 1) * hoverScale;
}

/**
 * CSSアニメ版の縦流しで、頭と末尾に置く「溜め」の長さ。
 *
 * ★秒で固定すること。**割合で固定してはいけない。**
 * 2026-09-02 まではキーフレーム側に 6%／94% と割合で書いていたため、一周の長い
 * （＝画像が縦に長い）作品ほど溜めも比例して伸びていた。実測 2026-09-03＝
 * AOKI BEAUTY CLINIC NO2（縦横比 21:1・一周43.3秒）で溜めが **2.60秒**あり、
 * 「この札だけホバーしても流れない」という指摘になった（他の5枚は0.58〜1.27秒）。
 * 秒で固定したので、どの札もホバーから 0.4秒で動き出す。巡航速度は不変。
 *
 * ⚠ 溜めの割合が札ごとに変わる＝キーフレームを札ごとに作る必要がある。
 *   PickUpWorks.tsx の writePanKeyframes() が `measurePan()` の hold から差し込む。
 */
export const PAN_HOLD_SEC = 0.4;

/**
 * CSSアニメ版の縦流しに必要な値のセット。
 *
 * 【なぜ objectPosition ではないのか】
 * createHoverScroll() は objectPosition を毎フレーム書き換える rAF（gsap）で、
 * そのたびに再ペイントが走る。トップの実績枠は 6 枚が同時に存在するため、
 * ここだけ「画像の箱を実寸の高さへ開き、transform: translateY() で送る」CSSアニメへ
 * 置き換えた（合成だけで済み、rAF が1本減る）。
 * 速度の定義（CRUISE_SPEED＝枠の高さ何個ぶんを1秒で流すか）は共通なので、
 * 枠の大小にかかわらず体感速度は Works ページのカードと揃う。
 *
 * ⚠ createHoverScroll / measureTravel / CRUISE_SPEED / RETURN_DURATION は
 *   components/works/WorkCard.tsx が使い続けている。既存APIは変更しないこと。
 */
export interface PanSpec {
  /** 動かせる距離。単位＝枠の高さ何個ぶん（measureTravel と同じ） */
  frames: number;
  /** 画像の箱の高さ倍率（枠の高さの何倍にするか）＝ 1 + frames */
  span: number;
  /** 箱自身の高さに対する送り量の割合（translateY(-shift * 100%) で使う） */
  shift: number;
  /** 片道の所要秒数＝走行時間（frames ÷ CRUISE_SPEED）＋ 頭と末尾の溜め（PAN_HOLD_SEC × 2） */
  duration: number;
  /**
   * duration に対する溜めの割合（0〜0.5）。キーフレームの
   * `0%, hold%` と `(100-hold)%, 100%` に入れる。札ごとに変わる。
   */
  hold: number;
}

/**
 * 画像の実寸から、CSSアニメ版の縦流しに渡す値を求める。
 * 動かす余地が無い（＝ほぼ 16:10）画像では null を返す。
 */
export function measurePan(
  naturalWidth: number,
  naturalHeight: number,
): PanSpec | null {
  const frames = measureTravel(naturalWidth, naturalHeight, 1);
  if (!(frames > 0.06)) return null;
  const span = 1 + frames;
  // 走行時間は速度で決まる（作品ごとに変わる）。溜めは前後とも固定秒。
  const duration = frames / CRUISE_SPEED + PAN_HOLD_SEC * 2;
  return {
    frames,
    span,
    shift: frames / span,
    duration,
    hold: PAN_HOLD_SEC / duration,
  };
}

export interface HoverScroll {
  /** ホバー開始。加速 → 等速 → 減速して最下部で停止する */
  start: (img: HTMLImageElement) => void;
  /** ホバー終了。先頭へ戻す */
  stop: () => void;
  /** アンマウント時などに全て破棄する */
  kill: () => void;
}

/**
 * ホバースクロールを1つ組み立てる。対象の img は start() の引数で受け取る
 * （生成時に ref を閉じ込めると、描画中に ref を読む形になり React の規約に反する）。
 *
 * 速度の形は「0.6秒で巡航速度まで加速 → ずっと等速 → 0.9秒で減速して最下部にぴたり停止」。
 * power1.in / power1.out はそれぞれ二次関数なので、境界での速度が巡航速度と一致し、
 * 継ぎ目で速度が飛ばない（in の終端速度 = 2×距離÷時間 = 巡航速度、out の始端も同じ）。
 */
export function createHoverScroll(hoverScale = 1): HoverScroll {
  const state = { pct: 0 };
  let tween: gsap.core.Timeline | gsap.core.Tween | null = null;
  let target: HTMLImageElement | null = null;
  /** ホバー中かどうか。読み込み待ちから復帰したときに、まだホバー中かを判定する */
  let hovering = false;

  const apply = () => {
    if (target) target.style.objectPosition = `50% ${state.pct}%`;
  };

  const start = (img: HTMLImageElement) => {
    target = img;
    hovering = true;

    // 画面に入った直後などで実寸がまだ取れていない場合は、読み込み完了を待って開始する
    if (!img.naturalWidth || !img.naturalHeight) {
      img.addEventListener(
        "load",
        () => {
          if (hovering && target === img) start(img);
        },
        { once: true },
      );
      return;
    }

    const travel = measureTravel(img.naturalWidth, img.naturalHeight, hoverScale);
    if (travel <= 0.01) return;

    // 加速・減速の各区間で進む距離は「巡航速度 × 時間 ÷ 2」。
    // 移動量が極端に小さい場合に備えて、合計が全体を超えないよう頭打ちにする。
    const inFrac = Math.min(0.5, (CRUISE_SPEED * RAMP_IN) / 2 / travel);
    const outFrac = Math.min(0.5, (CRUISE_SPEED * RAMP_OUT) / 2 / travel);
    const cruiseFrac = Math.max(0, 1 - inFrac - outFrac);
    const cruiseDuration = (cruiseFrac * travel) / CRUISE_SPEED;

    tween?.kill();
    const tl = gsap.timeline({ onUpdate: apply });
    tl.to(state, { pct: inFrac * 100, duration: RAMP_IN, ease: "power1.in" });
    if (cruiseDuration > 0) {
      tl.to(state, {
        pct: (inFrac + cruiseFrac) * 100,
        duration: cruiseDuration,
        ease: "none",
      });
    }
    tl.to(state, { pct: 100, duration: RAMP_OUT, ease: "power1.out" });
    tween = tl;
  };

  const stop = () => {
    hovering = false;
    tween?.kill();
    if (!target) {
      state.pct = 0;
      tween = null;
      return;
    }
    tween = gsap.to(state, {
      pct: 0,
      duration: RETURN_DURATION,
      ease: "power2.out",
      onUpdate: apply,
    });
  };

  const kill = () => {
    hovering = false;
    tween?.kill();
    tween = null;
    target = null;
    state.pct = 0;
  };

  return { start, stop, kill };
}
