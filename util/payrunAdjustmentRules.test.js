/**
 * Payrun Adjustments V1 - the browser's pure rules.
 *
 *   node --test util/payrunAdjustmentRules.test.js
 *
 * These are the decisions the screen makes on its own: which rows a tick may
 * cover, whether Save Adjustments may be pressed, and what somebody is told
 * after a save. Everything else on that screen is the server's answer, and
 * `components/payroll/payrunAdjustmentScreens.test.js` proves the screen does
 * not second-guess it.
 */
const test = require("node:test");
const assert = require("node:assert");

const {
  STATE,
  isConfirmable,
  confirmableEmployeeIds,
  toggleSelection,
  pruneSelection,
  isAllSelected,
  nextSelectAll,
  confirmNoAdjustmentMessage,
  canSaveImport,
  saveOutcomeMessage,
  previewTabs,
  rowsForTab,
  progressOf,
} = require("./payrunAdjustments");

const row = (employee_id, adjustment_state) => ({ employee_id, adjustment_state });

/* ================================================ who may be confirmed */

test("only a PENDING employee may be ticked for a No Adjustment confirmation", () => {
  assert.strictEqual(isConfirmable(row(1, STATE.NO_ADJUSTMENT_PENDING_CONFIRMATION)), true);
  assert.strictEqual(isConfirmable(row(2, STATE.HAS_ADJUSTMENT)), false);
  assert.strictEqual(isConfirmable(row(3, STATE.NO_ADJUSTMENT_CONFIRMED)), false);
  assert.strictEqual(isConfirmable(null), false);
  assert.strictEqual(isConfirmable({}), false);
});

test("the tick is decided by the SERVER's state, never by the amounts on screen", () => {
  // A row the server calls pending stays tickable whatever numbers are beside
  // it, and a row it calls HAS_ADJUSTMENT is not tickable even with no amounts
  // - re-deriving the state here would be a second copy of the state machine.
  const withNumbers = {
    employee_id: 9,
    adjustment_state: STATE.NO_ADJUSTMENT_PENDING_CONFIRMATION,
    amounts: { INCENTIVE: 500 },
  };
  assert.strictEqual(isConfirmable(withNumbers), true);
  const withoutNumbers = { employee_id: 10, adjustment_state: STATE.HAS_ADJUSTMENT, amounts: {} };
  assert.strictEqual(isConfirmable(withoutNumbers), false);
});

test("select all covers exactly the pending rows on screen", () => {
  const rows = [
    row(1, STATE.NO_ADJUSTMENT_PENDING_CONFIRMATION),
    row(2, STATE.HAS_ADJUSTMENT),
    row(3, STATE.NO_ADJUSTMENT_CONFIRMED),
    row(4, STATE.NO_ADJUSTMENT_PENDING_CONFIRMATION),
  ];
  assert.deepStrictEqual(confirmableEmployeeIds(rows), [1, 4]);
});

test("a selection never outlives the rows it was made on", () => {
  assert.deepStrictEqual(pruneSelection([1, 2, 3], [1, 3]), [1, 3]);
  assert.deepStrictEqual(pruneSelection([1], []), []);
});

test("ticking, unticking and select-all behave", () => {
  assert.deepStrictEqual(toggleSelection([], 5, true), [5]);
  assert.deepStrictEqual(toggleSelection([5], 5, false), []);
  assert.deepStrictEqual(toggleSelection([5], 5, true), [5], "no duplicates");
  assert.strictEqual(isAllSelected([1, 2], [1, 2]), true);
  assert.strictEqual(isAllSelected([], []), false, "nothing selectable is not 'all selected'");
  assert.deepStrictEqual(nextSelectAll([1, 2], []), [1, 2]);
  assert.deepStrictEqual(nextSelectAll([1, 2], [1, 2]), []);
});

test("the confirmation dialog says what is being ASSERTED, not just a count", () => {
  const one = confirmNoAdjustmentMessage(1);
  assert.match(one, /NO adjustment/);
  assert.match(one, /recorded against your name/);
  const many = confirmNoAdjustmentMessage(84);
  assert.match(many, /84 employees/);
  assert.match(many, /recorded against your name/);
});

