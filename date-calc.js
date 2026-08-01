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

/**
 * スライダーの端の値。現在値を必ず含む step の倍数を返す。
 *
 * 範囲を固定にすると、範囲外の日付を直接入力したときにつまみが端に張りついて
 * 実態とずれる。入力に合わせて広げることで、つまみの位置が常に意味を持つ。
 */
export function sliderBound(value, step = 365) {
  return Math.max(step, Math.ceil(Math.abs(value) / step) * step);
}

/** スライダーの脇に出す "+30日" 形式のラベル。 */
export function formatOffset(days) {
  return `${days >= 0 ? "+" : "-"}${Math.abs(days).toLocaleString("ja-JP")}日`;
}

/** 年月日の内訳を "1年2ヶ月3日" の形に整える。すべて 0 なら "0日"。 */
export function formatBreakdown({ years, months, days }) {
  const parts = [];
  if (years) parts.push(`${years}年`);
  if (months) parts.push(`${months}ヶ月`);
  if (days || !parts.length) parts.push(`${days}日`);
  return parts.join("");
}

// ---------------------------------------------------------------- 和暦

// 元号テーブルは持たない。ブラウザ内蔵の ICU が改元日まで含めて知っているので、
// そちらに任せる。timeZone を UTC に固定しないと、閲覧者のタイムゾーンによって
// 日付が 1 日ずれる。
const WAREKI_FORMAT = new Intl.DateTimeFormat("ja-JP-u-ca-japanese", {
  timeZone: "UTC",
  era: "long",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** 和暦。"令和8年8月1日" の形。1年は「元年」と表記する。 */
export function formatWareki(date) {
  const parts = Object.fromEntries(
    WAREKI_FORMAT.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const year = parts.year === "1" ? "元" : parts.year;
  return `${parts.era}${year}年${parts.month}月${parts.day}日`;
}

/** 元号だけ。"令和" など。 */
export function eraName(date) {
  return WAREKI_FORMAT.formatToParts(date).find((p) => p.type === "era")?.value ?? "";
}

// ---------------------------------------------------------------- 暦の属性

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

/** 十干十二支。西暦4年が甲子。60年周期。 */
export function sexagenary(year) {
  const index = (((year - 4) % 60) + 60) % 60;
  return {
    name: `${STEMS[index % 10]}${BRANCHES[index % 12]}`,
    branch: BRANCHES[index % 12],
  };
}

/** 年度。4月始まりなので 1〜3月は前年の年度に属する。 */
export function fiscalYear(date) {
  return date.getUTCMonth() + 1 >= 4 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
}

/** ISO 8601 の週番号。木曜日を含む週をその年の週とする。 */
export function isoWeek(date) {
  // 月曜を 0 とした曜日。そこからその週の木曜へ移動する。
  const dow = (date.getUTCDay() + 6) % 7;
  const thursday = addDays(date, 3 - dow);
  const year = thursday.getUTCFullYear();

  // 1月4日は必ず第1週に含まれる。その週の木曜を基準にする。
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const firstThursday = addDays(jan4, 3 - ((jan4.getUTCDay() + 6) % 7));

  return { year, week: Math.round(diffDays(firstThursday, thursday) / 7) + 1 };
}

/** 年内通算日。1月1日が 1。 */
export function dayOfYear(date) {
  return diffDays(new Date(Date.UTC(date.getUTCFullYear(), 0, 1)), date) + 1;
}

/** その年の日数。うるう年なら 366。 */
export function daysInYear(year) {
  return diffDays(new Date(Date.UTC(year, 0, 1)), new Date(Date.UTC(year + 1, 0, 1)));
}

/** その月の末日。 */
export function endOfMonth(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

// ---------------------------------------------------------------- 年齢

/**
 * 満年齢。一般的な数え方で、誕生日に加算する。
 *
 * 2月29日生まれの平年は、応当日が無いので 2月28日に加算する
 * （addMonths の月末丸めがそのまま民法143条2項の扱いに一致する）。
 */
export function age(birth, on) {
  let years = on.getUTCFullYear() - birth.getUTCFullYear();
  if (addMonths(birth, years * 12) > on) years -= 1;
  return years;
}

/**
 * n 歳になる日（法律上）。
 *
 * 年齢計算ニ関スル法律と民法143条により、年齢は応当日の「前日」の満了で加算する。
 * 4月1日生まれが早生まれになるのはこれが理由。ただし応当日が存在しない場合
 * （2月29日生まれの平年）は、前日ではなくその月の末日に満了する。
 */
export function legalBirthday(birth, years) {
  const target = addMonths(birth, years * 12);
  const exists = target.getUTCDate() === birth.getUTCDate();
  return exists ? addDays(target, -1) : target;
}

/** 法律上の年齢。満年齢より 1 日早く上がる。 */
export function legalAge(birth, on) {
  const base = age(birth, on);
  return legalBirthday(birth, base + 1) <= on ? base + 1 : base;
}

/** 数え年。生まれた時点で 1 歳、元日ごとに加算する。 */
export function kazoedoshi(birth, on) {
  return on.getUTCFullYear() - birth.getUTCFullYear() + 1;
}

/** 次の誕生日。基準日が誕生日当日ならその日を返さず、翌年を返す。 */
export function nextBirthday(birth, on) {
  return addMonths(birth, (age(birth, on) + 1) * 12);
}

/** 基準日が誕生日当日か。 */
export function isBirthday(birth, on) {
  return addMonths(birth, age(birth, on) * 12).getTime() === on.getTime();
}

// ---------------------------------------------------------------- 学年

/** 4月2日〜翌年4月1日生まれが同じ学年になる。その区切りの年を返す。 */
export function schoolCohortYear(birth) {
  const month = birth.getUTCMonth() + 1;
  const day = birth.getUTCDate();
  const startsThisYear = month > 4 || (month === 4 && day >= 2);
  return startsThisYear ? birth.getUTCFullYear() : birth.getUTCFullYear() - 1;
}

/** 早生まれ（1月1日〜4月1日生まれ）か。 */
export function isHayaumare(birth) {
  const month = birth.getUTCMonth() + 1;
  return month < 4 || (month === 4 && birth.getUTCDate() === 1);
}

const GRADE_NAMES = [
  "小学1年", "小学2年", "小学3年", "小学4年", "小学5年", "小学6年",
  "中学1年", "中学2年", "中学3年",
  "高校1年", "高校2年", "高校3年",
];

/** 基準日が属する年度における学年。小1〜高3の範囲外なら null。 */
export function schoolGrade(birth, on) {
  const grade = fiscalYear(on) - schoolCohortYear(birth) - 6;
  return grade >= 1 && grade <= GRADE_NAMES.length ? GRADE_NAMES[grade - 1] : null;
}
