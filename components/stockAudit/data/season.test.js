/** Season selection rules.  Run: preview/stock-audit/test.sh */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withSeason, pickSeason } from "./season";

describe("every request carries the selected season", () => {
  it("adds ?period= when the request names none", () => {
    assert.deepEqual(withSeason("SEASON-1", undefined), { period: "SEASON-1" });
    assert.deepEqual(withSeason("SEASON-1", { outlet_id: 7 }), { outlet_id: 7, period: "SEASON-1" });
    assert.deepEqual(withSeason("SEASON-1", { period: null, page: 2 }), { period: "SEASON-1", page: 2 });
  });
  it("keeps a period the request names, and adds nothing when no season is selected", () => {
    assert.deepEqual(withSeason("SEASON-2", { period: "SEASON-1" }), { period: "SEASON-1" });
    assert.equal(withSeason(null, undefined), undefined);
    assert.deepEqual(withSeason(null, { page: 1 }), { page: 1 });
  });
});

describe("which season is shown", () => {
  const meta = { current_period: "SEASON-2", seasons: [{ period_code: "SEASON-2" }, { period_code: "SEASON-1" }] };
  it("the one chosen earlier, if it still exists (history for reports)", () => {
    assert.equal(pickSeason(meta, "SEASON-1"), "SEASON-1");
  });
  it("else the current season; a stale choice falls back to it", () => {
    assert.equal(pickSeason(meta, null), "SEASON-2");
    assert.equal(pickSeason(meta, "SEASON-9"), "SEASON-2");
  });
  it("no current season: the newest; no seasons: none", () => {
    assert.equal(pickSeason({ seasons: [{ period_code: "SEASON-3" }, { period_code: "SEASON-2" }] }, null), "SEASON-3");
    assert.equal(pickSeason({ seasons: [] }, "SEASON-1"), null);
  });
});
