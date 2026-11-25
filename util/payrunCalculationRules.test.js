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

test("a refusal's own reason travels with the toast, first one plus a count", () => {
  assert.equal(rules.refusalDetail(null), null);
  assert.equal(rules.refusalDetail({ results: [{ employee_id: 1, result: "APPROVED", message: "ok" }] }), null);
  const stale = "This employee's attendance days changed after the monthly attendance was calculated.";
  assert.equal(
    rules.refusalDetail({ results: [{ employee_id: 7, result: "BLOCKED", attendance_stale: "DAYS_CHANGED", message: stale }] }),
    `Employee 7: ${stale}`
  );
  assert.equal(
    rules.refusalDetail({
      results: [
        { employee_id: 1, result: "APPROVED", message: "ok" },
        { employee_id: 7, result: "BLOCKED", message: stale },
        { employee_id: 8, result: "FAILED", message: "x" },
        { employee_id: 9, result: "BLOCKED" },
      ],
    }),
    `Employee 7: ${stale} (and 1 more)`
  );
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

/* ============================== attendance that is not settled yet ======== */

/**
 * ATTENDANCE_PENDING IS A STATUS THE BROWSER MIRRORS AND NEVER DERIVES.
 *
 * The server sends it instead of CALCULATED when the attendance the figures
 * were priced from is missing or not final, and sends those figures as null
 * beside it. Everything this module has to get right about it is which actions
 * it fits and what colour the badge is; the decision itself arrives.
 */
test("the browser mirrors the server's status list exactly", () => {
  const fs = require("fs");
  const path = require("path");
  const backend = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "dailyneeds-store-backend",
      "constants",
      "payrun_calculation.js"
    ),
    "utf8"
  );
  const block = backend.match(/const CALC_STATUS = \{([\s\S]*?)\};/);
  assert.ok(block, "the backend's CALC_STATUS is not where it was");
  const serverStatuses = [...block[1].matchAll(/^\s{2}([A-Z_]+):/gm)].map((m) => m[1]);

  assert.deepEqual(
    Object.keys(STATUS).sort(),
    serverStatuses.sort(),
    "the browser's mirror and the server's statuses have drifted"
  );
  assert.ok(serverStatuses.includes("ATTENDANCE_PENDING"));
});

test("a pending-attendance row may be recalculated - it has a calculation", () => {
  assert.equal(rules.isRecalculable(row(1, STATUS.ATTENDANCE_PENDING)), true);
  assert.deepEqual(rules.recalculableEmployeeIds([row(7, STATUS.ATTENDANCE_PENDING)]), [7]);
});

test("a pending-attendance row is never calculable and never approvable", () => {
  assert.equal(rules.isCalculable(row(1, STATUS.ATTENDANCE_PENDING)), false);
  assert.equal(rules.isApprovable(row(1, STATUS.ATTENDANCE_PENDING)), false);
  assert.deepEqual(rules.approvableEmployeeIds([row(1, STATUS.ATTENDANCE_PENDING)]), []);
  assert.equal(rules.isLocked(row(1, STATUS.ATTENDANCE_PENDING)), false);
});

test("its badge is its own colour, not the stale one and not the calculated one", () => {
  const pending = rules.statusScheme(STATUS.ATTENDANCE_PENDING);
  assert.equal(pending, "yellow");
  assert.notEqual(pending, rules.statusScheme(STATUS.RECALCULATION_REQUIRED));
  assert.notEqual(pending, rules.statusScheme(STATUS.CALCULATED));
});

/* ------------------------------------------------------- Reset Calculation */

test("reset is offered wherever a calculation exists and nobody has approved it", () => {
  for (const status of [
    STATUS.CALCULATED,
    STATUS.ATTENDANCE_PENDING,
    STATUS.RECALCULATION_REQUIRED,
    STATUS.READY_FOR_APPROVAL,
  ]) {
    assert.equal(rules.isResettable(row(1, status)), true, status);
  }
  assert.equal(rules.isResettable(row(1, STATUS.NOT_CALCULATED)), false);
  assert.equal(rules.isResettable(row(1, STATUS.APPROVED_LOCKED)), false);
  assert.equal(rules.isResettable(null), false);
});

test("a bulk reset is narrowed to the selected rows that can be reset", () => {
  const rows = [
    row(1, STATUS.READY_FOR_APPROVAL),
    row(2, STATUS.NOT_CALCULATED),
    row(3, STATUS.APPROVED_LOCKED),
    row(4, STATUS.RECALCULATION_REQUIRED),
  ];
  assert.deepEqual(rules.eligibleWithin(rows, [1, 2, 3, 4], rules.isResettable), [1, 4]);
});

test("the reset reasons are exactly the five the server accepts", () => {
  assert.deepEqual(
    rules.RESET_REASON_OPTIONS.map((o) => o.label),
    ["Attendance corrected", "Salary Master corrected", "Wrong OT", "Wrong addition/deduction", "Other"]
  );
});

test("a reset reason is mandatory, and Other needs a remark", () => {
  assert.match(rules.resetFormProblem({ reason: "", remark: "" }), /Choose a reset reason/);
  assert.match(rules.resetFormProblem({ reason: "NOPE", remark: "" }), /Choose a reset reason/);
  assert.match(rules.resetFormProblem({ reason: "OTHER", remark: "   " }), /remark is required/);
  assert.match(rules.resetFormProblem({ reason: "WRONG_OT", remark: "x".repeat(501) }), /at most 500/);
  assert.equal(rules.resetFormProblem({ reason: "OTHER", remark: "DOJ fixed" }), null);
  assert.equal(rules.resetFormProblem({ reason: "WRONG_OT", remark: "" }), null);
});

