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

/* ===================================================================== */
/* THE DEFAULT DATE RANGE, ACROSS THE IST/UTC MIDNIGHT BOUNDARY.         */
/*                                                                       */
/* This is a REGRESSION test. The first version of this screen derived    */
/* yesterday with `new Date(...).toISOString().slice(0, 10)`, which       */
/* renders the instant in UTC. Between 00:00 and 05:29 IST the UTC date   */
/* is still the PREVIOUS day, so the report opened one day too early and  */
/* silently hid the most recent completed date - the exact day a morning  */
/* shift-in-charge opens it to chase.                                     */
/*                                                                       */
/* `defaultRange` is exercised directly with a pinned instant. A test     */
/* that used the real clock would pass or fail depending on the hour the  */
/* suite happened to run, which is how this class of bug survives.        */
/* ===================================================================== */

/**
 * `util/attendanceMissing.js` is an ES module and this repo has no bundler in
 * its test path, so the two pure functions under test are evaluated from the
 * source with their `export` keywords removed. `istToday` is pulled from its
 * own module the same way. Nothing is stubbed: this is the shipped
 * arithmetic.
 */
const loadDefaultRange = () => {
  const dashboard = read("util/attendanceDashboard.js");
  const istTodaySrc = dashboard.slice(
    dashboard.indexOf("function istToday("),
    dashboard.indexOf("/** The message a screen shows")
  );
  const util = read("util/attendanceMissing.js")
    .replace(/^import[\s\S]*?;\s*$/m, "")
    .replace(/export function/g, "function");
  const addDaysSrc = util.slice(util.indexOf("function addDays("), util.indexOf("function displayDate("));
  // eslint-disable-next-line no-new-func
  return new Function(`${istTodaySrc}\n${addDaysSrc}\nreturn defaultRange;`)();
};

/** An instant from IST wall-clock time, as a real `Date`. */
const atIst = (y, m, d, hh, mm) =>
  new Date(Date.UTC(y, m - 1, d, hh, mm) - (5 * 60 + 30) * 60 * 1000);

test("the default range NEVER uses UTC to decide the business date", () => {
  // Comments in both files EXPLAIN why toISOString is wrong here, so the
  // check is against the stripped code - what actually runs.
  const utilCode = strip(read("util/attendanceMissing.js"));
  const pageCode = strip(read("pages/attendance/missing-attendance/index.jsx"));
  assert.ok(
    !/toISOString/.test(utilCode) && !/toISOString/.test(pageCode),
    "toISOString renders UTC and must not decide an attendance date"
  );
  // It uses the SHARED attendance business-date helper, not a private copy.
  assert.match(utilCode, /import \{ istToday \} from "\.\/attendanceDashboard"/);
});

test("on 19 Sep 2026 IST the default to_date is 18 Sep 2026, at every hour of the day", () => {
  const defaultRange = loadDefaultRange();
  // 00:01 IST is the case the old code got wrong: in UTC it is still the
  // 18th, so `toISOString()` produced a to_date of the 17th.
  const hours = [
    [0, 1],
    [0, 59],
    [5, 29],
    [5, 31],
    [12, 0],
    [23, 59],
  ];
  hours.forEach(([hh, mm]) => {
    const range = defaultRange(atIst(2026, 9, 19, hh, mm));
    assert.deepStrictEqual(
      range,
      { from_date: "2026-09-12", to_date: "2026-09-18" },
      `at ${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")} IST on 19 Sep 2026`
    );
  });
});

test("the whole IST day maps to one business date - the boundary is 00:00 IST, not 00:00 UTC", () => {
  const defaultRange = loadDefaultRange();
  // 23:59 IST on the 18th is still the 18th, so yesterday is the 17th.
  assert.strictEqual(defaultRange(atIst(2026, 9, 18, 23, 59)).to_date, "2026-09-17");
  // One minute later it is the 19th, and yesterday becomes the 18th.
  assert.strictEqual(defaultRange(atIst(2026, 9, 19, 0, 0)).to_date, "2026-09-18");
});

test("from_date is always six days before to_date - seven completed dates", () => {
  const defaultRange = loadDefaultRange();
  [
    [atIst(2026, 9, 19, 0, 1), "2026-09-12", "2026-09-18"],
    // Across a month boundary.
    [atIst(2026, 10, 1, 2, 0), "2026-09-24", "2026-09-30"],
    // Across a year boundary.
    [atIst(2027, 1, 1, 1, 0), "2026-12-25", "2026-12-31"],
    // A leap day.
    [atIst(2028, 3, 1, 4, 0), "2028-02-23", "2028-02-29"],
  ].forEach(([instant, from_date, to_date]) => {
    assert.deepStrictEqual(defaultRange(instant), { from_date, to_date });
  });
});

test("the default is a PREFILL - the server still clamps the window", () => {
  const page = strip(read("pages/attendance/missing-attendance/index.jsx"));
  // The screen renders the server's own account of the window it used.
  assert.ok(page.includes("windowNote(meta)"), "the server's effective window is not shown");
  // And it never decides for itself which dates are reportable.
  assert.ok(
    !/latest_reportable_date\s*=/.test(page),
    "the browser computes the reportable window itself"
  );
});
