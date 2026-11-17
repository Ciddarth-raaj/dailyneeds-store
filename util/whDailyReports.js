/**
 * Warehouse Daily Reports pages - the five reports, reading an uploaded file,
 * and the tables and Excel rows of the analysis.
 *
 * CommonJS, so it is unit-tested with `node --test` and no bundler.
 *
 *   node --test util/whDailyReports.test.js
 */

const REPORTS = [
  { key: "PICKING", label: "Picking", shape: "JOB", hint: "Write-off = Short Qty", color: "orange" },
  { key: "PACKING", label: "Packing", shape: "JOB", hint: "Write-off = Short Qty", color: "purple" },
  { key: "LOADING", label: "Loading", shape: "BOX", hint: "Boxes put on trucks", color: "blue" },
  { key: "UNLOADING", label: "Unloading", shape: "BOX", hint: "Boxes taken off at stores", color: "cyan" },
  { key: "VERIFICATION", label: "Verification", shape: "JOB", hint: "Short / returned at verification", color: "green" },
];
const JOB_REPORTS = REPORTS.filter((r) => r.shape === "JOB");
const LABEL = Object.fromEntries(REPORTS.map((r) => [r.key, r.label]));

const BOX_STATUS = {
  OK: { label: "OK", color: "green", hint: "Unloaded at the planned store, same quantity" },
  QTY_DIFF: { label: "Quantity differs", color: "red", hint: "Unloaded quantity is not what was loaded" },
  WRONG_STORE: { label: "Wrong store", color: "red", hint: "Unloaded at a different store than planned" },
  NOT_UNLOADED: { label: "Not unloaded", color: "red", hint: "Loaded, but no unloading the same or next day" },
  NOT_LOADED: { label: "Unloaded, not loaded", color: "orange", hint: "Unloaded, but not in any loading report" },
  OPEN: { label: "Awaiting unloading", color: "gray", hint: "Loaded on the last day there is an unloading report for - may still arrive" },
  RETURN: { label: "Damage return", color: "gray", hint: "Damage / return going back to the warehouse - not expected at a store" },
};
const BOX_ISSUE_KEYS = ["NOT_UNLOADED", "WRONG_STORE", "QTY_DIFF", "NOT_LOADED"];

const pad = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Yesterday in local time: the day the morning's reports are for. */
const yesterdayIso = (now = new Date()) => {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return isoOf(d);
};
const addDays = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number);
  return isoOf(new Date(y, m - 1, d + n));
};

