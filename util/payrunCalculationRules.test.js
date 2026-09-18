/**
 * Payrun Calculation & Review - the browser's pure parts.
 *
 *   node --test util/payrunCalculationRules.test.js
 *
 * WHAT IS PROVED HERE IS SELECTION AND WORDING, and that is the whole of what
 * `util/payrunCalculation.js` contains. There is no formula in that module and
 * there is no test for one here: every figure on the screen is the server's,
 * and the test that matters about that is the one asserting the module holds
 * no arithmetic at all - see `components/payroll/payrunCalculationScreens.test.js`.
 */
const test = require("node:test");
const assert = require("node:assert");

const rules = require("./payrunCalculation");
const { STATUS } = rules;

const row = (employee_id, status) => ({ employee_id, status });

/* ------------------------------------------------- which rows an action fits */

test("only an uncalculated row may be calculated", () => {
  assert.equal(rules.isCalculable(row(1, STATUS.NOT_CALCULATED)), true);
  assert.equal(rules.isCalculable(row(1, STATUS.CALCULATED)), false);
  assert.equal(rules.isCalculable(row(1, STATUS.APPROVED_LOCKED)), false);
});

/**
 * RECALCULATE IS OFFERED ON ANYTHING CALCULATED AND NOT LOCKED, not only on
 * the stale ones - refreshing a calculation that has not drifted produces the
 * same figures and costs nothing.
 */
test("a calculated, stale or ready row may be recalculated; a locked one may not", () => {
  assert.equal(rules.isRecalculable(row(1, STATUS.CALCULATED)), true);
  assert.equal(rules.isRecalculable(row(1, STATUS.RECALCULATION_REQUIRED)), true);
  assert.equal(rules.isRecalculable(row(1, STATUS.READY_FOR_APPROVAL)), true);
  assert.equal(rules.isRecalculable(row(1, STATUS.APPROVED_LOCKED)), false);
  assert.equal(rules.isRecalculable(row(1, STATUS.NOT_CALCULATED)), false);
});

/**
 * ONLY A READY ROW MAY BE APPROVED, and the SERVER'S verdict decides it. A
 * stale row is not approvable however complete it looks, which is the rule the
 * whole stage turns on.
 */
test("only a READY_FOR_APPROVAL row may be approved", () => {
  assert.equal(rules.isApprovable(row(1, STATUS.READY_FOR_APPROVAL)), true);
  for (const status of [
    STATUS.NOT_CALCULATED,
    STATUS.CALCULATED,
    STATUS.RECALCULATION_REQUIRED,
    STATUS.APPROVED_LOCKED,
  ]) {
    assert.equal(rules.isApprovable(row(1, status)), false, status);
  }
});

test("a locked row is recognised as frozen", () => {
  assert.equal(rules.isLocked(row(1, STATUS.APPROVED_LOCKED)), true);
  assert.equal(rules.isLocked(row(1, STATUS.READY_FOR_APPROVAL)), false);
});

test("the id lists carry exactly the rows their predicate accepts", () => {
  const rows = [
    row(1, STATUS.NOT_CALCULATED),
    row(2, STATUS.CALCULATED),
    row(3, STATUS.RECALCULATION_REQUIRED),
    row(4, STATUS.READY_FOR_APPROVAL),
    row(5, STATUS.APPROVED_LOCKED),
  ];
  assert.deepEqual(rules.calculableEmployeeIds(rows), [1]);
  assert.deepEqual(rules.recalculableEmployeeIds(rows), [2, 3, 4]);
  assert.deepEqual(rules.approvableEmployeeIds(rows), [4]);
});

/**
 * ONE SELECTION SERVES THREE BUTTONS, and each sends only the rows it would
 * actually apply to. Sending the whole selection to each would mean every bulk
 * action coming back with refusals somebody could have been told about first.
 */
