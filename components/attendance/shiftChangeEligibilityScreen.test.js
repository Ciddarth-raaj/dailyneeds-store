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
const modal = strip(read("components/attendance/ShiftChangeBlockModal.jsx"));
const util = strip(read("util/attendanceShiftChangeEligibility.js"));
const helper = strip(read("helper/attendanceShiftChangeEligibility.js"));
const menus = read("constants/menus.js");
const permissions = read("constants/permissions.js");

const browserCode = `${page}\n${util}\n${helper}\n${modal}`;

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
    "Can Raise by System?",
    "Worked Longer Than Assigned Shift?",
    "Eligibility Reason",
    "HR Eligibility",
    "HR Block Reason",
    "Blocked By",
    "Blocked At",
    "Effective Can Raise?",
    "Request Status",
    "Request ID",
    "Action",
  ]);
  // The renamed columns say exactly which question they answer - a bare
  // "Eligible?" is what sent somebody to ask HR what it meant.
  assert.ok(!headers.includes("Eligible?"), "an ambiguous column name is back");
  // THE THREE QUESTIONS STAY THREE COLUMNS. Request Status is never
  // overwritten with "Blocked", and the HR gate never replaces the system's
  // own verdict - a row can say Yes, Blocked by HR and Not Raised at once.
  assert.ok(headers.includes("Can Raise by System?"));
  assert.ok(headers.includes("HR Eligibility"));
  assert.ok(headers.includes("Request Status"));
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

