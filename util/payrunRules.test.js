/**
 * Payrun Initialization - the browser's rules, proved properly.
 *
 *   node --test util/payrunRules.test.js
 *
 * These are the only decisions the Payrun screen makes for itself: who may
 * open it and act on it, and what a selection may be made of. Everything else
 * on that screen - a status, a blocking reason, a gross, a pay type default -
 * is the server's answer and is deliberately not recomputed here, so there is
 * nothing else in the browser to test.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  canOpenPayrun,
  canInitializePayrun,
  canChangePayrunPayType,
  isRowInitializable,
  canSeePayrunMenu,
} = require("./payrunAccess");
const {
  selectableEmployeeIds,
  toggleSelection,
  pruneSelection,
  nextSelectAll,
  isAllSelected,
  confirmationMessage,
  outcomeMessage,
} = require("./payrunSelection");

const actor = (...keys) => ({ permissions: keys.map((k) => ({ permission_key: k })), isAdmin: false });
const ADMIN = { permissions: [], isAdmin: true };

const READ_KEYS = ["view_employees", "view_payroll", "view_salary"];

/* ==================================================================== access */

test("the three read keys open the Payrun, and any two of them do not", () => {
  assert.equal(canOpenPayrun(actor(...READ_KEYS)), true);
  READ_KEYS.forEach((missing) => {
    const kept = READ_KEYS.filter((k) => k !== missing);
    assert.equal(canOpenPayrun(actor(...kept)), false, `${missing} must be required`);
  });
});

test("view_salary is genuinely required - the table shows an approved gross", () => {
  assert.equal(canOpenPayrun(actor("view_employees", "view_payroll")), false);
});

test("an administrator needs no key at all", () => {
  assert.equal(canOpenPayrun(ADMIN), true);
  assert.equal(canInitializePayrun(ADMIN), true);
  assert.equal(canChangePayrunPayType(ADMIN), true);
});

test("initializing takes process_payroll, and reading the month does not grant it", () => {
  assert.equal(canInitializePayrun(actor(...READ_KEYS)), false);
  assert.equal(canInitializePayrun(actor("view_employees", "process_payroll")), true);
});

test("changing a pay type is a SEPARATE decision from initializing", () => {
  const processor = actor("view_employees", "process_payroll");
  assert.equal(canInitializePayrun(processor), true);
  assert.equal(
    canChangePayrunPayType(processor),
    false,
    "running the month must not thereby let somebody redirect every payment in it"
  );

  const payments = actor("view_employees", "change_payrun_pay_type");
  assert.equal(canChangePayrunPayType(payments), true);
  assert.equal(canInitializePayrun(payments), false);
});

test("the menu entry is the read decision, so the screen is useful read-only", () => {
  assert.equal(canSeePayrunMenu(actor(...READ_KEYS)), true);
  assert.equal(canSeePayrunMenu(actor("view_employees")), false);
});

test("a bare permission-key list is read the same as rows of objects", () => {
  assert.equal(canOpenPayrun({ permissions: READ_KEYS }), true);
});

/* ================================================================= the rows */

const row = (over = {}) => ({
  employee_id: 1,
  status: "READY",
  initialized: false,
  blocking_reasons: [],
  ...over,
});

test("only a READY, not-yet-initialized row may be acted on", () => {
  assert.equal(isRowInitializable(row()), true);
  assert.equal(isRowInitializable(row({ status: "BLOCKED" })), false);
  assert.equal(isRowInitializable(row({ status: "INITIALIZED", initialized: true })), false);
  // Belt and braces: a row the server called READY but already flagged as
  // initialized is still not initializable.
  assert.equal(isRowInitializable(row({ initialized: true })), false);
  assert.equal(isRowInitializable(null), false);
});

test("a blocked row can never be selected, by clicking or by Select All Ready", () => {
  const rows = [row({ employee_id: 1 }), row({ employee_id: 2, status: "BLOCKED" }), row({ employee_id: 3, status: "INITIALIZED", initialized: true })];
  assert.deepEqual(selectableEmployeeIds(rows), [1]);
  assert.deepEqual(nextSelectAll(selectableEmployeeIds(rows), []), [1]);
});

test("Select All Ready toggles, and clears when everything ready is ticked", () => {
  assert.deepEqual(nextSelectAll([1, 2], []), [1, 2]);
  assert.deepEqual(nextSelectAll([1, 2], [1, 2]), []);
  assert.equal(isAllSelected([1, 2], [1]), false);
  assert.equal(isAllSelected([], []), false, "nothing selectable is not 'all selected'");
});

test("ticking twice is still one selection, and unticking removes it", () => {
  assert.deepEqual(toggleSelection([1], 1, true), [1]);
  assert.deepEqual(toggleSelection([1], 2, true), [1, 2]);
  assert.deepEqual(toggleSelection([1, 2], 1, false), [2]);
});

test("a selection never outlives the rows it was made on", () => {
  // The row that was just initialized is no longer selectable.
  assert.deepEqual(pruneSelection([1, 2], [2]), [2]);
});

test("pruning returns the SAME array when nothing was dropped - it runs in an effect", () => {
  const selected = [1, 2];
  assert.equal(pruneSelection(selected, [1, 2, 3]), selected, "a new reference every time is a render loop");
});

/* ============================================================= what is said */

test("the confirmation says what initializing MEANS, not just how many", () => {
  const message = confirmationMessage(3);
  assert.match(message, /Initialize 3 employees/);
  assert.match(message, /will not alter the month until it is explicitly recalculated/);
  assert.match(confirmationMessage(1), /Initialize 1 employee\b/);
});

test("a partial outcome is never reported as a success", () => {
  assert.equal(
    outcomeMessage({ initialized_count: 12, blocked_count: 3 }),
    "12 initialized, 3 blocked."
  );
  assert.equal(
    outcomeMessage({ initialized_count: 0, already_initialized_count: 2 }),
    "2 already initialized."
  );
  assert.equal(outcomeMessage({ not_in_scope_count: 1 }), "1 not available to you.");
  assert.equal(outcomeMessage({}), "Nothing was initialized.");
});

test("the reason helper is gone - the badge renders the server's objects directly", () => {
  const selection = require("./payrunSelection");
  assert.equal(
    selection.reasonText,
    undefined,
    "nothing flattens the reasons into a line any more; they are shown one per row"
  );
});
