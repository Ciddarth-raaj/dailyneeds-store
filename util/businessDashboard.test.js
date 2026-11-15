/**
 *   node --test util/businessDashboard.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { presetRange, daysBetween, aggregate, shortDay } = require("./businessDashboard");

const DATA = {
  from_date: "2026-11-01",
  to_date: "2026-11-03",
  stores: [
    { key: "outlet:3", name: "Kathirkamam", mapped: true },
    { key: "outlet:4", name: "Vallalar Salai", mapped: true },
  ],
  sales: {
    ok: true,
    rows: [
      { day: "2026-11-01", store: "outlet:3", sales: 1000, returns: 50, bills: 10, return_bills: 1 },
      { day: "2026-11-02", store: "outlet:4", sales: 3000, returns: 0, bills: 20, return_bills: 0 },
    ],
  },
  purchases: {
    ok: true,
    rows: [{ day: "2026-11-02", store: "outlet:3", purchase: 800, purchase_invoices: 2, purchase_return: 100, purchase_return_invoices: 1 }],
  },
  stock: { ok: true, rows: [{ store: "outlet:4", cost_value: 5000, sellable_cost_value: 4500, mrp_value: 7000 }] },
};

describe("ranges", () => {
  const today = new Date(2026, 10, 15);
  it("presets end today, last month is the whole previous month", () => {
    assert.deepEqual(presetRange("this_month", today), { from: "2026-11-01", to: "2026-11-15" });
    assert.deepEqual(presetRange("last7", today), { from: "2026-11-09", to: "2026-11-15" });
    assert.deepEqual(presetRange("last_month", today), { from: "2026-10-01", to: "2026-10-31" });
    assert.deepEqual(presetRange("yesterday", new Date(2026, 2, 1)), { from: "2026-02-28", to: "2026-02-28" });
  });
  it("days are inclusive", () => {
    assert.deepEqual(daysBetween("2026-10-30", "2026-11-02"), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
    assert.equal(shortDay("2026-11-02"), "2 Nov");
  });
});

describe("aggregate", () => {
  it("all stores: totals, a row for every day, stores by net sales", () => {
    const { totals, byDay, byStore } = aggregate(DATA);
    assert.equal(totals.sales, 4000);
    assert.equal(totals.net_sales, 3950);
    assert.equal(totals.return_pct, 1.25);
    assert.equal(totals.avg_bill, 133.33);
    assert.equal(totals.net_purchase, 700);
    assert.equal(totals.stock_cost, 5000);
    assert.deepEqual(byDay.map((d) => d.day), ["2026-11-01", "2026-11-02", "2026-11-03"]);
    assert.equal(byDay[2].sales, 0);
    assert.deepEqual(byStore.map((s) => s.key), ["outlet:4", "outlet:3"]);
  });
  it("one store narrows everything", () => {
    const { totals, byStore } = aggregate(DATA, "outlet:3");
    assert.equal(totals.sales, 1000);
    assert.equal(totals.purchase, 800);
    assert.equal(totals.stock_cost, 0);
    assert.equal(byStore.length, 1);
  });
  it("no data is zeros, not errors", () => {
    const { totals, byDay } = aggregate(null);
    assert.equal(totals.sales, 0);
    assert.equal(totals.avg_bill, null);
    assert.deepEqual(byDay, []);
  });
});