test("the Action column links out, and the ONLY writes are the HR block's", () => {
  assert.match(util, /View attendance/);
  assert.match(util, /View request/);
  // The request link only exists when a request does.
  assert.match(util, /if \(row\.request_id\)/);

  // THE REPORT ITSELF STILL WRITES NOTHING. The HR block deliberately does -
  // it is the whole point of the feature - so the assertion is not "no writes"
  // but "no write except those two, and both to the block router".
  const writes = [...browserCode.matchAll(/API\.(post|put|patch|delete)\(([^,)]*)/g)].map(
    (m) => `${m[1]} ${m[2].trim()}`
  );
  assert.deepEqual(writes, ["post url"], "the only write helper is the block router's post()");
  // `post(url, body)` is the helper's own definition; the CALLS are the two
  // below it, and those are the only write destinations in the browser.
  const calls = [...helper.matchAll(/post\(([^,]+),/g)]
    .map((m) => m[1].trim())
    .filter((arg) => arg !== "url");
  assert.deepEqual(calls, ["BLOCK_URL", "`${BLOCK_URL}/remove`"]);
  // Nothing raises, approves or rejects a request from this screen.
  assert.ok(
    !/attendance\/me\/shift-change|approve|decide/i.test(helper),
    "the report must not reach the request or approval endpoints"
  );
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


/* ===================================================================== */
/* THE HR BLOCK.                                                         */
/* ===================================================================== */

test("the HR block is a separate WRITE permission, not the report's read key", () => {
  assert.match(page, /usePermissions\(\["manage_shift_change_eligibility"\]\)/);
  // The buttons are hidden without it - and the server refuses regardless.
  assert.match(page, /canManage \? blockAction/);
  assert.match(
    permissions,
    /manage_shift_change_eligibility:\s*"Manage Shift Change Eligibility/
  );
});

test("the action offered per row is chosen from SERVER values only", () => {
  // `blockAction` may read only what the server decided. If it started
  // comparing hours or dates it would be a second eligibility rule.
  const fn = util.slice(util.indexOf("export function blockAction"), util.indexOf("export function buildQuery"));
  assert.match(fn, /row\.hr_blocked/);
  assert.match(fn, /row\.request_status/);
  assert.match(fn, /row\.can_raise/);
  assert.ok(!/nrm|worked_minutes|payroll|MAX_BACKDATE/i.test(fn), "the browser re-decides eligibility");
});

test("each request state offers the approved action, and only that", () => {
  const fn = util.slice(util.indexOf("export function blockAction"), util.indexOf("export function buildQuery"));
  // Rejected gets its own wording, because there is no request to re-reject.
  assert.match(fn, /"Block Further Requests"/);
  assert.match(fn, /"Mark Not Eligible"/);
  assert.match(fn, /"Remove Block"/);
  // Pending and Approved offer nothing.
  assert.match(fn, /Pending[\s\S]{0,40}Approved[\s\S]{0,30}return null/);
  // And no ACTION LABEL calls a pre-request block a rejection. (The value
  // "REJECTED" is the server's request-status vocabulary and is correct.)
  const labels = [...fn.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  labels.forEach((label) => {
    assert.ok(!/reject/i.test(label), `the action "${label}" calls a block a rejection`);
  });
  const modalTitles = [...modal.matchAll(/\?\s*"([^"]*)"\s*\n?\s*:\s*"([^"]*)"/g)].flatMap((m) => [m[1], m[2]]);
  modalTitles.forEach((t) => assert.ok(!/reject/i.test(t), `the title "${t}" says reject`));
});

test("the block modal shows the evidence and demands a reason", () => {
  ["Employee", "Date", "Assigned Shift", "Worked Hours", "Extra Hours"].forEach((label) => {
    assert.ok(modal.includes(label), `the modal does not show ${label}`);
  });
  // Mandatory in both directions, and enforced by the confirm button.
  assert.match(modal, /isDisabled=\{tooShort\}/);
  assert.match(modal, /reason\.length < 5/);
  // "Other" must not be a way to skip the explanation.
  assert.match(modal, /choice === OTHER_REASON \? other : choice/);
  assert.match(modal, /choice === OTHER_REASON \?[\s\S]{0,400}Textarea/);
});

test("the blocked state is shown with its reason, actor and timestamp", () => {
  const headers = [...util.matchAll(/header:\s*"([^"]+)"/g)].map((m) => m[1]);
  ["HR Eligibility", "HR Block Reason", "Blocked By", "Blocked At"].forEach((h) => {
    assert.ok(headers.includes(h), `the ${h} column is missing`);
  });
  // ...and the removal dialog repeats them before anything is undone.
  assert.match(modal, /Blocked by \{row\.hr_blocked_by/);
  assert.match(modal, /row\.hr_block_reason/);
});

test("the default actionable view now excludes HR-blocked rows", () => {
  assert.match(
    util,
    /can_raise:\s*"YES"[\s\S]{0,200}hr_eligibility:\s*"ALLOWED"[\s\S]{0,120}request_status:\s*"NOT_RAISED"/
  );
  // ...and "Show all records" clears the HR filter too, so nothing is hidden.
  assert.match(util, /can_raise:\s*"ALL"[\s\S]{0,160}hr_eligibility:\s*"ALL"[\s\S]{0,120}request_status:\s*"ALL"/);
  assert.match(page, /FormLabel[^>]*>HR Eligibility</);
});

test("the write calls go to the block router and send no outlet", () => {
  assert.match(helper, /shift-change-eligibility\/block/);
  assert.match(helper, /\$\{BLOCK_URL\}\/remove/);
  const body = helper.slice(helper.indexOf("block: ({"), helper.indexOf("exportXlsx:"));
  assert.ok(!/store_id|outlet/i.test(body), "the browser must not name a branch");
  assert.match(body, /employee_id, attendance_date, reason/);
});

test("24. the export carries the HR fields and is still the server's", () => {
  // The screen's columns and the server's export columns are separate lists in
  // separate repositories; this asserts the browser side names the HR fields,
  // and `routes/attendance_shift_change_report.test.js` asserts the export's.
  const headers = [...util.matchAll(/header:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(headers.includes("Effective Can Raise?"));
  assert.match(page, /AttendanceShiftChangeEligibilityHelper\.exportXlsx\(buildQuery\(filters\)\)/);
  assert.match(page, /hideExport/);
});