/* ============================================== the import's Save button */

test("Save Adjustments honours the server's own gate", () => {
  assert.strictEqual(canSaveImport({ can_confirm: true }), true);
  assert.strictEqual(canSaveImport({ can_confirm: false, invalid_rows: 0, with_adjustments: 5 }), false);
  assert.strictEqual(canSaveImport(null), false);
});

test("Save Adjustments is unavailable while a row is invalid, or with nothing to apply", () => {
  assert.strictEqual(canSaveImport({ invalid_rows: 1, with_adjustments: 5 }), false);
  assert.strictEqual(canSaveImport({ invalid_rows: 0, with_adjustments: 0 }), false);
  assert.strictEqual(canSaveImport({ invalid_rows: 0, with_adjustments: 1 }), true);
});

test("THE SAVE MESSAGE SAYS BLANKS DID NOT CONFIRM ANYBODY", () => {
  const message = saveOutcomeMessage({ employees_written: 200, pending_confirmation_after_save: 23 });
  assert.match(message, /200 employees/);
  assert.match(message, /23 employees are still awaiting/);
  assert.match(message, /does not confirm anybody/);
});

test("a finished save says so without inventing a warning", () => {
  const message = saveOutcomeMessage({ employees_written: 1, pending_confirmation_after_save: 0 });
  assert.match(message, /1 employee\./);
  assert.match(message, /Nothing is awaiting confirmation/);
});

/* ================================================== the preview sections */

test("the preview has the three sections the specification names, with counts", () => {
  const tabs = previewTabs({ with_adjustments: 3, no_adjustment_pending_confirmation: 7, invalid_rows: 1 });
  assert.deepStrictEqual(
    tabs.map((t) => t.label),
    ["With Adjustments", "No Adjustment", "Invalid Rows"]
  );
  assert.deepStrictEqual(tabs.map((t) => t.count), [3, 7, 1]);
});

test("the sections group by the SERVER's per-row verdict", () => {
  const preview = {
    rows: [
      { row_number: 2, outcome: "WITH_ADJUSTMENT" },
      { row_number: 3, outcome: "NO_ADJUSTMENT_PENDING" },
      { row_number: 4, outcome: "INVALID" },
    ],
  };
  assert.deepStrictEqual(rowsForTab(preview, "WITH_ADJUSTMENTS").map((r) => r.row_number), [2]);
  assert.deepStrictEqual(rowsForTab(preview, "NO_ADJUSTMENT").map((r) => r.row_number), [3]);
  assert.deepStrictEqual(rowsForTab(preview, "INVALID").map((r) => r.row_number), [4]);
});

/* ================================================= the month's progress */

test("progress is read off the server's summary and never recounted", () => {
  const progress = progressOf({
    initialized_count: 223,
    completed_count: 220,
    pending_adjustment_confirmation_count: 3,
  });
  assert.strictEqual(progress.initialized, 223);
  assert.strictEqual(progress.completed, 220);
  assert.strictEqual(progress.pending, 3);
  assert.strictEqual(progress.isComplete, false);
  assert.strictEqual(progress.percent, 99);
});

test("the stage is complete only when NOTHING is pending", () => {
  assert.strictEqual(
    progressOf({
      initialized_count: 220,
      completed_count: 220,
      pending_adjustment_confirmation_count: 0,
    }).isComplete,
    true
  );
});

test("an empty month is not 'complete' - there is nothing to be complete about", () => {
  assert.strictEqual(progressOf({}).isComplete, false);
  assert.strictEqual(progressOf(undefined).percent, 0);
});

test("THREE NEWLY INITIALIZED EMPLOYEES RE-OPEN A FINISHED MONTH", () => {
  // The server recounts from the current initialized population; the header
  // simply reports it, which is why this needs nothing but the new numbers.
  const before = progressOf({
    initialized_count: 220,
    completed_count: 220,
    pending_adjustment_confirmation_count: 0,
  });
  assert.strictEqual(before.isComplete, true);
  const after = progressOf({
    initialized_count: 223,
    completed_count: 220,
    pending_adjustment_confirmation_count: 3,
  });
  assert.strictEqual(after.isComplete, false);
  assert.strictEqual(after.pending, 3);
});
