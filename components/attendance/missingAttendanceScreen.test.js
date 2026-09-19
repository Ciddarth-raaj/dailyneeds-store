/**
 * The Missing Attendance Report screen.
 *
 *   node --test components/attendance/missingAttendanceScreen.test.js
 *
 * No component renderer is wired up in this repo, so this reads the sources
 * the way `components/attendance/attendanceScreens.test.js` does. What is
 * defended is the shape the approved report has to keep:
 *
 *   - the screen re-states NO part of the rule: no punch-count arithmetic, no
 *     employment dates, no "today" comparison. All of that is the server's,
 *     and the SAME server rule drives the 06:00 Telegram alert.
 *   - every required filter and every required column is present
 *   - the export is the SERVER's xlsx with the SAME filters, not the grid's
 *     client-side export of whatever happens to be on screen
 *   - both permission keys exist, are wired to the page and the button, and
 *     the navigation entry is behind the read key
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/attendance/missing-attendance/index.jsx"));
const util = strip(read("util/attendanceMissing.js"));
const helper = strip(read("helper/attendanceMissing.js"));
const menus = read("constants/menus.js");
const permissions = read("constants/permissions.js");

test("the screen re-states no part of the Missing Attendance rule", () => {
  const browserCode = `${page}\n${util}\n${helper}`;
  // The whole point: one definition, on the server. A `% 2` in the browser is
  // a second one, and it would be the copy that disagrees with the message an
  // employee was sent at 06:00.
  assert.ok(!/%\s*2/.test(browserCode), "the browser tests the punch count itself");
  assert.ok(
    !/attendance_required/.test(browserCode),
    "the browser decides attendance eligibility itself"
  );
  assert.ok(
    !/resignation_date|date_of_joining|joined_on/.test(browserCode),
    "the browser decides employment dates itself"
  );
  // The status string is rendered as the server sent it.
  assert.ok(
    !/"Missing Attendance"/.test(browserCode),
    "the browser writes the status string instead of rendering row.status"
  );
});

test("every required filter is on the screen", () => {
  ["from_date", "to_date", "store_id", "department_id", "employee_id", "work_shift_id"].forEach(
    (filter) => {
      assert.ok(page.includes(filter), `the ${filter} filter is missing`);
    }
  );
  assert.match(page, /FormLabel[^>]*>Outlet</);
  assert.match(page, /FormLabel[^>]*>Department</);
  assert.match(page, /FormLabel[^>]*>Shift</);
  assert.match(page, /DateRangeFilter/);
});

test("the shift filter offers the WORK SHIFT master, not the legacy shift", () => {
  assert.ok(page.includes("useWorkShiftOptions"), "the new work-shift options are not used");
  assert.ok(!page.includes("useShifts"), "the legacy shift master is offered instead");
});

test("every required column is defined, in the approved order", () => {
  const headers = [...util.matchAll(/header:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(headers, [
    "Date",
    "Employee ID",
    "Employee Name",
    "Outlet",
    "Department",
    "Designation",
    "Shift",
    "Punch Count",
    "Punch Times",
    "Status",
    "Correction Requested",
  ]);
});

test("the export is the server's xlsx, with the same filters, and never the grid's", () => {
  assert.match(helper, /export\.xlsx/);
  assert.match(helper, /responseType:\s*"blob"/);
  // The SAME query builder feeds the table and the export.
  assert.match(page, /AttendanceMissingHelper\.exportXlsx\(buildQuery\(filters\)\)/);
  assert.match(page, /AttendanceMissingHelper\.getReport\(buildQuery\(next\)\)/);
  // The grid's own client-side export is turned off, so nobody can download
  // a file the server's permission and branch scope never approved.
  assert.match(page, /hideExport/);
});

test("both permission keys gate the screen and the button", () => {
  assert.match(page, /usePermissions\(\["view_missing_attendance_report"\]\)/);
  assert.match(page, /usePermissions\(\["export_missing_attendance_report"\]\)/);
  // The button is hidden without the export key - and the server checks again.
  assert.match(page, /canExport \?/);
  // No write control of any kind on a report.
  assert.ok(!/\.post\(|\.put\(|\.delete\(/.test(`${page}${helper}`), "the report writes");
});

test("the permission keys are declared for the rights screen", () => {
  assert.match(permissions, /view_missing_attendance_report:\s*"View Missing Attendance Report"/);
  assert.match(permissions, /export_missing_attendance_report:\s*"Export Missing Attendance Report"/);
});

test("the navigation entry sits in Attendance, behind the read key", () => {
  const attendance = menus.slice(
    menus.indexOf("attendance: {"),
    menus.indexOf("// M4 — Payroll")
  );
  assert.match(
    attendance,
    /missing_attendance_report:\s*\{[\s\S]*?title:\s*"Missing Attendance Report"[\s\S]*?permission:\s*"view_missing_attendance_report"[\s\S]*?location:\s*"\/attendance\/missing-attendance"/
  );
});

test("the screen says out loud that today is never included", () => {
  assert.match(util, /never includes today|never included/i);
  assert.ok(page.includes("windowNote"), "the clamped-window note is not shown");
});
