/**
 * 請求書PDF一括作成ツール — 日本語フォントの遅延読み込み
 *
 * ⚠ このツールで唯一ネットワークへ出るのがこのファイル（設計計画書 §9-2）。
 *    取得するのは自サイトに置いた `/tools/fonts/NotoSansJP-Regular.ttf` だけで、
 *    利用者の台帳データは一切ここを通らない。
 *
 * 5.4MB あるので初回だけ数秒かかる。進捗を返せるようにストリームで読み、
 * 一度読んだらモジュールスコープに保持して二度目以降は即返す。
 * 同時に複数回呼ばれても fetch は 1 回だけになるよう Promise を共有する。
 */

/** 進捗コールバック。total が 0 のときは全体サイズ不明（Content-Length なし） */
export type FontProgress = (loaded: number, total: number) => void;

/** public/tools/fonts/ に置いた Noto Sans JP（OFL・Regular 1ウェイトのみ） */
export const JP_FONT_URL = "/tools/fonts/NotoSansJP-Regular.ttf";

let cachedBytes: Uint8Array | null = null;
let inflight: Promise<Uint8Array> | null = null;

/** 進捗の購読者。同時に呼ばれた全員へ配る */
const listeners = new Set<FontProgress>();

/** このモジュールが投げたと分かるようにする目印 */
const JP_FONT_ERROR = Symbol.for("invoice.jpFontError");

function fontError(message: string): Error {
  const err = new Error(message);
  (err as unknown as Record<symbol, boolean>)[JP_FONT_ERROR] = true;
  return err;
}

function toFontError(cause: unknown): Error {
  if (cause instanceof Error && (cause as unknown as Record<symbol, boolean>)[JP_FONT_ERROR]) {
    return cause;
  }
  const detail = cause instanceof Error ? cause.message : String(cause);
  return fontError(`日本語フォントの読み込みに失敗しました。${detail}`);
}

function notify(loaded: number, total: number): void {
  // 購読者側の例外で読み込み自体を落とさない
  for (const listener of Array.from(listeners)) {
    try {
      listener(loaded, total);
    } catch {
      /* 進捗表示の失敗は無視する */
    }
  }
}

/** sfnt（TrueType/OpenType）の署名かどうか。404 の HTML が返ってきた事故を弾く */
function looksLikeFontFile(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 4) return false;
  const tag = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return (
    tag === 0x00010000 || // TrueType
    tag === 0x74727565 || // 'true'
    tag === 0x4f54544f || // 'OTTO'
    tag === 0x74746366 || // 'ttcf'
    tag === 0x774f4646 || // 'wOFF'
    tag === 0x774f4632 //   'wOF2'
  );
}

function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

async function fetchFontBytes(): Promise<Uint8Array> {
  const fetchFn: typeof fetch | null =
    typeof globalThis !== "undefined" && typeof globalThis.fetch === "function"
      ? globalThis.fetch.bind(globalThis)
      : null;

  if (!fetchFn) {
    throw fontError(
      "この環境では日本語フォントを取得できません（fetch が使えません）。ブラウザで開き直してください。",
    );
  }

  let res: Response;
  try {
    res = await fetchFn(JP_FONT_URL, { cache: "force-cache" });
  } catch (cause) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    throw fontError(
      `日本語フォントを取得できませんでした。通信環境を確認して、もう一度お試しください。（${detail}）`,
    );
  }

  if (!res.ok) {
    throw fontError(
      `日本語フォントを取得できませんでした（HTTP ${res.status}）。ページを再読み込みしてお試しください。`,
    );
  }

  const header = res.headers?.get?.("content-length");
  const declared = header ? Number(header) : Number.NaN;
  const total = Number.isFinite(declared) && declared > 0 ? declared : 0;

  let bytes: Uint8Array;
  const body = res.body;

  if (body && typeof body.getReader === "function") {
    const reader = body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    notify(0, total);
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        chunks.push(value);
        loaded += value.byteLength;
        notify(loaded, total);
      }
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      throw fontError(`日本語フォントの読み込みが途中で止まりました。（${detail}）`);
    }
    bytes = concatChunks(chunks, loaded);
  } else {
    // ReadableStream が無い環境（古い Safari・一部の実行環境）向けのフォールバック
    const buffer = await res.arrayBuffer();
    bytes = new Uint8Array(buffer);
    notify(bytes.byteLength, total || bytes.byteLength);
  }

  if (!looksLikeFontFile(bytes)) {
    throw fontError(
      "日本語フォントの中身が不正です（別のファイルが返されたか、途中で壊れています）。ページを再読み込みしてお試しください。",
    );
  }

  notify(bytes.byteLength, bytes.byteLength);
  return bytes;
}

/**
 * 日本語フォント（Noto Sans JP Regular）のバイト列を返す。
 *
 * - 2 回目以降はキャッシュから即返す（fetch しない）
 * - 同時に複数回呼ばれても fetch は 1 回。全員が進捗を受け取れる
 * - 失敗時は日本語のメッセージを持つ Error を投げる
 */
export async function loadJpFont(onProgress?: FontProgress): Promise<Uint8Array> {
  if (cachedBytes) {
    if (onProgress) onProgress(cachedBytes.byteLength, cachedBytes.byteLength);
    return cachedBytes;
  }

  if (onProgress) listeners.add(onProgress);
  try {
    if (!inflight) {
      inflight = fetchFontBytes().then(
        (bytes) => {
          cachedBytes = bytes;
          inflight = null;
          return bytes;
        },
        (cause) => {
          inflight = null;
          throw toFontError(cause);
        },
      );
    }
    return await inflight;
  } finally {
    if (onProgress) listeners.delete(onProgress);
  }
}

/** すでに読み込み済みなら true（UI 側で「準備完了」を出すのに使う） */
export function isJpFontReady(): boolean {
  return cachedBytes !== null;
}

/**
 * テスト・Node 実行用。fs で読んだバイト列を差し込んでネットワークを迂回する。
 * 本番経路（ブラウザ）からは呼ばれない。
 */
export function __setFontBytesForTest(bytes: Uint8Array): void {
  cachedBytes = bytes;
  inflight = null;
}

/** テスト用。キャッシュを捨てて未読み込みの状態に戻す */
export function __clearFontCacheForTest(): void {
  cachedBytes = null;
  inflight = null;
  listeners.clear();
}
