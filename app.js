import {
  addDays,
  breakdown,
  countWeekdays,
  diffDays,
  formatBreakdown,
  formatIso,
  formatJa,
  formatOffset,
  parseDate,
  sliderBound,
  today,
} from "./date-calc.js";

const el = (id) => document.getElementById(id);
const ja = (n) => n.toLocaleString("ja-JP");

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
      ["開始日", formatJa(from)],
      ["終了日", formatJa(to)],
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
    `<div class="headline">${formatJa(result)}</div>` +
    rows([
      ["基準日", formatJa(base)],
      ["計算", `${ja(amount)}日${dir > 0 ? "後" : "前"}`],
      ["ISO 形式", formatIso(result)],
    ]);
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

  renderDiff();
  renderAdd();
  syncDiffSlider();
  syncAddSlider();
}

// type="module" は defer 相当なので、DOM は既に構築済み。
init();