test("the reset outcome names what was reset and why the rest were skipped", () => {
  assert.equal(
    rules.resetOutcomeMessage({ reset_count: 8, locked_count: 2, results: new Array(10) }),
    "8 reset successfully, 2 skipped — payroll locked."
  );
  assert.equal(
    rules.resetOutcomeMessage({ reset_count: 0, skipped_count: 1, not_in_scope_count: 1, failed_count: 1 }),
    "1 skipped — not calculated, 1 skipped — not in this month or your branches, 1 could not be reset."
  );
  assert.equal(rules.resetHasRefusals({ reset_count: 2, results: [{}, {}] }), false);
  assert.equal(rules.resetHasRefusals({ reset_count: 1, results: [{}, {}] }), true);
  assert.equal(
    rules.resetRefusalDetail({
      results: [
        { employee_id: 1, result: "RESET", message: "ok" },
        { employee_id: 3, employee_name: "Ravi", result: "LOCKED", message: "Payroll is Approved & Locked." },
        { employee_id: 4, result: "LOCKED", message: "Payroll is Approved & Locked." },
      ],
    }),
    "Ravi (3): Payroll is Approved & Locked. (and 1 more)"
  );
});

/* ------------------------------------------------ payroll readiness (shared) */

test("Calculate is offered only where the server says Calculate will accept it", () => {
  assert.equal(rules.isCalculable({ employee_id: 1, status: STATUS.NOT_CALCULATED, calculable: true }), true);
  assert.equal(rules.isCalculable({ employee_id: 1, status: STATUS.NOT_CALCULATED, calculable: false }), false);
  assert.equal(rules.isRecalculable({ employee_id: 1, status: STATUS.ATTENDANCE_PENDING, calculable: false }), false);
  assert.equal(rules.isRecalculable({ employee_id: 1, status: STATUS.RECALCULATION_REQUIRED, calculable: true }), true);
  assert.deepEqual(
    rules.calculableEmployeeIds([
      { employee_id: 1, status: STATUS.NOT_CALCULATED, calculable: true },
      { employee_id: 2, status: STATUS.NOT_CALCULATED, calculable: false },
    ]),
    [1]
  );
});

test("Process Attendance is offered where the server says it would help, never on a locked row", () => {
  assert.equal(rules.isAttendanceProcessable({ status: STATUS.NOT_CALCULATED, attendance_processable: true }), true);
  assert.equal(rules.isAttendanceProcessable({ status: STATUS.NOT_CALCULATED, attendance_processable: false }), false);
  assert.equal(rules.isAttendanceProcessable({ status: STATUS.APPROVED_LOCKED, attendance_processable: true }), false);
  assert.equal(rules.isAttendanceProcessable({ status: STATUS.PUBLISHED, attendance_processable: true }), false);
});

test("the Process Attendance outcome says what cleared and what still needs Attendance", () => {
  assert.equal(
    rules.processOutcomeMessage({ processed_count: 3, cleared_count: 2, skipped_count: 1, results: [] }),
    "3 processed (2 now clear), 1 skipped — needs a fix in Attendance."
  );
  const result = {
    results: [
      { employee_id: 1, result: "PROCESSED", blockers: [], message: "ok" },
      { employee_id: 2, employee_name: "Ravi", result: "SKIPPED", message: "Approved OT is recorded on a day with no NRM" },
    ],
  };
  assert.equal(rules.processHasRefusals(result), true);
  assert.match(rules.processRefusalDetail(result), /^Ravi \(2\): Approved OT is recorded on a day with no NRM$/);
});

/* --------------------------------------------- Unlock / Publish / Unpublish */

test("lifecycle actions follow the server's status; Published is locked but not unlockable", () => {
  const approved = row(1, STATUS.APPROVED_LOCKED);
  const published = row(2, STATUS.PUBLISHED);
  const ready = row(3, STATUS.READY_FOR_APPROVAL);
  assert.equal(rules.isLocked(published), true);
  assert.equal(rules.isUnlockable(approved), true);
  assert.equal(rules.isUnlockable(published), false, "Unpublish first");
  assert.equal(rules.isPublishable(approved), true);
  assert.equal(rules.isPublishable(published), false);
  assert.equal(rules.isUnpublishable(published), true);
  assert.equal(rules.isUnpublishable(approved), false);
  assert.equal(rules.isUnlockable(ready), false);
  assert.equal(rules.isResettable(published), false);
  assert.equal(rules.isRecalculable(published), false);
  assert.deepEqual(rules.eligibleWithin([approved, published, ready], [1, 2, 3], rules.isUnlockable), [1]);
});

test("the lifecycle outcome reads like '18 unlocked, 2 skipped — already published'", () => {
  const result = {
    action: "UNLOCK",
    results: [
      ...Array.from({ length: 18 }, (_, i) => ({ employee_id: i, result: "UNLOCKED" })),
      { employee_id: 40, result: "SKIPPED", message: "Skipped — already published. Unpublish it before unlocking." },
      { employee_id: 41, result: "SKIPPED", message: "Skipped — already published. Unpublish it before unlocking." },
      { employee_id: 42, result: "SKIPPED", message: "Skipped — not approved & locked." },
    ],
  };
  assert.equal(
    rules.lifecycleOutcomeMessage(result),
    "18 unlocked, 2 skipped — already published, 1 skipped — not approved & locked."
  );
  assert.equal(rules.lifecycleHasRefusals(result), true);
  assert.match(rules.lifecycleRefusalDetail(result), /^Employee 40: Skipped — already published/);
  assert.equal(rules.statusScheme(STATUS.PUBLISHED), "blue");
});
