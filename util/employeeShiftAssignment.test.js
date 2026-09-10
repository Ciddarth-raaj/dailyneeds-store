/**
 * Employee Shift Assignment — the logic behind the screen.
 *
 *   node --test util/employeeShiftAssignment.test.js
 *
 * These are the parts where being wrong is invisible until it has already
 * happened: the query the list is actually asked for, the sentence the
 * confirmation claims, and what becomes of a selection when the filters move.
 * The last one is the dangerous one — a tick that survives a filter change is
 * a write to somebody the user is no longer looking at.
 */
const test = require("node:test");
const assert = require("node:assert");

const {
  ASSIGNMENT_STATUS_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  DEFAULT_FILTERS,
  workShiftLabel,
  currentWorkShiftLabel,
  workShiftOptions,
  buildListQuery,
  confirmationMessage,
  reconcileSelection,
  toggleSelection,
  selectAll,
  allSelected,
} = require("./employeeShiftAssignment");

/* ================================================== the filter options == */

test("Assignment Status offers exactly All, Unassigned and Assigned", () => {
  assert.deepStrictEqual(
    ASSIGNMENT_STATUS_OPTIONS.map((o) => o.value),
    ["ALL", "UNASSIGNED", "ASSIGNED"]
  );
});

test("UNASSIGNED IS EASY TO REACH — it is the second option, not the last", () => {
  // The initial setup is several hundred people with no work shift. Working
  // through them is the job this screen exists for.
  assert.strictEqual(ASSIGNMENT_STATUS_OPTIONS[1].value, "UNASSIGNED");
  assert.strictEqual(ASSIGNMENT_STATUS_OPTIONS[1].label, "Unassigned");
});

test("employment status matches the HR employee list, and defaults to Active", () => {
  assert.deepStrictEqual(
    EMPLOYMENT_STATUS_OPTIONS.map((o) => o.value),
    ["ACTIVE", "INACTIVE", "ALL"]
  );
  assert.strictEqual(DEFAULT_FILTERS.employment_status, "ACTIVE");
  assert.strictEqual(DEFAULT_FILTERS.assignment_status, "ALL");
});

/* ========================================================= the labels === */

test("a work shift reads SHIFT_CODE - Shift Name", () => {
  assert.strictEqual(
    workShiftLabel({ shift_code: "GS1", shift_name: "9 TO 9" }),
    "GS1 - 9 TO 9"
  );
});

test("a shift missing one half still reads as something", () => {
  assert.strictEqual(workShiftLabel({ shift_name: "9 TO 9" }), "9 TO 9");
  assert.strictEqual(workShiftLabel({ shift_code: "GS1" }), "GS1");
  assert.strictEqual(workShiftLabel(null), "");
});

test("an unassigned employee reads Unassigned, never a blank cell", () => {
  assert.strictEqual(currentWorkShiftLabel({ default_work_shift_id: null }), "Unassigned");
  assert.strictEqual(currentWorkShiftLabel({}), "Unassigned");
  assert.strictEqual(
    currentWorkShiftLabel({
      default_work_shift_id: 4,
      work_shift_code: "GS1",
      work_shift_name: "9 TO 9",
    }),
    "GS1 - 9 TO 9"
  );
});

test("the dropdown offers ACTIVE work shifts only", () => {
  const options = workShiftOptions([
    { work_shift_id: 1, shift_code: "GS1", shift_name: "9 TO 9", active: 1 },
    { work_shift_id: 2, shift_code: "OLD", shift_name: "Retired", active: 0 },
  ]);
  assert.deepStrictEqual(options, [{ value: 1, label: "GS1 - 9 TO 9" }]);
});

test("the dropdown survives a response that is not a list", () => {
  assert.deepStrictEqual(workShiftOptions(null), []);
  assert.deepStrictEqual(workShiftOptions({ code: 403 }), []);
});

/* ========================================================== the query === */

test("the default query asks for active employees and every assignment state", () => {
  assert.deepStrictEqual(buildListQuery(DEFAULT_FILTERS), {
    assignment_status: "ALL",
    employment_status: "ACTIVE",
  });
});

test("chosen filters become the backend's parameter names", () => {
  assert.deepStrictEqual(
    buildListQuery({
      ...DEFAULT_FILTERS,
      store_id: 2,
      department_id: 3,
      designation_id: 4,
      search: "  Ada  ",
      assignment_status: "UNASSIGNED",
      employment_status: "ALL",
    }),
    {
      assignment_status: "UNASSIGNED",
      employment_status: "ALL",
      store_ids: "2",
      department_ids: "3",
      designation_ids: "4",
      search: "Ada",
    }
  );
});

test("an unset filter is omitted rather than sent blank", () => {
  // The backend validates what it receives, and "" is not an outlet id.
  const query = buildListQuery({ ...DEFAULT_FILTERS, store_id: "", search: "   " });
  assert.ok(!("store_ids" in query));
  assert.ok(!("search" in query));
});

/* =================================================== the confirmation === */

test("the confirmation names the count and the shift", () => {
  assert.strictEqual(
    confirmationMessage(24, { shift_code: "GS1", shift_name: "9 TO 9" }),
    "Assign 24 employees to GS1 - 9 TO 9?"
  );
});

test("one employee is not 1 employees", () => {
  assert.strictEqual(
    confirmationMessage(1, { shift_code: "GS1", shift_name: "9 TO 9" }),
    "Assign 1 employee to GS1 - 9 TO 9?"
  );
});

test("the confirmation still reads as a sentence with no shift chosen", () => {
  assert.strictEqual(confirmationMessage(3, null), "Assign 3 employees to this work shift?");
});

/* ====================================================== the selection === */

const ROWS = [{ employee_id: 11 }, { employee_id: 12 }, { employee_id: 13 }];

test("ticking and unticking one row", () => {
  assert.deepStrictEqual(toggleSelection([], 11), [11]);
  assert.deepStrictEqual(toggleSelection([11, 12], 11), [12]);
  // A checkbox value arrives as a string; it must not tick the same person twice.
  assert.deepStrictEqual(toggleSelection([11], "11"), []);
});

test("Select All covers exactly the rows currently listed", () => {
  assert.deepStrictEqual(selectAll(ROWS, true), [11, 12, 13]);
  assert.deepStrictEqual(selectAll(ROWS, false), []);
});

test("allSelected is false when there is nothing to select", () => {
  assert.strictEqual(allSelected([], []), false);
  assert.strictEqual(allSelected([11, 12, 13], ROWS), true);
  assert.strictEqual(allSelected([11], ROWS), false);
});

test("A SELECTION NEVER OUTLIVES THE ROWS IT WAS MADE ON", () => {
  // The filters moved and employee 13 is no longer listed. Keeping the tick
  // would let a confirmation reading "3 employees" write to somebody the user
  // cannot see.
  assert.deepStrictEqual(reconcileSelection([11, 12, 13], [{ employee_id: 11 }]), [11]);
  assert.deepStrictEqual(reconcileSelection([11, 12], []), []);
});

test("reconciling keeps ids that are still there, whatever their type", () => {
  assert.deepStrictEqual(reconcileSelection(["11", 12], ROWS), [11, 12]);
});
