import {
  addDays,
  breakdown,
  countWeekdays,
  diffDays,
  formatBreakdown,
  formatIso,
  formatJa,
  parseDate,
  today,
} from "./date-calc.js";

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
  const out = document.getElementById("diff-result");
  const from = parseDate(document.getElementById("diff-from").value);
  const to = parseDate(document.getElementById("diff-to").value);

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
  const out = document.getElementById("add-result");
  const base = parseDate(document.getElementById("add-base").value);
  const raw = document.getElementById("add-days").value;
  const dir = Number(document.getElementById("add-dir").value);

  if (!base || raw === "" || !Number.isFinite(Number(raw))) {
    out.className = "result empty";
    out.textContent = "基準日と日数を入力してください";
    return;
  }

  const amount = Math.trunc(Number(raw));
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

function init() {
  const now = today();
  document.getElementById("diff-from").value = formatIso(now);
  document.getElementById("diff-to").value = formatIso(addDays(now, 30));
  document.getElementById("add-base").value = formatIso(now);

  for (const id of ["diff-from", "diff-to"]) {
    document.getElementById(id).addEventListener("input", renderDiff);
  }
  for (const id of ["add-base", "add-days", "add-dir"]) {
    document.getElementById(id).addEventListener("input", renderAdd);
  }

  document.getElementById("diff-swap").addEventListener("click", () => {
    const a = document.getElementById("diff-from");
    const b = document.getElementById("diff-to");
    [a.value, b.value] = [b.value, a.value];
    renderDiff();
  });

  renderDiff();
  renderAdd();
}

// type="module" は defer 相当なので、DOM は既に構築済み。
init();
