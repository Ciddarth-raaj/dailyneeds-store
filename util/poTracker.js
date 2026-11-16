/**
 * PO Tracker page - filtering, grouping and summing the POs the server sent.
 *
 * CommonJS, so it is unit-tested with `node --test` and no bundler.
 */

/** Status filter: "open" = still waiting on the supplier (APPROVED or PARTIALLY_FULFILLED). */
const STATUSES = [
  { key: "open", label: "Open (approved / part filled)" },
  { key: "", label: "All statuses" },
  { key: "APPROVED", label: "Approved" },
  { key: "PARTIALLY_FULFILLED", label: "Partly fulfilled" },
  { key: "FULFILLED", label: "Fulfilled" },
  { key: "expired", label: "Expired only" },
];

const OPEN = new Set(["APPROVED", "PARTIALLY_FULFILLED"]);

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

function filterOrders(orders, { status = "open", store = "", raisedBy = "", search = "" } = {}) {
  const q = String(search || "").trim().toLowerCase();
  return (orders || []).filter((o) => {
    if (status === "open" && !OPEN.has(o.status)) return false;
    if (status === "expired" && !o.expired) return false;
    if (status && status !== "open" && status !== "expired" && o.status !== status) return false;
    if (store && o.store !== store) return false;
    if (raisedBy && o.raised_by !== raisedBy) return false;
    if (q && ![o.supplier, o.po_ref, o.po_slug].some((v) => String(v || "").toLowerCase().includes(q))) return false;
    return true;
  });
}

/** Orders (already sorted by supplier, PO date) -> [{ supplier, orders, pending_value }]. */
function groupBySupplier(orders) {
  const groups = new Map();
  for (const o of orders || []) {
    if (!groups.has(o.supplier)) groups.set(o.supplier, { supplier: o.supplier, orders: [], pending_value: 0 });
    const g = groups.get(o.supplier);
    g.orders.push(o);
    g.pending_value += Number(o.pending_value) || 0;
  }
  return [...groups.values()];
}

function summarize(orders) {
  const list = orders || [];
  const sum = (rows, f) => rows.reduce((s, r) => s + (Number(f(r)) || 0), 0);
  const partly = list.filter((o) => o.status === "PARTIALLY_FULFILLED");
  const expired = list.filter((o) => o.expired);
  const fills = partly.map((o) => o.value_fill_pct).filter((v) => v !== null && v !== undefined);
  return {
    count: list.length,
    suppliers: new Set(list.map((o) => o.supplier)).size,
    net_amount: sum(list, (o) => o.net_amount),
    pending_value: sum(list, (o) => o.pending_value),
    open_lines: sum(list, (o) => o.open_lines),
    partly: { count: partly.length, avg_value_fill: fills.length ? Math.round((fills.reduce((a, b) => a + b, 0) / fills.length) * 10) / 10 : null },
    expired: { count: expired.length, pending_value: sum(expired, (o) => o.pending_value) },
  };
}

module.exports = { STATUSES, statusText, options, filterOrders, groupBySupplier, summarize };
