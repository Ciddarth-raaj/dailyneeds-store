/**
 *   node --test util/poTracker.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { splitByStage, excelRow, statusText, options, filterOrders, groupBySupplier, summarize } = require("./poTracker");

const LIST = [
  { po_slug: "a", po_ref: "PO-1", supplier: "Acme", store: "Warehouse", raised_by: "Ravi", status: "APPROVED", expired: true, pending_value: 100, net_amount: 500, open_lines: 2 },
  { po_slug: "b", po_ref: "PO-2", supplier: "Acme", store: "ECR", raised_by: "Meena", status: "PARTIALLY_FULFILLED", expired: false, pending_value: 50, net_amount: 300, open_lines: 1, value_fill_pct: 80 },
  { po_slug: "c", po_ref: "PO-3", supplier: "Bharat", store: "Warehouse", raised_by: "Ravi", status: "FULFILLED", expired: false, pending_value: 0, net_amount: 200, open_lines: 0 },
];

describe("po tracker page", () => {
  it("names statuses", () => assert.equal(statusText("PARTIALLY_FULFILLED"), "Partially Fulfilled"));
  it("lists filter options", () => assert.deepEqual(options(LIST).raisedBy, ["Meena", "Ravi"]));
  it("filters open, expired, store, raised by and search", () => {
    assert.deepEqual(filterOrders(LIST).map((o) => o.po_slug), ["a", "b"]);
    assert.deepEqual(filterOrders(LIST, { status: "expired" }).map((o) => o.po_slug), ["a"]);
    assert.deepEqual(filterOrders(LIST, { status: "", store: "Warehouse", raisedBy: "Ravi" }).map((o) => o.po_slug), ["a", "c"]);
    assert.deepEqual(filterOrders(LIST, { status: "", search: "bhar" }).map((o) => o.po_slug), ["c"]);
  });
  it("groups by supplier and sums", () => {
    const g = groupBySupplier(LIST);
    assert.equal(g.length, 2);
    assert.equal(g[0].pending_value, 150);
    const s = summarize(LIST);
    assert.equal(s.pending_value, 150);
    assert.equal(s.expired.count, 1);
    assert.equal(s.partly.avg_value_fill, 80);
  });
  it("puts each PO in exactly one stage", () => {
    const st = splitByStage(LIST);
    assert.deepEqual(Object.fromEntries(Object.entries(st).map(([k, v]) => [k, v.map((o) => o.po_slug)])), {
      approved: [], partly: ["b"], expired: ["a"], fulfilled: ["c"], other: [],
    });
    assert.equal(excelRow(LIST[0])["Expired"], "Yes");
  });
});
