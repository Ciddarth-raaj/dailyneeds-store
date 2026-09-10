/**
 * Employee Shift Assignment — the screen.
 *
 *   node --test components/employee-shift-assignment/employeeShiftAssignmentScreen.test.js
 *
 * There is no component renderer wired up in this repo, so these read the
 * sources, the way components/work-shift/workShiftScreens.test.js does. That
 * suits what needs proving here, most of which is about something being
 * ABSENT — the legacy shift untouched, no Employee Profile change, no
 * unassign action — which no single render assertion demonstrates.
 *
 * The arithmetic and the payload shapes are tested for real in
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
const menus = read("constants/menus.js");
const rules = read("util/employeeShiftAssignment.js");

/* ================================== THE LEGACY SHIFT AND THE OLD SCREENS = */

test("THE OLD /shift SCREEN IS NOT TOUCHED", () => {
  // The whole phase rests on the two masters coexisting. This screen must not
  // reach for the legacy one at all.
  assert.ok(!/helper\/shift/.test(pageCode), "helper/shift.js belongs to shift_master");
  assert.ok(!/["'`]\/shift["'`]/.test(pageCode), "no call to the legacy /shift API");
  assert.ok(!/shift_master/.test(pageCode));
});

test("the legacy employee shift fields are never read or written", () => {
  for (const source of [pageCode, helperCode, strip(rules)]) {
    assert.ok(!/\bshift_id\b/.test(source), "shift_id is the legacy mapping");
    assert.ok(!/\bshift_code\b(?!.*work_shift)/.test(source) || !/employee\.shift_code/.test(source));
    assert.ok(!/new_employee\.shift/.test(source));
  }
});

test("the screen writes through the assignment endpoint and no other", () => {
  assert.ok(/employee-work-shift\/bulk-assign/.test(helperCode));
  // Not the employee master's own edit route: that would be an Employee
  // Profile change, which this phase deliberately does not make.
  assert.ok(!/\/hr\/employee\//.test(helperCode), helperCode);
  assert.ok(!/updatedata/.test(helperCode));
});

test("THERE IS NO EMPLOYEE PROFILE CHANGE IN THIS PHASE", () => {
  // The field goes on the profile later. Pinned by asserting the profile
  // screens do not know the column exists.
  for (const rel of ["pages/employee/[id].jsx", "pages/hr/employees/[id].jsx"]) {
    assert.ok(
      !/default_work_shift_id/.test(read(rel)),
      `${rel} must not carry the new field yet`
    );
  }
});

/* ============================================================== the page = */

test("the table shows the approved seven columns, selection included", () => {
  const headers = (pageCode.match(/headerName:\s*"([^"]+)"/g) || []).map((m) =>
    m.slice(13, -1)
  );
  assert.deepStrictEqual(headers, [
    "Employee ID",
    "Employee Name",
    "Outlet",
    "Department",
    "Designation",
    "Current Work Shift",
  ]);
  // The checkbox column is AgGrid's own, from selectMode.
  assert.ok(/selectMode=\{canAssign\}/.test(pageCode), "row selection must be enabled");
});

test("selection is multi-row with Select All over the filtered list", () => {
  // AgGrid supplies `mode: multiRow` and `selectAll: "filtered"` for every
  // consumer of selectMode; this pins that the screen uses that shared
  // behaviour rather than rolling its own.
  const grid = read("components/AgGrid/index.jsx");
  assert.ok(/mode:\s*"multiRow"/.test(grid));
  assert.ok(/selectAll:\s*"filtered"/.test(grid));
  assert.ok(/onSelectionChanged=\{setSelectedRows\}/.test(pageCode));
});

test("rows are identified by employee_id, so selection survives a refresh", () => {
  assert.ok(/getRowId:.*employee_id/s.test(pageCode), pageCode.slice(0, 200));
});

test("the selected count is on screen", () => {
  assert.ok(/\{selectedRows\.length\}\s*selected/.test(pageCode), "HR must see how many");
});

test("all five filters are present", () => {
  assert.ok(/placeholder="All outlets"/.test(pageCode));
  assert.ok(/placeholder="All departments"/.test(pageCode));
  assert.ok(/placeholder="All designations"/.test(pageCode));
  assert.ok(/ASSIGNMENT_STATUS_OPTIONS\.map/.test(pageCode), "assignment status");
  assert.ok(/placeholder="Search employee id or name"/.test(pageCode));
});

test("filtering is server-side, through filtersToQuery", () => {
  // The alternative - fetch everyone and narrow in the browser - gets slower
  // exactly as HR works through the backlog.
  assert.ok(/getEmployees\(filtersToQuery\(filters\)\)/.test(pageCode));
});

test("the search is debounced rather than firing per keystroke", () => {
  assert.ok(/useDebounce\(search,/.test(pageCode));
});

test("the selection is dropped when the filters change", () => {
  assert.ok(/filtersChanged\(previousFilters\.current, filters\)/.test(pageCode));
  assert.ok(/setSelectedRows\(\[\]\)/.test(pageCode));
  assert.ok(/deselectAll\(\)/.test(pageCode), "the grid's own state must be cleared too");
});

/* ------------------------------------------------------------ the action */

test("the dropdown is fed by the ACTIVE-only endpoint, not filtered here", () => {
  assert.ok(/employee-work-shift\/work-shifts/.test(helperCode));
  // A `.filter(s => s.active)` in the page would mean the screen deciding
  // what is assignable; the server decides, and rejects the rest on write.
  assert.ok(!/\.filter\([^)]*active/.test(pageCode), pageCode);
});

test("the dropdown label is SHIFT_CODE - Shift Name", () => {
  assert.ok(/\{workShiftLabel\(shift\)\}/.test(pageCode));
});

test("the button says 'Assign to Selected'", () => {
  assert.ok(/Assign to Selected/.test(pageCode));
});

test("the write is gated on a selection AND a chosen shift", () => {
  assert.ok(
    /canAssign && selectedRows\.length > 0 && Boolean\(selectedWorkShift\)/.test(pageCode)
  );
  assert.ok(/isDisabled=\{!canSubmit\}/.test(pageCode));
});

test("a confirmation stands between the button and the write", () => {
  // The button opens the dialog; only the dialog's own button assigns.
  assert.ok(/onClick=\{confirm\.onOpen\}/.test(pageCode));
  assert.ok(/onClick=\{assign\}/.test(pageCode));
  assert.ok(/confirmationMessage\(selectedRows\.length, selectedWorkShift\)/.test(pageCode));
});

test("on success the list is refreshed and the selection cleared", () => {
  const success = pageCode.slice(pageCode.indexOf("res.code !== 200"));
  assert.ok(/loadEmployees\(\)/.test(success), "the Current Work Shift column must not go stale");
  assert.ok(/deselectAll\(\)/.test(success));
});

test("on a rejection the selection is KEPT, and the rejected ids are shown", () => {
  assert.ok(/rejected_employee_ids/.test(pageCode));
  const upToSuccess = pageCode.slice(0, pageCode.indexOf("assigned to"));
  assert.ok(
    !/setSelectedRows\(\[\]\)/.test(upToSuccess.slice(upToSuccess.indexOf("res.code !== 200"))),
    "an all-or-nothing failure changed nothing, so there is nothing to clear"
  );
});

test("success and failure both use the app's existing toast", () => {
  assert.ok(/status: "success"/.test(pageCode));
  assert.ok(/status: "error"/.test(pageCode));
  assert.ok(/useToast/.test(pageCode));
});

/* -------------------------------------------------------- no unassign yet */

test("THERE IS NO UNASSIGN ACTION, on the screen or in the helper", () => {
  // An assignment is changed by assigning another active shift.
  for (const source of [pageCode, helperCode]) {
    assert.ok(!/unassign/i.test(source), source.slice(0, 120));
    assert.ok(!/clearShift|removeShift/i.test(source));
  }
});

/* ------------------------------------------------- permissions and access */

test("the page is gated on view_employees, and the write on employee_edit", () => {
  assert.ok(/permissionKey=\{\["view_employees"\]\}/.test(pageCode));
  assert.ok(/usePermissions\(\["employee_edit"\]\)/.test(pageCode));
});

test("a 403 is shown as a refusal, never as an empty list", () => {
  assert.ok(/res\.code === 403/.test(pageCode));
  assert.ok(/do not have permission to view employees/.test(pageCode));
});

/* -------------------------------------------------------------- the menu */

test("the page is reachable from the Shifts menu, beside the master", () => {
  assert.ok(/location: "\/employee-shift-assignment"/.test(menus));
  assert.ok(/title: "Employee Shift Assignment"/.test(menus));
  assert.ok(
    /employee_shift_assignment:[\s\S]{0,200}permission: "view_employees"/.test(menus),
    "gated on the key its own list actually requires"
  );
});

test("the legacy /shift screen stays out of the navigation", () => {
  assert.ok(!/location: "\/shift"/.test(menus), "two shift masters in the menu is the trap");
});
