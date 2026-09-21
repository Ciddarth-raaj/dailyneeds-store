/**
 * The Shift Change Eligibility Report screen.
 *
 *   node --test components/attendance/shiftChangeEligibilityScreen.test.js
 *
 * No component renderer is wired up in this repo, so this reads the sources
 * the way `components/attendance/missingAttendanceScreen.test.js` does. What
 * is defended is the shape the approved report has to keep:
 *
 *   - the browser re-states NO part of the eligibility rule: no NRM
 *     comparison, no backdating window, no payroll-lock test, no employment
 *     dates. All of that is the server's, and the SAME server rule accepts or
 *     refuses the employee's own request.
 *   - "Can Raise" and "Worked Longer" are kept as SEPARATE columns, and the
 *     browser never derives one from the other
 *   - every required filter and every required column is present, named
 *     unambiguously
 *   - the default view is HR's actionable question, and it can be cleared
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

const page = strip(read("pages/attendance/shift-change-eligibility/index.jsx"));
const util = strip(read("util/attendanceShiftChangeEligibility.js"));
const helper = strip(read("helper/attendanceShiftChangeEligibility.js"));
const menus = read("constants/menus.js");
const permissions = read("constants/permissions.js");

const browserCode = `${page}\n${util}\n${helper}`;

test("the browser re-states no part of the shift change eligibility rule", () => {
  // The whole point: one definition, on the server. Any of these in the
  // browser would be a second one, and it would be the copy that disagrees
  // with the request the employee actually files.
  assert.ok(
    !/nrm_minutes\s*[<>]/.test(browserCode),
    "the browser compares shift NRMs itself"
  );
  assert.ok(
    !/MAX_BACKDATE|45|backdat/i.test(browserCode.replace(/maxW="\d+px"|minWidth:\s*\d+/g, "")),
    "the browser tests the backdating window itself"
  );
  assert.ok(
    !/payroll_locked|PAYROLL_LOCK/.test(browserCode),
    "the browser decides the payroll lock itself"
  );
  assert.ok(
    !/resignation_date|date_of_joining|joined_on/.test(browserCode),
    "the browser decides employment dates itself"
  );
  // The reason sentence is rendered as the server wrote it.
  assert.ok(
    !/Temporary shift requests are only allowed/.test(browserCode),
    "the browser writes the refusal sentence instead of rendering row.eligibility_reason"
  );
});

test("Can Raise and Worked Longer are separate, and neither is derived from the other", () => {
  // `yesNo` is the ONLY transformation either of them gets.
  assert.match(util, /can_raise_label:\s*yesNo\(row\.can_raise\)/);
  assert.match(util, /worked_longer_label:\s*yesNo\(row\.worked_longer\)/);
  // Nothing anywhere combines them into a third verdict.
  assert.ok(
    !/can_raise\s*&&\s*row\.worked_longer|worked_longer\s*&&\s*row\.can_raise/.test(
      browserCode.replace(/actionable_count[\s\S]{0,80}/g, "")
    ),
    "the browser folds the two questions into one"
  );
  // And worked minutes are never compared to anything here.
  assert.ok(
    !/worked_minutes\s*[<>]/.test(browserCode),
    "the browser decides 'worked longer' itself"
  );
});

test("every required filter is on the screen", () => {
  ["from_date", "to_date", "store_id", "designation_id", "employee_id", "can_raise", "worked_longer", "request_status"].forEach(
    (filter) => {
      assert.ok(page.includes(filter), `the ${filter} filter is missing`);
    }
  );
  assert.match(page, /FormLabel[^>]*>Outlet</);
  assert.match(page, /FormLabel[^>]*>Designation</);
  assert.match(page, /FormLabel[^>]*>Can Raise\?</);
  assert.match(page, /FormLabel[^>]*>Worked Longer\?</);
  assert.match(page, /FormLabel[^>]*>Request Status</);
  assert.match(page, /DateRangeFilter/);
});

test("the outlet and designation filters reuse the existing shared pickers", () => {
  assert.ok(page.includes("useOutlets"), "the shared outlet picker is not used");
  assert.ok(page.includes("useDesignations"), "the shared designation picker is not used");
});

test("every required column is defined, in the approved order and unambiguously named", () => {
  const headers = [...util.matchAll(/header:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(headers, [
    "Date",
    "Employee ID",
    "Employee Name",
    "Outlet",
    "Designation",
    "Assigned Shift",
    "Actual First Punch",
    "Actual Last Punch",
    "Worked Hours",
    "Extra Hours",
    "Can Raise Shift Change?",
    "Worked Longer Than Assigned Shift?",
    "Eligibility Reason",
    "Request Status",
    "Request ID",
    "Action",
  ]);
  // The renamed columns say exactly which question they answer - a bare
  // "Eligible?" is what sent somebody to ask HR what it meant.
  assert.ok(!headers.includes("Eligible?"), "an ambiguous column name is back");
});

test("the request status vocabulary is the server's four words", () => {
  const labels = [...util.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  ["Not Raised", "Pending", "Approved", "Rejected"].forEach((status) => {
    assert.ok(labels.includes(status), `the ${status} filter option is missing`);
  });
});

test("the screen opens on HR's actionable question, and can be cleared to show everything", () => {
  assert.match(util, /can_raise:\s*"YES"[\s\S]{0,80}worked_longer:\s*"YES"[\s\S]{0,80}request_status:\s*"NOT_RAISED"/);
  assert.match(page, /\.\.\.actionableView\(\)/);
  // Nothing is permanently hidden: one control clears all three.
  assert.match(page, /clearedView\(\)/);
  assert.match(page, /Show all records/);
  assert.match(util, /can_raise:\s*"ALL"[\s\S]{0,60}worked_longer:\s*"ALL"[\s\S]{0,60}request_status:\s*"ALL"/);
});

test("the Action column links out and never acts", () => {
  assert.match(util, /View attendance/);
  assert.match(util, /View request/);
  // The request link only exists when a request does.
  assert.match(util, /if \(row\.request_id\)/);
  // Links, not buttons that post.
  assert.ok(!/\.post\(|\.put\(|\.delete\(/.test(browserCode), "the report writes");
});

test("the export is the server's xlsx, with the same filters, and never the grid's", () => {
  assert.match(helper, /export\.xlsx/);
  assert.match(helper, /responseType:\s*"blob"/);
  // The SAME query builder feeds the table and the export.
  assert.match(page, /AttendanceShiftChangeEligibilityHelper\.exportXlsx\(buildQuery\(filters\)\)/);
  assert.match(page, /AttendanceShiftChangeEligibilityHelper\.getReport\(buildQuery\(next\)\)/);
  // The grid's own client-side export is turned off, so nobody can download a
  // file the server's permission and branch scope never approved.
  assert.match(page, /hideExport/);
});

test("both permission keys gate the screen and the button", () => {
  assert.match(page, /usePermissions\(\["view_shift_change_eligibility_report"\]\)/);
  assert.match(page, /usePermissions\(\["export_shift_change_eligibility_report"\]\)/);
  assert.match(page, /canExport \?/);
});

test("the permission keys are declared for the rights screen", () => {
  assert.match(
    permissions,
    /view_shift_change_eligibility_report:\s*"View Shift Change Eligibility Report"/
  );
  assert.match(
    permissions,
    /export_shift_change_eligibility_report:\s*"Export Shift Change Eligibility Report"/
  );
});

test("the navigation entry sits in Attendance, behind the read key", () => {
  const attendance = menus.slice(menus.indexOf("attendance: {"), menus.indexOf("// M4 — Payroll"));
  assert.match(
    attendance,
    /shift_change_eligibility_report:\s*\{[\s\S]*?title:\s*"Shift Change Eligibility"[\s\S]*?permission:\s*"view_shift_change_eligibility_report"[\s\S]*?location:\s*"\/attendance\/shift-change-eligibility"/
  );
});

/* ===================================================================== */
/* THE DEFAULT DATE RANGE, ACROSS THE IST/UTC MIDNIGHT BOUNDARY.         */
/*                                                                       */
/* The same regression Missing Attendance already carries a test for:    */
/* deriving "yesterday" with `toISOString()` renders the instant in UTC, */
/* so between 00:00 and 05:29 IST the screen opens a day early and hides */
/* the most recent completed date.                                       */
/* ===================================================================== */

test("the default range is derived from the IST business date, never from toISOString", () => {
  assert.ok(!/toISOString/.test(util), "the default range renders a UTC date");
  assert.ok(util.includes("istToday"), "the shared IST business date is not used");
});
