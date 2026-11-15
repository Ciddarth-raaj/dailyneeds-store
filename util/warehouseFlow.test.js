/**
 *   node --test util/warehouseFlow.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { stepRows, stepSummary, rowStatus, ageText, stateText } = require("./warehouseFlow");

const NOW = Date.parse("2026-11-15T06:00:00Z");
const GRN = {
  key: "grn",
  ok: true,
  rows: [
    { ref: "GP-1", store: "outlet:2", since: "2026-11-15T05:00:00Z", grn_started: true },
    { ref: "IN-9", store: "outlet:3", since: "2026-11-13T03:00:00Z", grn_started: false },
    { ref: "GP-3", store: "outlet:2", since: "2026-11-15T05:30:00Z", grn_started: false },
  ],
};

describe("steps", () => {
  it("longest waiting first, aged now, narrowed by store", () => {
    assert.deepEqual(stepRows(GRN, "", NOW).map((r) => [r.ref, r.hours]), [["IN-9", 51], ["GP-1", 1], ["GP-3", 0.5]]);
    assert.deepEqual(stepRows(GRN, "outlet:2", NOW).map((r) => r.ref), ["GP-1", "GP-3"]);
    assert.deepEqual(stepRows(null), []);
  });
  it("a tile counts, finds the oldest, the ones over a day and GRNs started", () => {
    assert.deepEqual(stepSummary(stepRows(GRN, "", NOW)), { count: 3, oldest_hours: 51, over_day: 1, grn_started: 1 });
    assert.deepEqual(stepSummary([]), { count: 0, oldest_hours: null, over_day: 0, grn_started: 0 });
  });
  it("a row's status reads for its step", () => {
    assert.equal(rowStatus("gate_pass", {}), "No inspection yet");
    assert.equal(rowStatus("grn", { grn_started: true }), "GRN started");
    assert.equal(rowStatus("grn", { grn_started: false }), "GRN not started");
    assert.equal(rowStatus("inspection", { state: "IN_PROGRESS" }), "In progress");
    assert.equal(rowStatus("written_off", {}), "Written off");
  });
  it("ages and states read plainly", () => {
    assert.equal(ageText(0.5), "30m");
    assert.equal(ageText(5.25), "5h 15m");
    assert.equal(ageText(51), "2d 3h");
    assert.equal(ageText(null), "—");
    assert.equal(stateText(null), "Started");
  });
});
