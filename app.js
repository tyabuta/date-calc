import {
  DATE_STYLES,
  addDays,
  age,
  breakdown,
  countWeekdays,
  dayOfYear,
  daysInYear,
  diffDays,
  endOfMonth,
  fiscalYear,
  formatBreakdown,
  formatDate,
  formatIso,
  formatOffset,
  formatWareki,
  isBirthday,
  isHayaumare,
  isoWeek,
  kazoedoshi,
  legalAge,
  nextBirthday,
  parseDate,
  schoolGrade,
  sexagenary,
  sliderBound,
  today,
} from "./date-calc.js";

const el = (id) => document.getElementById(id);
const ja = (n) => n.toLocaleString("ja-JP");

const STYLE_KEY = "date-calc:style";

// localStorage はプライベートモードや設定次第で例外を投げる。表示形式は
// 保存できなくても動くべきものなので、失敗しても既定値で続行する。
function loadStyle() {
  try {
    const saved = localStorage.getItem(STYLE_KEY);
    if (DATE_STYLES.includes(saved)) return saved;
  } catch {
    /* 読めなければ既定値 */
  }
  return DATE_STYLES[0];
}

function saveStyle(style) {
  try {
    localStorage.setItem(STYLE_KEY, style);
  } catch {
    /* 保存できなくても表示には影響しない */
  }
}

let dateStyle = loadStyle();

/** 画面に出す日付は必ずこれを通す。表示形式の切り替えを一箇所で効かせるため。 */
const fmt = (date) => formatDate(date, dateStyle);

function rows(pairs) {
  return pairs
    .map(
      ([label, value]) =>
        `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`,
    )
    .join("");
}

function renderDiff() {
  const out = el("diff-result");
  const from = parseDate(el("diff-from").value);
  const to = parseDate(el("diff-to").value);

  if (!from || !to) {
    out.className = "result empty";
    out.textContent = "2つの日付を入力してください";
    return;
  }

  const signed = diffDays(from, to);
  // 内訳と平日数は向きに依存しないよう、早い方を起点に計算する。
  const [early, late] = signed < 0 ? [to, from] : [from, to];
  const span = Math.abs(signed);

  out.className = "result";
  out.innerHTML =
    `<div class="headline">${ja(span)}<small>日</small></div>` +
    rows([
      ["向き", signed === 0 ? "同じ日" : signed > 0 ? "終了日が後" : "終了日が前"],
      ["年月日の内訳", formatBreakdown(breakdown(early, late))],
      ["週数", `${ja(Math.floor(span / 7))}週 と ${span % 7}日`],
      ["両端を含む日数", `${ja(span + 1)}日`],
      ["平日のみ(両端含む)", `${ja(countWeekdays(early, late))}日`],
      ["開始日", fmt(from)],
      ["終了日", fmt(to)],
    ]);
}

function renderAdd() {
  const out = el("add-result");
  const base = parseDate(el("add-base").value);
  const raw = el("add-days").value;
  const dir = Number(el("add-dir").value);

  if (!base || raw === "" || !Number.isFinite(Number(raw))) {
    out.className = "result empty";
    out.textContent = "基準日と日数を入力してください";
    return;
  }

  // 符号は「向き」だけで決める。入力欄に負数が入っても二重に反転させない。
  const amount = Math.abs(Math.trunc(Number(raw)));
  const result = addDays(base, amount * dir);

  out.className = "result";
  out.innerHTML =
    `<div class="headline">${fmt(result)}</div>` +
    rows([
      ["基準日", fmt(base)],
      ["計算", `${ja(amount)}日${dir > 0 ? "後" : "前"}`],
      ["ISO 形式", formatIso(result)],
    ]);
}

function renderInfo() {
  const out = el("info-result");
  const date = parseDate(el("info-date").value);

  if (!date) {
    out.className = "result empty";
    out.textContent = "日付を入力してください";
    return;
  }

  const year = date.getUTCFullYear();
  const { week, year: weekYear } = isoWeek(date);
  const eto = sexagenary(year);
  const last = endOfMonth(date);
  const doy = dayOfYear(date);

  out.className = "result";
  out.innerHTML =
    `<div class="headline">${formatWareki(date)}</div>` +
    rows([
      ["西暦", fmt(date)],
      ["干支", `${eto.name}（${eto.branch}年）`],
      ["年度", `${fiscalYear(date)}年度`],
      ["週番号", `${weekYear}年 第${week}週（ISO 8601）`],
      ["年内通算", `${ja(doy)}日目 / ${ja(daysInYear(year))}日`],
      ["月末", `${fmt(last)}（あと${ja(diffDays(date, last))}日）`],
    ]);
}

