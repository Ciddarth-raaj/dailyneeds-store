/**
 *   node --test util/poTracker.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { splitByStage, excelRow, statusText, options, filterOrders, sortOrders, totals, daysFrom } = require("./poTracker");

const LIST = [
  { po_slug: "a", po_ref: "PO-1", supplier: "Acme", store: "Warehouse", raised_by: "Ravi", status: "APPROVED", days_past_validity: 3, pending_value: 100, po_date: "2026-11-02" },
  { po_slug: "b", po_ref: "PO-2", supplier: "Acme", store: "ECR", raised_by: "Meena", status: "PARTIALLY_FULFILLED", days_past_validity: 5, pending_value: 50, value_fill_pct: 80, po_date: "2026-11-01" },
  { po_slug: "c", po_ref: "PO-3", supplier: "Bharat", store: "Warehouse", raised_by: "Ravi", status: "FULFILLED", pending_value: 0, po_date: "2026-11-05" },
  { po_slug: "d", po_ref: "PO-4", supplier: "Chola", store: "Warehouse", raised_by: "Ravi", status: "APPROVED", days_past_validity: null, pending_value: 70, po_date: "2026-11-10" },
  { po_slug: "e", po_ref: "PO-5", supplier: "Delta", store: "ECR", raised_by: "Ravi", status: "DRAFT", pending_value: 0, po_date: "2026-11-11" },
];

const slugs = (l) => l.map((o) => o.po_slug);

describe("po tracker page", () => {
  it("expired is only approved POs with nothing received; part received stays part received", () => {
    const st = splitByStage(LIST);
    assert.deepEqual(slugs(st.expired), ["a"]);
    assert.deepEqual(slugs(st.partly), ["b"]);
    assert.deepEqual(slugs(st.awaiting), ["d"]);
    assert.deepEqual(slugs(st.fulfilled), ["c"]);
    assert.deepEqual(slugs(st.other), ["e"]);
  });
  it("names statuses", () => assert.equal(statusText("PARTIALLY_FULFILLED"), "Partially Fulfilled"));
  it("lists filter options", () => assert.deepEqual(options(LIST).raisedBy, ["Meena", "Ravi"]));
  it("filters store, raised by and search", () => {
    assert.deepEqual(slugs(filterOrders(LIST, { store: "Warehouse", raisedBy: "Ravi" })), ["a", "c", "d"]);
    assert.deepEqual(slugs(filterOrders(LIST, { search: "bhar" })), ["c"]);
    assert.deepEqual(slugs(filterOrders(LIST, { search: "po-4" })), ["d"]);
  });
  it("sorts", () => {
    assert.deepEqual(slugs(sortOrders(LIST, "pending")).slice(0, 2), ["a", "d"]);
    assert.deepEqual(slugs(sortOrders(LIST, "oldest")).slice(0, 2), ["b", "a"]);
    assert.equal(sortOrders(LIST, "fill")[0].po_slug, "b");
  });
  it("totals and days", () => {
    assert.deepEqual(totals(LIST), { count: 5, pending_value: 220 });
    assert.equal(daysFrom("2026-11-09", "2026-11-16"), -7);
    assert.equal(daysFrom("2026-11-18", "2026-11-16"), 2);
  });
  it("Excel row carries the stage", () => {
    assert.equal(excelRow(LIST[1]).Stage, "Partly received");
    assert.equal(excelRow(LIST[3])["Days past validity"], null);
  });
});
