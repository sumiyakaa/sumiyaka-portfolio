/**
 * 実際に配信されている本番オリジン。
 *
 * ブランドの本命ドメインは akashiki.com だが、まだ取得・DNS設定をしていないため
 * 名前解決できない。OGカードの画像は SNS 側のスクレイパーが実際に取得しにくるので、
 * ここが到達不能だとカードが出ない。そのため「実際に配信されているURL」を使う。
 *
 * akashiki.com を取得して Vercel に紐付ければ VERCEL_PROJECT_PRODUCTION_URL が
 * そのドメインになるため、コード変更なしで自動的に切り替わる。
 * 明示的に上書きしたい場合は NEXT_PUBLIC_SITE_URL を設定する。
 */
export const SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://akashiki.com");
