/**
 *   node --test util/businessDashboard.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { presetRange, daysBetween, aggregate, shortDay, openGatePasses, ageText } = require("./businessDashboard");

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
  margin: {
    ok: true,
    rows: [
      { day: "2026-11-01", store: "outlet:3", sales_ex_tax: 900, costed_sales: 800, cost: 600, margin: 200, uncosted_sales: 100 },
      { day: "2026-11-02", store: "outlet:4", sales_ex_tax: 2700, costed_sales: 2700, cost: 2160, margin: 540, uncosted_sales: 0 },
    ],
  },
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
    assert.equal(totals.margin, 740);
    assert.equal(totals.margin_pct, 21.14);
    assert.equal(totals.margin_coverage_pct, 97.22);
    assert.equal(byStore[1].margin_pct, 25);
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

describe("open gate passes", () => {
  const data = {
    gate_passes: {
      ok: true,
      rows: [
        { slug: "GP-1", store: "outlet:3", entry_time: "2026-11-15T05:00:00Z", inspections: [] },
        { slug: "GP-2", store: "outlet:4", entry_time: "2026-11-13T03:00:00Z", inspections: [{ slug: "IN-1", state: "IN_PROGRESS" }] },
      ],
    },
  };
  const now = Date.parse("2026-11-15T06:00:00Z");
  it("oldest first, aged from entry, unloading when an inspection exists", () => {
    const rows = openGatePasses(data, "", now);
    assert.deepEqual(rows.map((r) => [r.slug, r.open_hours, r.unloading]), [["GP-2", 51, true], ["GP-1", 1, false]]);
    assert.deepEqual(openGatePasses(data, "outlet:3", now).map((r) => r.slug), ["GP-1"]);
    assert.deepEqual(openGatePasses(null), []);
  });
  it("ages read as minutes, hours or days", () => {
    assert.equal(ageText(0.5), "30m");
    assert.equal(ageText(5.25), "5h 15m");
    assert.equal(ageText(51), "2d 3h");
    assert.equal(ageText(null), "—");
  });
});
