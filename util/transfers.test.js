/**
 *   node --test util/transfers.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { viewRange, statusText, mixText, filterTransfers, summarize } = require("./transfers");

const NOW = Date.parse("2026-11-15T06:00:00Z");
const LIST = [
  { slug: "a", store: "outlet:3", job_type: "MIXED", status: "IN_TRANSIT", dispatched_at: "2026-11-15T04:00:00Z", total_landing_cost: 1000, box_count: 4 },
  { slug: "b", store: "outlet:7", job_type: "GRN", status: "PARTIALLY_RECEIVED", dispatched_at: "2026-11-15T02:00:00Z", total_landing_cost: 500 },
  { slug: "c", store: "outlet:3", job_type: "GRN", status: "RECEIVED", dispatched_at: "2026-11-14T10:00:00Z", received_at: "2026-11-14T12:30:00Z", total_landing_cost: 300, short: { returned_qty: 4, returned_value: 38.5 } },
];

describe("transfers page", () => {
  it("views: open has no dates; others end today", () => {
    const today = new Date(2026, 10, 15);
    assert.equal(viewRange("open", today), null);
    assert.deepEqual(viewRange("today", today), { from: "2026-11-15", to: "2026-11-15" });
    assert.deepEqual(viewRange("last7", today), { from: "2026-11-09", to: "2026-11-15" });
  });
  it("filters by store and type, oldest dispatch first; time on the road stops when received", () => {
    assert.deepEqual(filterTransfers(LIST, {}, NOW).map((t) => [t.slug, t.hours]), [["c", 2.5], ["b", 4], ["a", 2]]);
    assert.deepEqual(filterTransfers(LIST, { store: "outlet:3" }, NOW).map((t) => t.slug), ["c", "a"]);
    assert.deepEqual(filterTransfers(LIST, { type: "GRN" }, NOW).map((t) => t.slug), ["c", "b"]);
  });
  it("tiles sum each status and the shortfalls", () => {
    assert.deepEqual(summarize(LIST), {
      in_transit: { count: 1, value: 1000, boxes: 4 },
      partly: { count: 1, value: 500 },
      received: { count: 1, value: 300 },
      short: { count: 1, units: 4, value: 38.5 },
    });
    assert.equal(statusText("PARTIALLY_RECEIVED"), "Partly received");
    assert.equal(mixText({ invoices: 2, adhoc: 1, sta: 0 }), "2 invoices · 1 ad-hoc");
  });
});
