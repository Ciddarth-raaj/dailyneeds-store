/**
 *   node --test util/warehouseFlow.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { gatePasses, gatePassSummary, ageText, stateText } = require("./warehouseFlow");

const STAGE = {
  key: "gate_pass",
  ok: true,
  rows: [
    { slug: "GP-1", store: "outlet:3", entry_time: "2026-11-15T05:00:00Z", inspections: [] },
    { slug: "GP-2", store: "outlet:2", entry_time: "2026-11-13T03:00:00Z", inspections: [{ slug: "IN-1", state: "IN_PROGRESS" }] },
    { slug: "GP-3", store: "outlet:2", entry_time: "2026-11-15T05:30:00Z", inspections: [] },
  ],
};
const NOW = Date.parse("2026-11-15T06:00:00Z");

describe("gate pass stage", () => {
  it("oldest first, aged now, inspecting once an inspection exists", () => {
    const rows = gatePasses(STAGE, "", NOW);
    assert.deepEqual(rows.map((r) => [r.slug, r.open_hours, r.inspecting]), [
      ["GP-2", 51, true],
      ["GP-1", 1, false],
      ["GP-3", 0.5, false],
    ]);
    assert.deepEqual(gatePasses(STAGE, "outlet:3", NOW).map((r) => r.slug), ["GP-1"]);
    assert.deepEqual(gatePasses(null), []);
  });
  it("the tile counts open, waiting, over a day and the oldest", () => {
    assert.deepEqual(gatePassSummary(gatePasses(STAGE, "", NOW)), { count: 3, waiting: 2, over_day: 1, oldest_hours: 51 });
    assert.deepEqual(gatePassSummary([]), { count: 0, waiting: 0, over_day: 0, oldest_hours: null });
  });
  it("ages and states read plainly", () => {
    assert.equal(ageText(0.5), "30m");
    assert.equal(ageText(5.25), "5h 15m");
    assert.equal(ageText(51), "2d 3h");
    assert.equal(ageText(null), "—");
    assert.equal(stateText("IN_PROGRESS"), "In progress");
    assert.equal(stateText(null), "Started");
  });
});