/** The YYYY-MM-DD in a RetailPilot export's file name. */
function dateFromFileName(name) {
  const m = String(name || "").match(/(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Which report a file name says it is, or null. */
function typeFromFileName(name) {
  const s = String(name || "").toLowerCase();
  if (/unloading/.test(s)) return "UNLOADING";
  if (/loading/.test(s)) return "LOADING";
  if (/picking/.test(s)) return "PICKING";
  if (/packing/.test(s)) return "PACKING";
  if (/verification/.test(s)) return "VERIFICATION";
  return null;
}

/**
 * A sheet read as rows of cells (XLSX sheet_to_json with header: 1) -> the
 * upload body's headers and rows. Blank rows at the end are dropped.
 */
function toPayload(aoa) {
  const rows = (aoa || []).map((r) => (Array.isArray(r) ? r : []));
  let i = 0;
  while (i < rows.length && rows[i].every((c) => String(c == null ? "" : c).trim() === "")) i += 1;
  const headers = (rows[i] || []).map((h) => String(h == null ? "" : h).trim());
  const data = rows.slice(i + 1).map((r) => r.map((c) => (c == null ? "" : typeof c === "number" ? c : String(c))));
  while (data.length && data[data.length - 1].every((c) => String(c).trim() === "")) data.pop();
  return { headers, rows: data };
}

/** The five slots for one day: each report with its upload, if any. */
function slotsFor(date, uploads) {
  return REPORTS.map((r) => ({ ...r, upload: (uploads || []).find((u) => u.report_date === date && u.report_type === r.key) || null }));
}

/** Days from `from` to `to`, newest first, each with what was uploaded. */
function uploadGrid(from, to, uploads) {
  const days = [];
  for (let d = to; d >= from; d = addDays(d, -1)) {
    const slots = slotsFor(d, uploads);
    days.push({ date: d, slots, done: slots.filter((s) => s.upload).length });
  }
  return days;
}

const num = (v) => Number(v) || 0;
const blank = () => ({ lines: 0, short_lines: 0, short_qty: 0, short_value: 0, short_unpriced_lines: 0, returned_qty: 0, open_lines: 0, open_jobs: 0, actual_qty: 0, planned_qty: 0 });
const add = (into, row) => {
  for (const k of Object.keys(blank())) into[k] += num(row[k]);
  return into;
};

/** Totals per report: { PICKING: {...}, PACKING: {...}, VERIFICATION: {...} }. */
function totalsByReport(summary) {
  const out = Object.fromEntries(JOB_REPORTS.map((r) => [r.key, blank()]));
  for (const s of summary || []) if (out[s.report_type]) add(out[s.report_type], s);
  return out;
}

/**
 * One row per value of `key` (to_store, department, job_type) with each
 * report's write-off side by side, worst first.
 */
function pivotByReport(rows, key) {
  const map = new Map();
  for (const r of rows || []) {
    const k = r[key] || "(blank)";
    if (!map.has(k)) map.set(k, { key: k, PICKING: blank(), PACKING: blank(), VERIFICATION: blank(), total_short_qty: 0, total_short_value: 0 });
    const m = map.get(k);
    if (m[r.report_type]) add(m[r.report_type], r);
    m.total_short_qty += num(r.short_qty);
    m.total_short_value += num(r.short_value);
  }
  return [...map.values()].sort((a, b) => b.total_short_value - a.total_short_value || b.total_short_qty - a.total_short_qty || String(a.key).localeCompare(String(b.key)));
}

/** One row per day: each report's write-off and the box issues. */
function dailyRows(daily, boxDaily) {
  const map = new Map();
  const row = (d) => {
    if (!map.has(d)) map.set(d, { date: d, PICKING: blank(), PACKING: blank(), VERIFICATION: blank(), boxes: 0, box_issue_lines: 0 });
    return map.get(d);
  };
  for (const r of daily || []) if (JOB_REPORTS.some((j) => j.key === r.report_type)) add(row(r.report_date)[r.report_type], r);
  for (const b of boxDaily || []) {
    const r = row(b.report_date);
    r.boxes = num(b.boxes);
    r.box_issue_lines = num(b.issue_lines);
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date));
}

/** Store funnel rows for one job type, or summed over all of them. */
function funnelRows(funnel, jobType) {
  const keys = ["picked", "packed", "loaded", "unloaded", "verified", "picking_short", "verification_short"];
  const map = new Map();
  for (const f of funnel || []) {
    if (jobType && f.job_type !== jobType) continue;
    const k = f.store || "(blank)";
    if (!map.has(k)) map.set(k, { store: k, ...Object.fromEntries(keys.map((x) => [x, 0])) });
    const m = map.get(k);
    for (const x of keys) m[x] += num(f[x]);
  }
  return [...map.values()].sort((a, b) => a.store.localeCompare(b.store));
}

const jobTypesOf = (funnel) => [...new Set((funnel || []).map((f) => f.job_type).filter(Boolean))].sort();

/** Articles filtered by report and a search on name or id. */
function filterArticles(list, { report = "", search = "" } = {}) {
  const s = String(search || "").trim().toLowerCase();
  return (list || []).filter(
    (a) => (!report || a.report_type === report) && (!s || String(a.article_id).includes(s) || String(a.article_name || "").toLowerCase().includes(s))
  );
}

const r2 = (v) => Math.round(num(v) * 100) / 100;

/** Excel rows, one sheet each. */
const excel = {
  byKey: (rows, keyLabel) =>
    rows.map((r) => ({
      [keyLabel]: r.key,
      "Picking short lines": r.PICKING.short_lines,
      "Picking short qty": r.PICKING.short_qty,
      "Picking short value": r2(r.PICKING.short_value),
      "Packing short lines": r.PACKING.short_lines,
      "Packing short qty": r.PACKING.short_qty,
      "Packing short value": r2(r.PACKING.short_value),
      "Verification short lines": r.VERIFICATION.short_lines,
      "Verification short qty": r.VERIFICATION.short_qty,
      "Verification short value": r2(r.VERIFICATION.short_value),
      "Verification returned qty": r.VERIFICATION.returned_qty,
      "Total short qty": r.total_short_qty,
      "Total short value": r2(r.total_short_value),
    })),
  articles: (rows) =>
    rows.map((a) => ({
      Report: LABEL[a.report_type] || a.report_type,
      "Article ID": a.article_id,
      "Article name": a.article_name,
      Department: a.department,
      Category: a.category,
      "Days short": a.days_short,
      Stores: a.stores,
      "Short qty": a.short_qty,
      MRP: a.mrp,
      "Short value": r2(a.short_value),
      "Last short on": a.last_short_date,
    })),
  daily: (rows) =>
    rows.map((d) => ({
      Date: d.date,
      "Picking short qty": d.PICKING.short_qty,
      "Picking short value": r2(d.PICKING.short_value),
      "Picking open lines": d.PICKING.open_lines,
      "Packing short qty": d.PACKING.short_qty,
      "Packing short value": r2(d.PACKING.short_value),
      "Verification short qty": d.VERIFICATION.short_qty,
      "Verification short value": r2(d.VERIFICATION.short_value),
      "Verification open lines": d.VERIFICATION.open_lines,
      Boxes: d.boxes,
      "Box issue lines": d.box_issue_lines,
    })),
  funnel: (rows) =>
    rows.map((f) => ({
      Store: f.store,
      Picked: f.picked,
      "Picking short": f.picking_short,
      Packed: f.packed,
      Loaded: f.loaded,
      Unloaded: f.unloaded,
      Verified: f.verified,
      "Verification short": f.verification_short,
    })),
  trucks: (rows) =>
    rows.map((t) => ({
      Date: t.report_date,
      Truck: t.truck_no,
      Stores: t.stores,
      Boxes: t.boxes,
      "Loaded qty": t.loaded_qty,
      "Unloaded qty": t.unloaded_qty,
      "First loaded": t.first_loaded_at,
      "Last loaded": t.last_loaded_at,
      "First unloaded": t.first_unloaded_at,
      "Last unloaded": t.last_unloaded_at,
      Issues: t.issues,
      "Damage return lines": t.returns,
    })),
  boxLines: (rows) =>
    rows.map((l) => ({
      Status: (BOX_STATUS[l.status] || {}).label || l.status,
      "Loaded on": l.report_date,
      "Box ID": l.box_id,
      "Box kind": l.box_kind,
      Truck: l.truck_no,
      "Job type": l.job_type,
      "Planned store": l.planned_to_store,
      "Unloaded store": l.unloaded_store,
      "Article ID": l.article_id,
      "Article name": l.article_name,
      "Loaded qty": l.loaded_qty,
      "Unloaded qty": l.unloaded_qty,
      MRP: l.mrp,
      "Loaded at": l.loaded_at,
      "Unloaded at": l.unloaded_at,
    })),
  jobRows: (rows) =>
    rows.map((r) => ({
      Date: r.report_date,
      Report: LABEL[r.report_type] || r.report_type,
      "Job type": r.job_type,
      Store: r.to_store,
      "Article ID": r.article_id,
      "Article name": r.article_name,
      Department: r.department,
      Category: r.category,
      "Planned qty": r.planned_qty,
      "Actual qty": r.actual_qty,
      "Short qty (write-off)": r.short_qty,
      "Returned qty": r.returned_qty,
      "Open jobs": r.open_jobs,
      MRP: r.mrp,
      "MRP from": r.mrp_source === "FILE" ? "File" : r.mrp_source === "GRN" ? "Latest GRN" : "",
      "Short value": r.short_value == null ? null : r2(r.short_value),
    })),
};

module.exports = {
  REPORTS,
  JOB_REPORTS,
  LABEL,
  BOX_STATUS,
  BOX_ISSUE_KEYS,
  yesterdayIso,
  addDays,
  dateFromFileName,
  typeFromFileName,
  toPayload,
  slotsFor,
  uploadGrid,
  totalsByReport,
  pivotByReport,
  dailyRows,
  funnelRows,
  jobTypesOf,
  filterArticles,
  excel,
};