test("a selection is narrowed per action, not sent whole to each", () => {
  const rows = [
    row(1, STATUS.NOT_CALCULATED),
    row(2, STATUS.CALCULATED),
    row(3, STATUS.READY_FOR_APPROVAL),
    row(4, STATUS.APPROVED_LOCKED),
  ];
  const selected = [1, 2, 3, 4];
  assert.deepEqual(rules.eligibleWithin(rows, selected, rules.isRecalculable), [2, 3]);
  assert.deepEqual(rules.eligibleWithin(rows, selected, rules.isApprovable), [3]);
});

/* -------------------------------------------------------------- selection */

test("selection toggles, prunes and selects all", () => {
  assert.deepEqual(rules.toggleSelection([1], 2, true), [1, 2]);
  assert.deepEqual(rules.toggleSelection([1, 2], 1, false), [2]);
  assert.deepEqual(rules.pruneSelection([1, 2, 3], [1, 3]), [1, 3]);
  assert.equal(rules.isAllSelected([1, 2], [1, 2]), true);
  assert.equal(rules.isAllSelected([], []), false, "an empty list is not 'all selected'");
  assert.deepEqual(rules.nextSelectAll([1, 2], []), [1, 2]);
  assert.deepEqual(rules.nextSelectAll([1, 2], [1, 2]), []);
});

/* --------------------------------------------------------------- wording */

/**
 * THE APPROVAL DIALOG SAYS WHAT IS IRREVERSIBLE, and says that it applies to
 * the selected employees only. Both halves matter: the first is what somebody
 * should read before signing off pay, the second is what stops them believing
 * they have just frozen the whole month.
 */
test("the approval dialog names the lock and its scope", () => {
  const message = rules.approveMessage(84);
  assert.match(message, /84 employees/);
  assert.match(message, /locks/i);
  assert.match(message, /cannot be recalculated/i);
  assert.match(message, /adjustments cannot be edited/i);
  assert.match(message, /pay type cannot be changed/i);
  assert.match(message, /Everybody else in the month is unaffected/i);
  assert.match(rules.approveMessage(1), /this employee/);
});

/** THE RECALCULATE DIALOG SAYS WHAT IS REFRESHED **AND WHAT IS KEPT**. */
test("the recalculate dialog promises the adjustments and pay type are kept", () => {
  const message = rules.recalculateMessage(3);
  assert.match(message, /salary/i);
  assert.match(message, /attendance/i);
  assert.match(message, /approved OT/i);
  assert.match(message, /effective NRM/i);
  assert.match(message, /kept/i);
  assert.match(message, /Balance\s+Advance/i);
  assert.match(message, /pay type/i);
});

/**
 * A PARTIAL OUTCOME IS REPORTED AS ONE. "12 approved" on a run where three
 * were not ready is a lie by omission, and the three would sit there until
 * somebody noticed.
 */
test("a bulk outcome names every part of what happened", () => {
  const message = rules.outcomeMessage({
    approved_count: 12,
    blocked_count: 3,
    already_locked_count: 1,
  });
  assert.match(message, /12 approved and locked/);
  assert.match(message, /3 not ready/);
  assert.match(message, /1 already locked/);

  assert.equal(rules.outcomeMessage({}), "Nothing was changed.");
  assert.equal(rules.outcomeMessage(null), "Nothing was changed.");
});

test("refusals in a result are noticed", () => {
  assert.equal(rules.hasRefusals({ approved_count: 5 }), false);
  assert.equal(rules.hasRefusals({ approved_count: 5, blocked_count: 1 }), true);
  assert.equal(rules.hasRefusals({ failed_count: 1 }), true);
  assert.equal(rules.hasRefusals({ locked_count: 1 }), true);
  assert.equal(rules.hasRefusals({ not_in_scope_count: 1 }), true);
});

test("every status has a badge colour, and stale is not the same as ready", () => {
  assert.notEqual(
    rules.statusScheme(STATUS.RECALCULATION_REQUIRED),
    rules.statusScheme(STATUS.READY_FOR_APPROVAL)
  );
  for (const status of Object.values(STATUS)) {
    assert.equal(typeof rules.statusScheme(status), "string");
  }
});
