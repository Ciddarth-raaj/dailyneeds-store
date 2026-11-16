/**
 * PO Tracker page - stages, filtering, sorting and the Excel rows for the
 * POs the server sent.
 *
 * CommonJS, so it is unit-tested with `node --test` and no bundler.
 */

const pastValidity = (o) => Number(o.days_past_validity) > 0;

/**
 * The stages a PO moves through. Each PO is in exactly one:
 *   Awaiting delivery  approved, nothing received, still valid
 *   Partly received    some received (even if past validity - flagged in the row)
 *   Expired            approved, nothing received, past validity
 *   Fulfilled          everything received
 *   Other              any other status (draft, closed, ...)
 */
const STAGES = [
  { key: "awaiting", label: "Awaiting delivery", hint: "Approved, nothing received yet", color: "blue", test: (o) => o.status === "APPROVED" && !pastValidity(o) },
  { key: "partly", label: "Partly received", hint: "Some items received, rest pending", color: "orange", test: (o) => o.status === "PARTIALLY_FULFILLED" },
  { key: "expired", label: "Expired", hint: "Nothing received and past validity", color: "red", test: (o) => o.status === "APPROVED" && pastValidity(o) },
  { key: "fulfilled", label: "Fulfilled", hint: "Fully received", color: "green", test: (o) => o.status === "FULFILLED" },
  { key: "other", label: "Other", hint: "Draft, closed or other status", color: "gray", test: () => true },
];

const stageOf = (o) => STAGES.find((s) => s.test(o)).key;

/** Orders -> { [stage key]: orders }. */
function splitByStage(orders) {
  const out = Object.fromEntries(STAGES.map((s) => [s.key, []]));
  for (const o of orders || []) out[stageOf(o)].push(o);
  return out;
}

const statusText = (s) =>
  String(s || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ") || "—";

const uniq = (list) => [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));

/** Choices for the store and raised-by filters. */
function options(orders) {
  const list = orders || [];
  return { stores: uniq(list.map((o) => o.store)), raisedBy: uniq(list.map((o) => o.raised_by)) };
}

/** Store, raised-by and search (supplier or PO ref). */
function filterOrders(orders, { store = "", raisedBy = "", search = "" } = {}) {
  const q = String(search || "").trim().toLowerCase();
  return (orders || []).filter((o) => {
    if (store && o.store !== store) return false;
    if (raisedBy && o.raised_by !== raisedBy) return false;
    if (q && ![o.supplier, o.po_ref, o.po_slug].some((v) => String(v || "").toLowerCase().includes(q))) return false;
    return true;
  });
}

const SORTS = [
  { key: "supplier", label: "Supplier A–Z" },
  { key: "pending", label: "Pending value, highest first" },
  { key: "oldest", label: "PO date, oldest first" },
  { key: "fill", label: "Received %, lowest first" },
];

function sortOrders(orders, key = "supplier") {
  const list = [...(orders || [])];
  const n = (v, d) => (v === null || v === undefined ? d : Number(v));
  const by = {
    supplier: (a, b) => a.supplier.localeCompare(b.supplier) || String(a.po_date).localeCompare(String(b.po_date)),
    pending: (a, b) => n(b.pending_value, 0) - n(a.pending_value, 0),
    oldest: (a, b) => String(a.po_date).localeCompare(String(b.po_date)),
    fill: (a, b) => n(a.value_fill_pct, 101) - n(b.value_fill_pct, 101),
  }[key];
  return by ? list.sort(by) : list;
}

/** Count and pending value of a list of POs. */
function totals(orders) {
  const list = orders || [];
  return { count: list.length, pending_value: list.reduce((s, o) => s + (Number(o.pending_value) || 0), 0) };
}

/** Whole days from `today` (YYYY-MM-DD) to `day`; negative = in the past. */
function daysFrom(day, today) {
  if (!day || !today) return null;
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

/** One PO as an Excel row. */
function excelRow(o) {
  const stage = STAGES.find((s) => s.key === stageOf(o));
  return {
    Stage: stage.label,
    Supplier: o.supplier,
    "PO no.": o.po_ref,
    Store: o.store,
    "Raised by": o.raised_by,
    "RetailPilot status": statusText(o.status),
    "PO date": o.po_date,
    "Expected delivery": o.expected_delivery_date,
    "Valid till": o.validity_date,
    "Days past validity": pastValidity(o) ? Number(o.days_past_validity) : null,
    "PO value": o.net_amount,
    Lines: o.lines,
    "Open lines": o.open_lines,
    "Pending qty": o.pending_qty,
    "Pending value": o.pending_value,
    "Ordered qty": o.ordered_qty,
    "Received qty": o.received_qty,
    "Received % (qty)": o.qty_fill_pct,
    "Received % (value)": o.value_fill_pct,
    "Older POs for this supplier & store": o.older_pos_ignored,
  };
}

module.exports = { STAGES, SORTS, stageOf, splitByStage, statusText, options, filterOrders, sortOrders, totals, daysFrom, excelRow };
