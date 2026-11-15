/**
 * Business Dashboard - turning the server's per-day, per-store rows
 * (`GET /business-dashboard/summary`) into the cards, the daily trend and the
 * store table, for all stores or one.
 *
 * The server sends rows already narrowed to the caller's store scope; picking
 * a store here only narrows further, so switching stores needs no new request.
 *
 * CommonJS, so it is unit-tested with `node --test` and no bundler.
 */

const pad = (n) => String(n).padStart(2, "0");
const isoDay = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Quick ranges, ending today (the browser's day). */
function presetRange(key, today = new Date()) {
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const minus = (days) => new Date(t.getFullYear(), t.getMonth(), t.getDate() - days);
  switch (key) {
    case "today":
      return { from: isoDay(t), to: isoDay(t) };
    case "yesterday":
      return { from: isoDay(minus(1)), to: isoDay(minus(1)) };
    case "last7":
      return { from: isoDay(minus(6)), to: isoDay(t) };
    case "last30":
      return { from: isoDay(minus(29)), to: isoDay(t) };
    case "last_month": {
      const first = new Date(t.getFullYear(), t.getMonth() - 1, 1);
      const last = new Date(t.getFullYear(), t.getMonth(), 0);
      return { from: isoDay(first), to: isoDay(last) };
    }
    case "this_month":
    default:
      return { from: isoDay(new Date(t.getFullYear(), t.getMonth(), 1)), to: isoDay(t) };
  }
}

const PRESETS = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "this_month", label: "This month" },
  { key: "last_month", label: "Last month" },
  { key: "last30", label: "Last 30 days" },
];

/** Every day from `from` to `to`, inclusive, as YYYY-MM-DD. */
function daysBetween(from, to) {
  const out = [];
  const [y, m, d] = from.split("-").map(Number);
  const cur = new Date(y, m - 1, d);
  for (let i = 0; i < 400 && isoDay(cur) <= to; i++) {
    out.push(isoDay(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

const pct = (part, whole) => (whole ? round2((part / whole) * 100) : null);

/**
 * @param data  the summary's `data`
 * @param store "" for every store the caller sees, else a store key
 */
function aggregate(data, store = "") {
  const keep = (r) => !store || r.store === store;
  const sales = ((data && data.sales && data.sales.rows) || []).filter(keep);
  const purchases = ((data && data.purchases && data.purchases.rows) || []).filter(keep);
  const stock = ((data && data.stock && data.stock.rows) || []).filter(keep);
  const stores = ((data && data.stores) || []).filter((s) => !store || s.key === store);

  const sum = (rows, k) => round2(rows.reduce((s, r) => s + (Number(r[k]) || 0), 0));
  const totals = {
    sales: sum(sales, "sales"),
    returns: sum(sales, "returns"),
    bills: sum(sales, "bills"),
    return_bills: sum(sales, "return_bills"),
    purchase: sum(purchases, "purchase"),
    purchase_invoices: sum(purchases, "purchase_invoices"),
    purchase_return: sum(purchases, "purchase_return"),
    purchase_return_invoices: sum(purchases, "purchase_return_invoices"),
    stock_cost: sum(stock, "cost_value"),
    stock_sellable_cost: sum(stock, "sellable_cost_value"),
    stock_mrp: sum(stock, "mrp_value"),
  };
  totals.net_sales = round2(totals.sales - totals.returns);
  totals.net_purchase = round2(totals.purchase - totals.purchase_return);
  totals.avg_bill = totals.bills ? round2(totals.sales / totals.bills) : null;
  totals.return_pct = pct(totals.returns, totals.sales);
  totals.purchase_return_pct = pct(totals.purchase_return, totals.purchase);

  const byDayMap = new Map();
  const days = data && data.from_date && data.to_date ? daysBetween(data.from_date, data.to_date) : [];
  days.forEach((day) => byDayMap.set(day, { day, sales: 0, returns: 0, purchase: 0, purchase_return: 0 }));
  const dayCell = (day) => {
    if (!byDayMap.has(day)) byDayMap.set(day, { day, sales: 0, returns: 0, purchase: 0, purchase_return: 0 });
    return byDayMap.get(day);
  };
  sales.forEach((r) => {
    const c = dayCell(r.day);
    c.sales = round2(c.sales + r.sales);
    c.returns = round2(c.returns + r.returns);
  });
  purchases.forEach((r) => {
    const c = dayCell(r.day);
    c.purchase = round2(c.purchase + r.purchase);
    c.purchase_return = round2(c.purchase_return + r.purchase_return);
  });
  const byDay = [...byDayMap.values()].sort((a, b) => (a.day < b.day ? -1 : 1));

  const byStore = stores.map((s) => {
    const mine = (rows) => rows.filter((r) => r.store === s.key);
    const row = {
      key: s.key,
      name: s.name,
      mapped: s.mapped,
      sales: sum(mine(sales), "sales"),
      returns: sum(mine(sales), "returns"),
      bills: sum(mine(sales), "bills"),
      purchase: sum(mine(purchases), "purchase"),
      purchase_return: sum(mine(purchases), "purchase_return"),
      stock_cost: sum(mine(stock), "cost_value"),
      stock_mrp: sum(mine(stock), "mrp_value"),
    };
    row.net_sales = round2(row.sales - row.returns);
    row.return_pct = pct(row.returns, row.sales);
    return row;
  });
  byStore.sort((a, b) => b.net_sales - a.net_sales || b.purchase - a.purchase || a.name.localeCompare(b.name));

  return { totals, byDay, byStore };
}

/** "12 Nov" for a YYYY-MM-DD day. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDay(day) {
  const [, m, d] = String(day || "").split("-").map(Number);
  return m ? `${d} ${MONTHS[m - 1]}` : "";
}

module.exports = { PRESETS, presetRange, daysBetween, aggregate, shortDay };
