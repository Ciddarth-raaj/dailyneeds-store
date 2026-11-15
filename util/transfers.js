/**
 * Transfers page - filtering and summing the transfers the server sent.
 *
 * CommonJS, so it is unit-tested with `node --test` and no bundler.
 */

const pad = (n) => String(n).padStart(2, "0");
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "open" = no dates (open transfers only); others are a date range ending today. */
const VIEWS = [
  { key: "open", label: "Open now" },
  { key: "today", label: "Dispatched today" },
  { key: "yesterday", label: "Dispatched yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "custom", label: "Custom dates" },
];

function viewRange(key, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const minus = (n) => isoDay(new Date(t.getFullYear(), t.getMonth(), t.getDate() - n));
  if (key === "today") return { from: minus(0), to: minus(0) };
  if (key === "yesterday") return { from: minus(1), to: minus(1) };
  if (key === "last7") return { from: minus(6), to: minus(0) };
  return null;
}

const TYPES = [
  { key: "", label: "All types" },
  { key: "GRN", label: "GRN (cross-dock)" },
  { key: "STA", label: "STA" },
  { key: "ALLOC", label: "Ad-hoc allocation" },
  { key: "DAMG", label: "Damage return" },
  { key: "MIXED", label: "Mixed" },
];

const STATUS_TEXT = { IN_TRANSIT: "In transit", PARTIALLY_RECEIVED: "Partly received", RECEIVED: "Received" };
const statusText = (s) => STATUS_TEXT[String(s || "").toUpperCase()] || s || "—";

/** Transfers for this store and type, longest on the road first. */
function filterTransfers(list, { store = "", type = "" } = {}, nowMs = Date.now()) {
  return (list || [])
    .filter((t) => (!store || t.store === store) && (!type || t.job_type === type))
    .map((t) => {
      const sent = Date.parse(t.dispatched_at);
      const end = t.status === "RECEIVED" && Date.parse(t.received_at) ? Date.parse(t.received_at) : nowMs;
      return { ...t, hours: Number.isFinite(sent) ? Math.round((Math.max(0, end - sent) / 3600000) * 10) / 10 : null };
    })
    .sort((a, b) => String(a.dispatched_at || "").localeCompare(String(b.dispatched_at || "")));
}

/** "2 invoices · 1 ad-hoc · 1 STA" - what a transfer carries. */
function mixText(mix) {
  if (!mix) return "";
  const part = (n, one, many) => (n ? `${n} ${n === 1 ? one : many}` : null);
  return [part(mix.invoices, "invoice", "invoices"), part(mix.adhoc, "ad-hoc", "ad-hoc"), part(mix.sta, "STA", "STAs")]
    .filter(Boolean)
    .join(" · ");
}

const sum = (list, f) => Math.round(list.reduce((t, x) => t + (Number(f(x)) || 0), 0) * 100) / 100;

/** The tiles: on the road, partly received, received, and what stores found short. */
function summarize(list) {
  const l = list || [];
  const inTransit = l.filter((t) => t.status === "IN_TRANSIT");
  const partly = l.filter((t) => t.status === "PARTIALLY_RECEIVED");
  const received = l.filter((t) => t.status === "RECEIVED");
  const short = l.filter((t) => t.short && t.short.returned_qty > 0);
  return {
    in_transit: { count: inTransit.length, value: sum(inTransit, (t) => t.total_landing_cost), boxes: sum(inTransit, (t) => t.box_count) },
    partly: { count: partly.length, value: sum(partly, (t) => t.total_landing_cost) },
    received: { count: received.length, value: sum(received, (t) => t.total_landing_cost) },
    short: { count: short.length, units: sum(short, (t) => t.short.returned_qty), value: sum(short, (t) => t.short.returned_value) },
  };
}

module.exports = { VIEWS, TYPES, viewRange, statusText, mixText, filterTransfers, summarize };
