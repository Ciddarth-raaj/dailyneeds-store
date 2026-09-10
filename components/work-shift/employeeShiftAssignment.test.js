/**
 * Employee Shift Assignment — the screen and the API contract behind it.
 *
 *   node --test components/work-shift/employeeShiftAssignment.test.js
 *
 * There is no component renderer wired up in this repo, so these read the
 * sources, the way `workShiftScreens.test.js` does. That suits what needs
 * proving here, which is largely about what is ABSENT: no change to the
 * employee profile, no touch on the legacy shift, no unassign action, and no
 * screen-side permission shortcut that would let a page open and then 403.
 *
 * The arithmetic and payload shapes are tested for real in
 * util/employeeShiftAssignment.test.js, against the module itself.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
/** Comments explain the decisions; only code makes them. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = read("pages/employee-shift-assignment/index.jsx");
const pageCode = strip(page);
const helper = read("helper/employeeWorkShift.js");
const helperCode = strip(helper);
const workShiftHelperCode = strip(read("helper/workShift.js"));
const profile = strip(read("pages/hr/employees/[id].jsx"));
const employeeForm = strip(read("pages/hr/employees/new.jsx"));

/* ================================================== the API contract === */

test("the helper calls exactly the two endpoints the backend defines", () => {
  assert.match(helperCode, /API\.get\("\/hr\/work-shift-assignments"/);
  assert.match(helperCode, /API\.post\("\/hr\/work-shift-assignments\/bulk"/);
});

test("the write sends employee_ids and work_shift_id, and nothing else", () => {
  const body = helperCode.slice(
    helperCode.indexOf("work-shift-assignments/bulk"),
    helperCode.indexOf("then((res)", helperCode.indexOf("work-shift-assignments/bulk"))
  );
  assert.match(body, /employee_ids:\s*employeeIds/);
  assert.match(body, /work_shift_id:\s*workShiftId/);
  // The legacy columns must not appear in a payload from this screen.
  assert.ok(!/\bshift_id\b/.test(body), "the legacy shift_id must not be sent");
  assert.ok(!/shift_code/.test(body), "shift_code must not be sent");
});

test("the shift dropdown asks the backend for ACTIVE shifts", () => {
  assert.match(pageCode, /getWorkShifts\(\{\s*active:\s*true\s*\}\)/);
  assert.match(workShiftHelperCode, /params\s*=\s*active === undefined \? undefined : \{ active: active \? 1 : 0 \}/);
});

test("GET /work-shift is unchanged for callers that pass nothing", () => {
  // The Work Shift Master list needs the inactive shifts too - the switch in
  // its Status column is the only way to bring one back.
  assert.match(workShiftHelperCode, /getWorkShifts:\s*\(\{ active \} = \{\}\)/);
  const list = strip(read("pages/work-shift/index.jsx"));
  assert.match(list, /WorkShiftHelper\.getWorkShifts\(\)/);
});

/* ======================================================== the filters == */

test("the page offers all five filters", () => {
  for (const filter of ["store_id", "department_id", "designation_id", "search", "assignment_status"]) {
    assert.ok(pageCode.includes(filter), `${filter} must be a filter`);
  }
  assert.match(pageCode, /useOutlets\(/);
  assert.match(pageCode, /useDepartments\(/);
  assert.match(pageCode, /useDesignations\(/);
});

test("filtering happens on the SERVER, not by narrowing a full download", () => {
  assert.match(pageCode, /getAssignments\(buildListQuery\(filters\)\)/);
  // The list is every employee. A `.filter(` over rows here would mean the
  // browser had been handed all of them first.
  assert.ok(!/rows\.filter\(/.test(pageCode), "rows must not be filtered client-side");
});

/* ========================================================== the table == */

test("the table shows the approved columns", () => {
  const heading = pageCode.slice(pageCode.indexOf("const heading = {"), pageCode.indexOf("const tableRows"));
  for (const column of [
    "Employee ID",
    "Employee Name",
    "Outlet",
    "Department",
    "Designation",
    "Current Work Shift",
  ]) {
    assert.ok(heading.includes(column), `${column} must be a column`);
  }
  assert.match(heading, /Select all listed employees/, "and a select-all in the header");
});

test("every row carries its own checkbox, and the count is visible", () => {
  assert.match(pageCode, /aria-label=\{`Select \$\{row\.employee_name\}`\}/);
  assert.match(pageCode, /\{selectedIds\.length\} selected/);
});

test("the selection is narrowed whenever the list changes", () => {
  assert.match(pageCode, /setSelectedIds\(\(current\) => reconcileSelection\(current, rows\)\)/);
});

/* ==================================================== the bulk action == */

test("the button says Assign to Selected and is refused without a shift or a selection", () => {
  assert.match(pageCode, /Assign to Selected/);
  assert.match(
    pageCode,
    /isDisabled=\{!canAssign \|\| selectedIds\.length === 0 \|\| !targetShiftId\}/
  );
});

test("NOTHING IS WRITTEN WITHOUT A CONFIRMATION", () => {
  // The button opens the dialog; only the dialog calls the helper.
  assert.match(pageCode, /onClick=\{\(\) => setConfirmOpen\(true\)\}/);
  assert.match(pageCode, /confirmationMessage\(selectedIds\.length, targetShift\)/);
  const assignCalls = pageCode.match(/EmployeeWorkShiftHelper\.assignWorkShift\(/g) || [];
  assert.strictEqual(assignCalls.length, 1, "one call site, inside the confirmed action");
});

test("a successful assignment refreshes the list and clears the selection", () => {
  const success = pageCode.slice(pageCode.indexOf("const assign = async"), pageCode.indexOf("const heading"));
  assert.match(success, /setSelectedIds\(\[\]\)/);
  assert.match(success, /await load\(\)/);
  // A refusal must leave the selection alone so it can be corrected.
  const refusal = success.slice(success.indexOf("if (!res || res.code !== 200)"), success.indexOf("toast({\n        title: `"));
  assert.ok(!/setSelectedIds\(\[\]\)/.test(refusal), "a failed assignment keeps the selection");
});

test("the app's own toast is used for success and for failure", () => {
  assert.match(pageCode, /status:\s*"success"/);
  assert.match(pageCode, /status:\s*"error"/);
  assert.match(pageCode, /useToast\(\)/);
});

/* ================================================== what is NOT here === */

test("THERE IS NO UNASSIGN", () => {
  // Changing a shift means assigning another active one. Clearing a payroll
  // input outright is not part of this phase.
  assert.ok(!/unassign/i.test(pageCode.replace(/isUnassigned/g, "")), "no unassign action");
  assert.ok(!/unassign/i.test(helperCode), "and none in the helper");
});

test("THE EMPLOYEE PROFILE IS UNTOUCHED — the field is not on it yet", () => {
  assert.ok(!/default_work_shift_id/.test(profile), "not on the profile screen");
  assert.ok(!/default_work_shift_id/.test(employeeForm), "not on the create form");
});

test("THE LEGACY SHIFT IS NEVER READ OR WRITTEN BY THIS SCREEN", () => {
  assert.ok(!/shift_master/.test(pageCode));
  // `\b` does not match inside `work_shift_id` or `default_work_shift_id`.
  assert.ok(!/\bshift_id\b/.test(pageCode), "the legacy shift_id must not appear");
  assert.ok(!/helper\/shift/.test(page), "helper/shift.js is not imported");
});

test("THE OLD /shift PAGE IS UNCHANGED", () => {
  const legacy = read("pages/shift/index.js");
  assert.ok(!/default_work_shift_id/.test(legacy), "the legacy screen knows nothing of this");
  assert.ok(!/work-shift-assignments/.test(legacy));
});

/* ====================================================== permissions ==== */

test("the screen asks for BOTH keys, not either", () => {
  // `usePermissions` defaults to ANY. One key here would open a screen whose
  // every request the backend then refuses.
  assert.match(
    pageCode,
    /usePermissions\(\["view_employees",\s*"view_shift"\],\s*\{\s*all:\s*true\s*\}\)/
  );
  assert.match(
    pageCode,
    /usePermissions\(\["employee_edit",\s*"view_shift"\],\s*\{\s*all:\s*true\s*\}\)/
  );
});

test("someone who may look but not change sees the list, with the actions off", () => {
  assert.match(pageCode, /You can see these assignments but not change them/);
  assert.match(pageCode, /isDisabled=\{!canAssign\}/);
});
