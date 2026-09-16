/**
 * node --test util/employeeBulkUpdate.test.mjs
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildExpectedBefore,
  exportErrorMessage,
  canConfirm,
} from "./employeeBulkUpdate.js";

describe("the staleness echo sent at confirm time", () => {
  it("carries every previewed row's current values, keyed by row number", () => {
    const preview = {
      rows: [
        { row_number: 1, expected_before: { grade: "B", store_id: 1 } },
        { row_number: 2, expected_before: { date_of_joining: "2024-06-01" } },
      ],
    };
    assert.deepEqual(buildExpectedBefore(preview), [
      { row_number: 1, expected_before: { grade: "B", store_id: 1 } },
      { row_number: 2, expected_before: { date_of_joining: "2024-06-01" } },
    ]);
  });

  it("sends the server's values UNTOUCHED, so the check cannot be defeated here", () => {
    const expected = { grade: "B" };
    const out = buildExpectedBefore({ rows: [{ row_number: 1, expected_before: expected }] });
    assert.deepEqual(out[0].expected_before, expected);
  });

  it("keeps an unchanged row in the envelope rather than dropping it", () => {
    const out = buildExpectedBefore({
      rows: [
        { row_number: 1, expected_before: {} },
        { row_number: 2, expected_before: { grade: "A" } },
      ],
    });
    assert.equal(out.length, 2);
    assert.deepEqual(out[0], { row_number: 1, expected_before: {} });
  });

  it("is an empty envelope for an absent or empty preview, never undefined", () => {
    assert.deepEqual(buildExpectedBefore(null), []);
    assert.deepEqual(buildExpectedBefore({}), []);
  });
});

describe("a failed export download", () => {
  it("is recognised as JSON and its message read out, not saved as a spreadsheet", () => {
    assert.equal(
      exportErrorMessage("application/json", JSON.stringify({ code: 403, msg: "Not your branch" })),
      "Not your branch"
    );
  });

  it("falls back to a generic message when the JSON body says nothing useful", () => {
    assert.equal(exportErrorMessage("application/json", "{}"), "The export could not be produced");
    assert.equal(exportErrorMessage("application/json", "not json"), "The export could not be produced");
  });

  it("lets a genuine spreadsheet through", () => {
    assert.equal(
      exportErrorMessage(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ""
      ),
      null
    );
    assert.equal(exportErrorMessage("", ""), null);
    assert.equal(exportErrorMessage(undefined, ""), null);
  });
});

describe("the Confirm button's enabled state", () => {
  it("is off while any row has a blocking error", () => {
    assert.equal(canConfirm({ error_rows: 1, rows_with_changes: 5 }), false);
  });

  it("is off when nothing would change", () => {
    assert.equal(canConfirm({ error_rows: 0, rows_with_changes: 0 }), false);
  });

  it("is on for a clean file with changes", () => {
    assert.equal(canConfirm({ error_rows: 0, rows_with_changes: 3 }), true);
  });

  it("does NOT block on warnings - a name mismatch is for a human to judge", () => {
    assert.equal(canConfirm({ error_rows: 0, warning_rows: 4, rows_with_changes: 4 }), true);
  });

  it("is off with no preview at all", () => {
    assert.equal(canConfirm(null), false);
  });
});
