/**
 * Employee Shift Assignment — the rules.
 *
 *   node --test util/employeeShiftAssignment.test.js
 *
 * `util/employeeShiftAssignment.js` is CommonJS for the same reason
 * `util/workShiftForm.js` is: it can be required here without a build step.
 *
 * The screen itself is checked in
 * components/employee-shift-assignment/employeeShiftAssignmentScreen.test.js.
 */
const test = require("node:test");
const assert = require("node:assert");

const {
  ASSIGNMENT_STATUS,
  ASSIGNMENT_STATUS_OPTIONS,
  UNASSIGNED_LABEL,
  workShiftLabel,
  currentWorkShiftLabel,
  confirmationMessage,
  buildAssignPayload,
  filtersToQuery,
  filtersChanged,
} = require("./employeeShiftAssignment");

/* ---------------------------------------------------------------- labels */

test("the dropdown label is SHIFT_CODE - Shift Name", () => {
  assert.strictEqual(
    workShiftLabel({ shift_code: "GS1", shift_name: "9 TO 9" }),
    "GS1 - 9 TO 9"
  );
});

test("a half-formed shift row degrades rather than reading 'undefined'", () => {
  assert.strictEqual(workShiftLabel({ shift_code: "GS1" }), "GS1");
  assert.strictEqual(workShiftLabel({ shift_name: "9 TO 9" }), "9 TO 9");
  assert.strictEqual(workShiftLabel({}), "");
  assert.strictEqual(workShiftLabel(null), "");
});

test("an unassigned employee reads as Unassigned, not as blank", () => {
  assert.strictEqual(currentWorkShiftLabel({ default_work_shift_id: null }), UNASSIGNED_LABEL);
  assert.strictEqual(currentWorkShiftLabel({}), UNASSIGNED_LABEL);
  assert.strictEqual(currentWorkShiftLabel(null), UNASSIGNED_LABEL);
});

test("an assigned employee reads as the same label the dropdown uses", () => {
  assert.strictEqual(
    currentWorkShiftLabel({
      default_work_shift_id: 3,
      work_shift_code: "GS1",
      work_shift_name: "9 TO 9",
    }),
    "GS1 - 9 TO 9"
  );
});

test("employee id 0 is not mistaken for unassigned", () => {
  // `== null` rather than falsy: a legitimate id of 0 would otherwise vanish.
  assert.strictEqual(
    currentWorkShiftLabel({
      default_work_shift_id: 0,
      work_shift_code: "GS0",
      work_shift_name: "Night",
    }),
    "GS0 - Night"
  );
});

/* ---------------------------------------------------------- confirmation */

test("the confirmation quotes the count and the shift, as approved", () => {
  assert.strictEqual(
    confirmationMessage(24, { shift_code: "GS1", shift_name: "9 TO 9" }),
    "Assign 24 employees to GS1 - 9 TO 9?"
  );
});

test("the confirmation is singular for one employee", () => {
  assert.strictEqual(
    confirmationMessage(1, { shift_code: "GS1", shift_name: "9 TO 9" }),
    "Assign 1 employee to GS1 - 9 TO 9?"
  );
});

test("the confirmation survives a missing shift without saying 'undefined'", () => {
  assert.strictEqual(
    confirmationMessage(3, null),
    "Assign 3 employees to the selected work shift?"
  );
});

/* -------------------------------------------------------------- payload */

test("the payload is employee_ids and work_shift_id, and nothing else", () => {
  const payload = buildAssignPayload(
    [{ employee_id: 4 }, { employee_id: 7 }],
    9
  );

  assert.deepStrictEqual(Object.keys(payload).sort(), ["employee_ids", "work_shift_id"]);
  assert.deepStrictEqual(payload.employee_ids, [4, 7]);
  assert.strictEqual(payload.work_shift_id, 9);
});

