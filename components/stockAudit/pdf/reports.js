/**
 * HR daily PDFs for team groups - simple, A4 portrait, readable on a phone.
 *
 *   consolidatedPdf  all five stores + company totals + SAPL standings
 *   storePdf         one store: every applicable employee, store totals
 *
 * NEVER includes salary or individual incentive amounts (these are shared in
 * team groups). Missing figures print as "Pending" / "Unavailable", never 0.
 * Daily activity (the report date) is kept apart from cumulative cycle totals.
 * SAPL ranks are printed as PROVISIONAL until final approval.
 *
 * Pure apart from jsPDF: give it the data and the logo as a data URL.
 */
import { jsPDF } from "jspdf";

const PURPLE = [115, 47, 141];
const ORANGE = [241, 90, 34];
const GREY = [110, 110, 110];
const LIGHT = [244, 236, 247];

const nf = new Intl.NumberFormat("en-IN");
const num = (n) => (n == null ? "-" : nf.format(Math.round(n)));
const pct = (n) => (n == null ? "-" : `${(Math.floor(n * 100) / 100).toFixed(2)}%`);
/** A status cell as plain words. */
export const cellText = (c, kind = "num") => {
  if (c == null) return "-";
  if (typeof c !== "object") return kind === "pct" ? pct(c) : num(c);
  if (c.status === "AVAILABLE") return kind === "pct" ? pct(c.value) : num(c.value);
  return c.status === "UNAVAILABLE" ? "Unavailable" : c.status === "NOT_APPLICABLE" ? "N/A" : "Pending";
};
const ist = (iso) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const istDate = (d) => new Date(`${d}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function header(doc, { logo, title, subtitle, meta }) {
  const W = doc.internal.pageSize.getWidth();
  if (logo) doc.addImage(logo, "PNG", 12, 10, 50, 10);
  doc.setFillColor(...PURPLE);
  doc.rect(0, 26, W, 1.2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...PURPLE);
  doc.text(title, 12, 36);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...GREY);
  doc.text(subtitle, 12, 42);
  doc.setFontSize(8);
  doc.text(meta, 12, 47);
  return 54;
}

function footer(doc, note) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(note, 12, H - 8);
    doc.text(`Page ${i} of ${n}`, W - 12, H - 8, { align: "right" });
  }
}

function ensure(doc, y, need) {
  if (y + need > doc.internal.pageSize.getHeight() - 16) {
    doc.addPage();
    return 16;
  }
  return y;
}

/** A labelled figure grid: pairs of [label, value], 3 per row. */
function figures(doc, y, pairs, { cols = 3 } = {}) {
  const W = doc.internal.pageSize.getWidth() - 24;
  const cw = W / cols;
  pairs.forEach(([label, value], i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 12 + col * cw;
    const yy = y + row * 12;
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(label, x, yy);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(String(value), x, yy + 5);
    doc.setFont("helvetica", "normal");
  });
  return y + Math.ceil(pairs.length / cols) * 12;
}

function band(doc, y, text, color = PURPLE) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...color);
  doc.rect(12, y, W - 24, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(text, 15, y + 5);
  doc.setFont("helvetica", "normal");
  return y + 11;
}

/**
 * @param data { date, cycle, generatedAt, lastSync, historical: bool, stores: [storeView], standings: [...], sample: bool }
 */
export function consolidatedPdf(data, { logo } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const sampleTag = data.sample ? "  |  SAMPLE DATA" : "";
  let y = header(doc, {
    logo,
    title: "Stock Audit - Daily Report, All Stores",
    subtitle: `${istDate(data.date)}  |  ${data.cycle}${sampleTag}`,
    meta: `Generated ${ist(data.generatedAt)}  |  Data as of last successful sync ${ist(data.lastSync)}`,
  });
  const rankOf = new Map((data.standings || []).map((s) => [s.store.outlet_id, s]));
  const sum = (f) => data.stores.reduce((t, s) => t + f(s), 0);
  const allKnown = (k) => data.stores.every((s) => s[k] && s[k].status === "AVAILABLE");
  const cum = (c) => (data.historical ? "Unavailable" : cellText(c));

  y = band(doc, y, "Company totals");
  y = figures(doc, y, [
    ["Articles allotted", data.historical ? "Unavailable" : allKnown("allotted") ? num(sum((s) => s.allotted.value)) : "Unavailable"],
    ["Audited on this date", num(sum((s) => s.audited_today))],
    ["Total audited (cycle)", data.historical ? "Unavailable" : num(sum((s) => s.audited))],
    ["Pending articles", data.historical ? "Unavailable" : allKnown("pending") ? num(sum((s) => s.pending.value)) : "Unavailable"],
    ["Recounts done / required", data.historical ? "Unavailable" : `${num(sum((s) => s.recount_done))} / ${num(sum((s) => s.recount_required))}`],
    ["SAPL winning store prize", "Rs. 10,000"],
  ]);
  y += 2;

  data.stores.forEach((s) => {
    y = ensure(doc, y, 52);
    const r = rankOf.get(s.outlet_id);
    y = band(doc, y, `${s.name}${r ? `   |   SAPL rank ${r.rank} (provisional)   |   ${r.total} pts` : ""}`, PURPLE);
    y = figures(doc, y, [
      ["Articles allotted", cum(s.allotted)],
      ["Audited on this date", num(s.audited_today)],
      ["Total audited (cycle)", data.historical ? "Unavailable" : num(s.audited)],
      ["Pending articles", cum(s.pending)],
      ["Completion", data.historical ? "Unavailable" : cellText(s.completion, "pct")],
      ["Counting accuracy", data.historical ? "Unavailable" : cellText(s.accuracy, "pct")],
      ["Recount progress", data.historical ? "Unavailable" : `${num(s.recount_done)} of ${num(s.recount_required)} (${cellText(s.recount_progress, "pct")})`],
      ["Employees participating", `${s.participating} of ${s.eligible_employees}`],
    ]);
    y += 3;
  });

  y = ensure(doc, y, 60);
  y = band(doc, y, "DNDS Stock Audit Premier League - provisional standings", ORANGE);
  doc.setFontSize(9);
  (data.standings || []).forEach((r) => {
    y = ensure(doc, y, 7);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", r.rank === 1 ? "bold" : "normal");
    doc.text(`${r.rank}.  ${r.store.name}`, 15, y);
    doc.text(`${r.total} pts${r.complete ? "" : "  (some KPIs pending)"}`, doc.internal.pageSize.getWidth() - 15, y, { align: "right" });
    y += 6;
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);
  y = ensure(doc, y, 8);
  doc.text("Standings are provisional until the season ends and management approves the result. Prize: Rs. 10,000 to the winning store team.", 12, y + 2, { maxWidth: doc.internal.pageSize.getWidth() - 24 });

  footer(doc, `Daily Needs Stock Audit${data.sample ? " - SAMPLE DATA, not real figures" : ""}. No salary or individual incentive amounts.`);
  return doc;
}

/** @param data { date, cycle, generatedAt, lastSync, historical, store: storeView, standing, sample } */
export function storePdf(data, { logo } = {}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const s = data.store;
  const sampleTag = data.sample ? "  |  SAMPLE DATA" : "";
  let y = header(doc, {
    logo,
    title: `Stock Audit - ${s.name}`,
    subtitle: `${istDate(data.date)}  |  ${data.cycle}${sampleTag}`,
    meta: `Generated ${ist(data.generatedAt)}  |  Data as of last successful sync ${ist(data.lastSync)}`,
  });
  const H = data.historical;
  y = band(doc, y, `Store totals${data.standing ? `   |   SAPL rank ${data.standing.rank} (provisional), ${data.standing.total} pts` : ""}`);
  y = figures(doc, y, [
    ["Articles allotted", H ? "Unavailable" : cellText(s.allotted)],
    ["Audited on this date", num(s.audited_today)],
    ["Total audited (cycle)", H ? "Unavailable" : num(s.audited)],
    ["Pending articles", H ? "Unavailable" : cellText(s.pending)],
    ["Completion", H ? "Unavailable" : cellText(s.completion, "pct")],
    ["Counting accuracy", H ? "Unavailable" : cellText(s.accuracy, "pct")],
    ["Recounts required", H ? "Unavailable" : num(s.recount_required)],
    ["Recounts completed", H ? "Unavailable" : num(s.recount_done)],
    ["Employees participating", `${s.participating} of ${s.eligible_employees}`],
  ]);
  y += 3;
  y = band(doc, y, `Employees (${s.employees.length})`);

  // Two-line rows instead of a wide table: name on line 1, figures on line 2.
  const W = doc.internal.pageSize.getWidth();
  const emps = [...s.employees].sort((a, b) => (a.name || a.rp_name).localeCompare(b.name || b.rp_name));
  emps.forEach((e, i) => {
    y = ensure(doc, y, 13);
    if (i % 2 === 0) {
      doc.setFillColor(...LIGHT);
      doc.rect(12, y - 4, W - 24, 12.5, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 30, 30);
    doc.text(`${e.name || e.rp_name}${e.name ? "" : " (not yet mapped)"}`, 15, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(e.designation || "", W - 15, y, { align: "right" });
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(8);
    const line = [
      `Allotted ${H ? "Unavailable" : cellText(e.allotted_c)}`,
      `Today ${num(e.today)}`,
      `Total ${H ? "Unavailable" : num(e.audited)}`,
      `Pending ${H ? "Unavailable" : cellText(e.pending_c)}`,
      `Done ${H ? "Unavailable" : cellText(e.completion_c, "pct")}`,
      `Recounts ${H ? "Unavailable" : `${num(e.recount_done)}/${num(e.recount_required)}`}`,
      `Accuracy ${H ? "Unavailable" : cellText(e.accuracy, "pct")}`,
    ].join("   ");
    doc.text(line, 15, y + 5.5, { maxWidth: W - 30 });
    y += 13.5;
  });

  footer(doc, `Daily Needs Stock Audit${data.sample ? " - SAMPLE DATA, not real figures" : ""}. No salary or individual incentive amounts.`);
  return doc;
}