function renderAge() {
  const out = el("age-result");
  const birth = parseDate(el("age-birth").value);
  const on = parseDate(el("age-on").value);

  if (!birth || !on) {
    out.className = "result empty";
    out.textContent = "生年月日と基準日を入力してください";
    return;
  }
  if (birth > on) {
    out.className = "result empty";
    out.textContent = "基準日が生年月日より前です";
    return;
  }

  const years = age(birth, on);
  const legal = legalAge(birth, on);
  const next = nextBirthday(birth, on);
  const grade = schoolGrade(birth, on);

  const pairs = [
    ["法律上の年齢", `${ja(legal)}歳${legal === years ? "" : "（誕生日の前日に加算）"}`],
    ["数え年", `${ja(kazoedoshi(birth, on))}歳`],
    [
      "次の誕生日",
      isBirthday(birth, on)
        ? "今日が誕生日"
        : `${fmt(next)}（あと${ja(diffDays(on, next))}日）`,
    ],
    ["生まれてから", `${ja(diffDays(birth, on))}日`],
    ["早生まれ", isHayaumare(birth) ? "はい（1月1日〜4月1日生まれ）" : "いいえ"],
  ];
  if (grade) pairs.push(["学年", `${fiscalYear(on)}年度は ${grade}`]);
  pairs.push(["生年月日", `${fmt(birth)} / ${formatWareki(birth)}`]);

  out.className = "result";
  out.innerHTML = `<div class="headline">${ja(years)}<small>歳</small></div>` + rows(pairs);
}

/**
 * 日付入力の実態にスライダーを合わせる。範囲も引き直すので、
 * つまみを動かしている最中に呼んではいけない（値が飛ぶ）。
 */
function syncDiffSlider() {
  const from = parseDate(el("diff-from").value);
  const to = parseDate(el("diff-to").value);
  const slider = el("diff-slider");

  if (!from || !to) {
    slider.disabled = true;
    el("diff-offset").textContent = "";
    return;
  }

  const offset = diffDays(from, to);
  const bound = sliderBound(offset);
  slider.disabled = false;
  slider.min = -bound;
  slider.max = bound;
  slider.value = offset;
  el("diff-offset").textContent = formatOffset(offset);
}

function onDiffSlider() {
  const from = parseDate(el("diff-from").value);
  if (!from) return;
  const offset = Number(el("diff-slider").value);
  el("diff-to").value = formatIso(addDays(from, offset));
  el("diff-offset").textContent = formatOffset(offset);
  renderDiff();
}

function syncAddSlider() {
  const amount = Math.abs(Math.trunc(Number(el("add-days").value) || 0));
  const slider = el("add-slider");
  slider.max = sliderBound(amount);
  slider.value = amount;
  el("add-amount").textContent = `${ja(amount)}日`;
}

function onAddSlider() {
  const amount = Number(el("add-slider").value);
  el("add-days").value = amount;
  el("add-amount").textContent = `${ja(amount)}日`;
  renderAdd();
}

function renderAll() {
  renderDiff();
  renderAdd();
  renderInfo();
  renderAge();
}

function setToday(input) {
  input.value = formatIso(today());
  // 値の代入では input イベントが飛ばないので、通常の入力と同じ経路を通す。
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function init() {
  const now = today();
  el("diff-from").value = formatIso(now);
  el("diff-to").value = formatIso(addDays(now, 30));
  el("add-base").value = formatIso(now);
  el("info-date").value = formatIso(now);
  el("age-on").value = formatIso(now);
  // 生年月日は既定値を置かない。今日を入れると 0 歳と出て紛らわしい。

  for (const id of ["diff-from", "diff-to"]) {
    el(id).addEventListener("input", () => {
      renderDiff();
      syncDiffSlider();
    });
  }
  el("diff-slider").addEventListener("input", onDiffSlider);

  el("add-base").addEventListener("input", renderAdd);
  el("add-dir").addEventListener("input", renderAdd);
  el("add-days").addEventListener("input", () => {
    renderAdd();
    syncAddSlider();
  });
  el("add-slider").addEventListener("input", onAddSlider);

  el("info-date").addEventListener("input", renderInfo);
  for (const id of ["age-birth", "age-on"]) {
    el(id).addEventListener("input", renderAge);
  }

  for (const button of document.querySelectorAll("button.today")) {
    button.addEventListener("click", () => setToday(el(button.dataset.target)));
  }

  el("diff-swap").addEventListener("click", () => {
    const a = el("diff-from");
    const b = el("diff-to");
    [a.value, b.value] = [b.value, a.value];
    renderDiff();
    syncDiffSlider();
  });

  const style = el("date-style");
  style.value = dateStyle;
  style.addEventListener("change", () => {
    dateStyle = style.value;
    saveStyle(dateStyle);
    renderAll();
  });

  renderAll();
  syncDiffSlider();
  syncAddSlider();
}

// type="module" は defer 相当なので、DOM は既に構築済み。
init();