test("the payload carries no legacy shift field", () => {
  const payload = buildAssignPayload([{ employee_id: 4, shift_id: 2, shift_code: "A" }], 9);

  assert.ok(!("shift_id" in payload), "the legacy shift_id must never be sent");
  assert.ok(!("shift_code" in payload), "the legacy shift_code must never be sent");
});

test("duplicate selections are collapsed, so the count matches the dialog", () => {
  const payload = buildAssignPayload(
    [{ employee_id: 4 }, { employee_id: 4 }, { employee_id: 7 }],
    9
  );
  assert.deepStrictEqual(payload.employee_ids, [4, 7]);
});

test("the payload accepts bare ids as well as row objects", () => {
  assert.deepStrictEqual(buildAssignPayload([4, 7], 9).employee_ids, [4, 7]);
});

test("unusable ids are dropped rather than sent as NaN", () => {
  const payload = buildAssignPayload(
    [{ employee_id: 4 }, { employee_id: null }, { employee_id: "" }, {}],
    9
  );
  assert.deepStrictEqual(payload.employee_ids, [4]);
});

/* --------------------------------------------------------------- filters */

test("blank filters are omitted, not sent as empty strings", () => {
  // The backend validates with Joi.number(), which refuses "", so a screen
  // that sent its blanks would 422 on first load.
  assert.deepStrictEqual(
    filtersToQuery({
      store_id: "",
      department_id: "",
      designation_id: "",
      search: "",
      assignment_status: ASSIGNMENT_STATUS.ALL,
    }),
    {}
  );
});

test("set filters are sent, with ids as numbers", () => {
  assert.deepStrictEqual(
    filtersToQuery({
      store_id: "3",
      department_id: "7",
      designation_id: "11",
      search: "  Ada  ",
      assignment_status: ASSIGNMENT_STATUS.UNASSIGNED,
    }),
    {
      store_id: 3,
      department_id: 7,
      designation_id: 11,
      search: "Ada",
      assignment_status: "UNASSIGNED",
    }
  );
});

test("ALL is not sent - it is the backend's default", () => {
  const query = filtersToQuery({ assignment_status: ASSIGNMENT_STATUS.ALL });
  assert.ok(!("assignment_status" in query));
});

test("a whitespace-only search is not a filter", () => {
  assert.deepStrictEqual(filtersToQuery({ search: "   " }), {});
});

/* ------------------------------------------------------ selection safety */

test("any filter change drops the selection", () => {
  const base = {
    store_id: "1",
    department_id: "2",
    designation_id: "3",
    search: "a",
    assignment_status: "ALL",
  };

  for (const key of Object.keys(base)) {
    assert.ok(
      filtersChanged(base, { ...base, [key]: "changed" }),
      `${key} must invalidate the selection`
    );
  }
});

test("an unchanged filter set keeps the selection", () => {
  const base = { store_id: "1", search: "a", assignment_status: "ALL" };
  assert.ok(!filtersChanged(base, { ...base }));
});

test("a filter going from unset to blank is not a change", () => {
  // "" and undefined both mean "no filter", and a re-render that swaps one
  // for the other must not silently clear what the user selected.
  assert.ok(!filtersChanged({ store_id: undefined }, { store_id: "" }));
});

/* --------------------------------------------------------------- options */

test("the assignment status options are All, Assigned, Unassigned", () => {
  assert.deepStrictEqual(
    ASSIGNMENT_STATUS_OPTIONS.map((option) => option.label),
    ["All", "Assigned", "Unassigned"]
  );
  assert.deepStrictEqual(
    ASSIGNMENT_STATUS_OPTIONS.map((option) => option.value),
    ["ALL", "ASSIGNED", "UNASSIGNED"]
  );
});

test("there is no unassign option in this phase", () => {
  const values = ASSIGNMENT_STATUS_OPTIONS.map((o) => o.value).join(" ");
  assert.ok(!/CLEAR|UNASSIGN_ACTION|REMOVE/i.test(values));
});
