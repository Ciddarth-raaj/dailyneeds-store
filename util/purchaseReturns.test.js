/**
 *   node --test util/purchaseReturns.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { ageTone, summarise } = require("./purchaseReturns");

const DATA = {
  stores: [
    { key: "outlet:3", name: "Kathirkamam", mapped: true },
    { key: "outlet:9", name: "Warehouse", mapped: true },
  ],
  settled: {
    ok: true,
    rows: [
      { kind: "debit_note", amount: 8561, store: "outlet:9", supplier_id: "1", supplier_name: "Deva" },
      { kind: "replacement", amount: 3000, store: "outlet:9", supplier_id: "2", supplier_name: "Hector" },
      { kind: "replacement", amount: 664, store: "outlet:9", supplier_id: "2", supplier_name: "Hector" },
      { kind: "debit_note", amount: 100, store: "outlet:3", supplier_id: "1", supplier_name: "Deva" },
    ],
  },
  open: {
    ok: true,
    rows: [
      { amount: 100, store: "outlet:9", supplier_id: "5", supplier_name: "A", raised_on: "2026-11-01", age_days: 23 },
      { amount: 50, store: "outlet:9", supplier_id: "5", supplier_name: "A", raised_on: "2026-11-10", age_days: 14 },
      { amount: 900, store: "outlet:3", supplier_id: "6", supplier_name: "B", raised_on: "2026-10-15", age_days: 40 },
    ],
  },
};

describe("summarise", () => {
  it("all stores: totals, every store listed, top suppliers, open grouped oldest first", () => {
    const s = summarise(DATA, "", 20000);
    assert.equal(s.totals.debit_note, 8661);
    assert.equal(s.totals.debit_notes, 2);
    assert.equal(s.totals.replacement, 3664);
    assert.equal(s.totals.replacements, 2);
    assert.equal(s.totals.debit_note_pct, 43.31);
    assert.equal(s.totals.open_value, 1050);
    assert.equal(s.totals.open_claims, 3);
    assert.equal(s.totals.open_suppliers, 2);
    assert.equal(s.totals.oldest_days, 40);
    assert.deepEqual(s.byStore.map((r) => [r.name, r.debit_note, r.replacements]), [["Kathirkamam", 100, 0], ["Warehouse", 8561, 2]]);
    assert.deepEqual(s.topSuppliers.map((r) => [r.name, r.notes, r.value]), [["Deva", 2, 8661]]);
    assert.deepEqual(s.open.map((r) => [r.supplier, r.location, r.claims, r.value, r.age_days, r.raised_on]), [
      ["B", "Kathirkamam", 1, 900, 40, "2026-10-15"],
      ["A", "Warehouse", 2, 150, 23, "2026-11-01"],
    ]);
  });

  it("one store narrows everything; no purchases means no %", () => {
    const s = summarise(DATA, "outlet:3", 0);
    assert.equal(s.totals.debit_note, 100);
    assert.equal(s.totals.debit_note_pct, null);
    assert.equal(s.byStore.length, 1);
    assert.equal(s.open.length, 1);
  });

  it("no data", () => {
    assert.equal(summarise(null).open.length, 0);
  });
});

describe("ageTone", () => {
  it("amber after 7 days, red after 15", () => {
    assert.deepEqual([7, 8, 15, 16, null].map(ageTone), ["normal", "amber", "amber", "red", "normal"]);
  });
});
