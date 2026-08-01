// 日付計算の純粋関数。DOM に触れないので Node からも読み込んでテストできる。
// 日付はすべて UTC 0 時の Date として扱う。ローカル時刻のまま引き算すると、
// 夏時間のある地域で 1 日ずれることがあるため。

export const MS_PER_DAY = 86400000;
export const WEEKDAY_NAMES = ["日", "月", "火", "水", "木", "金", "土"];

/** "YYYY-MM-DD" を Date へ。不正な日付は null を返す。 */
export function parseDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d] = m.slice(0, 4).map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d));
  // 2026-02-31 のような存在しない日付は Date が繰り上げてしまうので弾く。
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

export function formatIso(date) {
  return date.toISOString().slice(0, 10);
}

export function formatJa(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return `${y}年${m}月${d}日(${WEEKDAY_NAMES[date.getUTCDay()]})`;
}

export function today(now = new Date()) {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function diffDays(from, to) {
  return Math.round((to - from) / MS_PER_DAY);
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/**
 * 月を加算する。加算先にその日が存在しない場合は月末に丸める。
 * 1月31日 + 1ヶ月 = 2月28日(平年)。
 */
export function addMonths(date, months) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)));
}

/**
 * from から to までを 年・月・日 に分解する。from <= to を前提とする。
 *
 * まず「開始日と同じ日に到達した回数」で月数を決め、残りを日数で数える。
 * 「日の引き算が負なら前月の日数を借りる」という素朴な方法だと、
 * 1月31日→3月1日 のように開始日が前月の長さを超えるケースで日数が負になる。
 *
 * 月数のカウントには丸めた日付ではなく日そのものを使う。addMonths の丸めで
 * 判定すると 1月28日/29日/30日/31日 → 2月28日 がすべて "1ヶ月" に潰れてしまう。
 */
export function breakdown(from, to) {
  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;

  return {
    years: Math.floor(months / 12),
    months: months % 12,
    days: diffDays(addMonths(from, months), to),
  };
}

/** 両端を含む区間の平日数。7 日周期のぶんは一括で数え、端数だけ走査する。 */
export function countWeekdays(from, to) {
  const total = diffDays(from, to) + 1;
  const weeks = Math.floor(total / 7);
  let count = weeks * 5;
  const startDow = from.getUTCDay();
  for (let i = 0; i < total - weeks * 7; i++) {
    const dow = (startDow + i) % 7;
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/** 年月日の内訳を "1年2ヶ月3日" の形に整える。すべて 0 なら "0日"。 */
export function formatBreakdown({ years, months, days }) {
  const parts = [];
  if (years) parts.push(`${years}年`);
  if (months) parts.push(`${months}ヶ月`);
  if (days || !parts.length) parts.push(`${days}日`);
  return parts.join("");
}
