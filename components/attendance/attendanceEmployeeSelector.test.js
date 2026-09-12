/**
 * Employee Attendance UI alignment: the single searchable employee selector,
 * the compact desktop table with its Status and Action columns, the mobile
 * cards, and what the Day Detail keeps.
 *
 *   node --test components/attendance/attendanceEmployeeSelector.test.js
 *
 * No component renderer is wired up in this repo, so these read the sources
 * the way components/attendance/attendanceV2Screens.test.js does.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const hrPage = strip(read("pages/attendance/calculated/index.jsx"));
const picker = strip(read("components/attendance/SearchableEmployeePicker.jsx"));
const payrollPicker = strip(read("components/payroll/EmployeePicker.jsx"));
const payrollPage = strip(read("pages/payroll/salary-revision.jsx"));
const list = strip(read("components/attendance/AttendanceDayList.jsx"));
const detail = strip(read("components/attendance/AttendanceDayDetail.jsx"));
const editShift = strip(read("components/attendance/EditShiftModal.jsx"));
const util = read("util/attendanceV2.js");

const card = list.slice(list.indexOf("function DayCard"), list.indexOf("function DayTable"));
const table = list.slice(list.indexOf("function DayTable"), list.indexOf("export default function AttendanceDayList"));

/* ================================== 1-4. one employee control, plus filters ==== */

test("1. Employee Attendance renders exactly ONE employee search/select control", () => {
  assert.match(hrPage, /<SearchableEmployeePicker/);
  assert.ok(!/<EmployeePicker/.test(hrPage), "the three-field Payroll picker is gone");
  const selects = picker.match(/<ReactSelect/g) || [];
  assert.strictEqual(selects.length, 1, "one employee combobox");
});

test("2. there is no separate employee search box beside an employee dropdown", () => {
  // The Payroll picker's shape - a search Input feeding a second employee
  // <Select> - is what this screen was corrected away from.
  assert.ok(!/placeholder="Search by name or employee ID"/.test(picker), "no standalone search box");
  assert.ok(!/placeholder="Select employee"/.test(picker), "no second employee dropdown");
  const chakraSelects = picker.match(/<Select\b/g) || [];
  assert.strictEqual(chakraSelects.length, 1, "the only plain Select is the Outlet filter");
  assert.match(picker, /aria-label="Outlet"/);
});

test("3. the Outlet filter remains, from the existing outlet source", () => {
  assert.match(picker, /useOutlets\(\{ directory: true \}\)/);
  assert.match(picker, /placeholder="All outlets"/);
  assert.match(picker, /outlets\.map\(\(o\) =>/);
  // It narrows the combobox rather than being a second way to pick somebody.
  assert.match(picker, /rows\.filter\(\(e\) => !outlet \|\| String\(e\.store_id\) === String\(outlet\)\)/);
});

test("4. Month remains, in the same filter row as Employee and Outlet", () => {
  assert.match(hrPage, /trailingControl=\{[\s\S]*?type="month"/);
  assert.match(picker, /\{trailingControl\}/);
  // Exactly one month/date control on the screen - no second one further down.
  assert.strictEqual((hrPage.match(/type="month"/g) || []).length, 1);
  assert.ok(!/type="date"/.test(hrPage), "no second date control");
});

test("the outlet filter keeps a still-valid selection and clears only an invalid one", () => {
  assert.match(picker, /const stillValid = inOutlet\.some\(\(e\) => String\(e\.employee_id\) === String\(selectedId\)\)/);
  assert.match(picker, /if \(!stillValid\) onSelect\(null\)/);
  assert.match(picker, /if \(loading \|\| !selectedId\) return;/);
});

/* ============================================ 5-8. finding and showing ==== */

test("5-6. an employee can be found by ID and by name in the one control", () => {
  const fn = picker.slice(picker.indexOf("function matchesNeedle"), picker.indexOf("const selectStyles"));
  assert.match(fn, /employee_name[\s\S]*?\.toLowerCase\(\)\.includes\(n\)/);
  assert.match(fn, /employee_id[\s\S]*?\.toLowerCase\(\)\.includes\(n\)/);
  assert.match(picker, /filterOption=\{\(option, input\) => matchesNeedle\(option\.data\.employee, input\)\}/);
  assert.match(picker, /placeholder="Search by employee ID or name"/);
});

test("the option reads `1952 — Priyanga P`, with outlet and designation under it", () => {
  assert.match(picker, /`\$\{employee\.employee_id\} — \$\{employee\.employee_name\}`/);
  assert.match(picker, /\[employee\.store_name, employee\.designation_name\]\.filter\(Boolean\)\.join\(" · "\)/);
  assert.match(picker, /formatOptionLabel=\{\(option\) => <EmployeeOption employee=\{option\.employee\} \/>\}/);
});

test("7. selecting an employee is what drives Employee Attendance", () => {
  assert.match(picker, /onChange=\{\(option\) => onSelect\(option \? option\.value : null\)\}/);
  assert.match(hrPage, /selectedId=\{employeeId\}[\s\S]*?onSelect=\{setEmployeeId\}/);
  assert.match(hrPage, /getEmployeeAttendance\(\{ employee_id: employeeId, \.\.\.bounds \}\)/);
  assert.match(hrPage, /\}, \[employeeId, month\]\);/);
});

test("8. the selected employee summary is one compact row: code, name, outlet, designation", () => {
  const summary = picker.slice(picker.indexOf("{selected ? ("));
  assert.match(summary, /\{selected\.employee_id\}/);
  assert.match(summary, /\{selected\.employee_name\}/);
  assert.match(summary, /\{selected\.store_name \|\| "Outlet not recorded"\}/);
  assert.match(summary, /\{selected\.designation_name \|\| "Designation not recorded"\}/);
  assert.match(summary, /<Stack direction="row"/, "one row, not a stacked block");
});

/* ================================ 9-14. the desktop table and its Action ==== */

test("9-10. the desktop table has explicit Status and Action columns, and no unlabelled column", () => {
  const headers = [...table.matchAll(/<Th[^>]*>([^<]+)<\/Th>/g)].map((m) => m[1].trim());
  assert.deepStrictEqual(headers, [
    "Date",
    "Day",
    "Punches",
    "Shift",
    "NRM",
    "Worked",
    "Short",
    "OT",
    "Status",
    "Action",
  ]);
  assert.ok(!/<Th\s*\/>/.test(table), "no unlabelled final column");
});

test("11. a visible View Details action is rendered on every desktop row", () => {
  assert.match(table, /<Button[\s\S]*?View Details →[\s\S]*?<\/Button>/);
  assert.match(table, /variant="ghost"/);
  assert.match(table, /colorScheme="purple"/);
});

test("12-13. View Details and a row click both open the Day Detail", () => {
  assert.match(table, /<Tr[\s\S]*?onClick=\{\(\) => onSelect\(day\)\}/, "the row opens it");
  assert.match(table, /e\.stopPropagation\(\);\s*onSelect\(day\);/, "the button opens it");
  assert.match(hrPage, /<AttendanceDayList[\s\S]*?onSelect=\{setSelected\}/);
  assert.match(hrPage, /<AttendanceDayDetail[\s\S]*?isOpen=\{!!selected\}/);
});

test("14. the button stops the click reaching the row, so one click opens the detail once", () => {
  const action = table.slice(table.lastIndexOf("<Button"));
  assert.match(action, /onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);/);
});

test("the desktop table is compact: tight cells, small type, scroll only when narrow", () => {
  assert.match(table, /sx=\{\{ "th, td": \{ px: 2, py: 1\.5 \} \}\}/);
  assert.match(table, /<Table size="sm"/);
  assert.match(table, /overflowX="auto"/);
  const numeric = table.match(/isNumeric/g) || [];
  assert.ok(numeric.length >= 8, "NRM / Worked / Short / OT right-aligned, header and cell");
});

/* ============================================ 15-19. the punch display ==== */

test("15. punches stay dynamic - the punch summary, never Clk1..Clk4", () => {
  assert.match(table, /punchSummary\(day\)/);
  assert.match(card, /punchSummary\(day\)/);
  assert.ok(!/Clk\s?[1-4]|clk_?[1-4]/i.test(list));
});

test("16-18. the monthly Punches string is EFFECTIVE punches only - no ignored, no voided", () => {
  const fn = util.slice(util.indexOf("function punchSummary"), util.indexOf("function formatMinutes"));
  assert.match(fn, /positionalPunches\(day\)/);
  assert.ok(!/excluded_punches/.test(fn), "the compact summary never reads the excluded punches");
  const positional = util.slice(util.indexOf("function positionalPunches"));
  assert.match(positional.slice(0, positional.indexOf("\n}")), /effective_punches/);
});

test("19. ignored and voided punches are still shown, in the Day Details", () => {
  assert.match(detail, /dayPunchRows\(day\)/);
  const rows = util.slice(util.indexOf("function dayPunchRows"), util.indexOf("function punchSummary"));
  assert.match(rows, /excluded_punches/);
  assert.match(detail, /PUNCH_STATUS_LABEL\[punch\.effective_status\]/);
  assert.match(detail, /Ignored and voided punches are kept for audit/);
});

/* ============================== 20-22. Edit Shift and Void Punch stay put ==== */

test("20-21. Edit Shift and Void Punch remain permission-controlled", () => {
  assert.match(hrPage, /usePermissions\(\["edit_attendance_date_shift"\]\)/);
  assert.match(hrPage, /usePermissions\(\["void_attendance_punch"\]\)/);
  assert.match(hrPage, /onEditShift=\{canEditShift \? \(day\) => setEditing\(day\) : null\}/);
  assert.match(hrPage, /onVoidPunch=\{canVoidPunch \? \(punch\) => setVoiding\(punch\) : null\}/);
  assert.match(detail, /\{onEditShift \? \([\s\S]*?Edit Shift/);
  assert.match(detail, /\{onVoidPunch && p\.void_able \?/);
});

test("22. no Edit Shift or Void Punch button on a monthly table row or card", () => {
  assert.ok(!/Edit Shift|Void Punch/.test(list), "they live on the Day Detail only");
  assert.ok(!/onEditShift|onVoidPunch/.test(list));
});

test("Edit Shift keeps its finalized shape: one date, current shift, a dropdown, Save", () => {
  assert.match(editShift, /Current Shift/);
  assert.match(editShift, /New Shift/);
  assert.match(editShift, />\s*Save\s*</);
  assert.match(editShift, /attendance_date: day\.attendance_date/);
  for (const forbidden of ["effective_from", "effective_to", 'type="date"']) {
    assert.ok(!editShift.toLowerCase().includes(forbidden.toLowerCase()), `no ${forbidden}`);
  }
});

/* ================================================= 23-24. the phone ==== */

test("23-24. mobile stays cards, and the whole card is the tap target", () => {
  assert.match(list, /useBreakpointValue\(\{ base: true, md: false \}\)/);
  assert.match(list, /if \(isMobile\) \{[\s\S]*?<DayCard/);
  assert.match(card, /as="button"[\s\S]*?onClick=\{\(\) => onSelect\(day\)\}/);
  assert.ok(!/>\s*View\s*</.test(card), "no View button needed on a card");
  // The card carries the same day: date, punches, shift, issue, the metrics.
  assert.match(card, /displayDate\(day\.attendance_date\)/);
  assert.match(card, /weekday\(day\.attendance_date\)/);
  assert.match(card, /shiftLabel\(day\)/);
  assert.match(card, /<IssueBadge day=\{day\} \/>/);
  for (const label of ['label="NRM"', 'label="Worked"', 'label="Short"', 'label="OT"']) {
    assert.match(card, new RegExp(label));
  }
});

test("the picker stacks on a phone and gives Employee the widest cell on a desktop", () => {
  assert.match(picker, /columns=\{\{ base: 1, md: trailingControl \? 4 : 3 \}\}/);
  assert.match(picker, /gridColumn=\{\{ base: "auto", md: "span 2" \}\}/);
});

/* =========================================== 25-28. states and labels ==== */

test("25. the loading states stay small and inline", () => {
  assert.match(list, /<Spinner size="sm" color="purple\.500" \/>[\s\S]*?Loading attendance…/);
  assert.match(picker, /<Spinner size="sm"[\s\S]*?Loading employees…/);
  assert.match(picker, /isLoading=\{loading\}/);
});

test("26. with no employee chosen the screen says so instead of rendering an empty table", () => {
  assert.match(hrPage, /Select an employee to view attendance\./);
  // The guard still wraps the whole month view; the summary cards now sit
  // inside it, ahead of the table (see attendanceSummaryCards.test.js).
  assert.match(hrPage, /\{employeeId \? \([\s\S]*?<AttendanceDayList/);
  const guarded = hrPage.slice(hrPage.indexOf("{employeeId ? ("));
  assert.ok(
    guarded.indexOf("<AttendanceDayList") < guarded.indexOf("Select an employee to view attendance."),
    "the table is the chosen-employee branch, the message the other one"
  );
});

test("27. the attendance status labels are preserved, and no generic status leaks in", () => {
  assert.match(list, /dayIssue\(day\)/);
  assert.match(list, /if \(!issue\) return null;/, "a normal day gets no badge");
  for (const label of [
    "Missing Punch",
    "Regularization Pending",
    "Absent",
    "No Shift Assigned",
    "Shift Setup Issue",
  ]) {
    assert.ok(util.includes(label), `${label} still defined`);
  }
  for (const src of [list, detail, hrPage, picker]) {
    assert.ok(!/Review Required/.test(src), "never Review Required");
    assert.ok(!/>\s*Present\s*</.test(src), "no Present badge on a row");
  }
  assert.ok(!/>\s*FINAL\s*</.test(list), "no generic FINAL badge");
});

test("28. the OT claim stays out of the attendance Status badge", () => {
  // The Status cell renders the issue only; the claim is a separate line
  // under the OT minutes.
  const statusStart = table.indexOf("<IssueBadge day={day} />", table.indexOf("<Tbody>"));
  const statusCell = table.slice(statusStart, table.indexOf('<Td textAlign="right">', statusStart));
  assert.ok(!/OtLine/.test(statusCell), "no OT in the Status cell");
  assert.match(table, /formatMinutes\(day\.candidate_ot_minutes\)\}(<\/ExplainTooltip>)?\s*\n\s*<OtLine day=\{day\} \/>/);
  assert.match(list, /function OtLine/);
  assert.match(list, /const ot = otClaim\(day\)/);
  const issue = strip(util.slice(util.indexOf("function dayIssue"), util.indexOf("const OT_CLOSURE_LABEL")));
  assert.ok(!/ot_claim_state/.test(issue), "the issue never reads the OT claim");
  for (const state of ["OT Available", "OT Request Pending", "OT Approved", "OT Rejected"]) {
    assert.ok(util.includes(state), `${state} still an OT claim label`);
  }
});

/* ================================================ Payroll is untouched ==== */

test("the Payroll employee picker and Salary Revision are unchanged by this", () => {
  assert.match(payrollPage, /<EmployeePicker selectedId=\{employeeId\} onSelect=\{setEmployeeId\} \/>/);
  assert.match(payrollPicker, /function EmployeePicker\(\{ selectedId, onSelect, disabled = false \}\)/);
  assert.match(payrollPicker, /placeholder="Search by name or employee ID"/);
  assert.match(payrollPicker, /placeholder="Select employee"/);
  assert.ok(!/SearchableEmployeePicker/.test(payrollPicker));
  assert.ok(!/SearchableEmployeePicker/.test(payrollPage));
});

test("the attendance picker is no second employee master: the same list, the same key", () => {
  assert.match(picker, /EmployeeHelper\.getEmployee\(\{ status: 1 \}\)/);
  assert.match(picker, /unwrapList\(/);
  assert.match(picker, /You do not have permission to view the employee list\./);
  assert.match(picker, /could not be loaded\. This is a problem reading it/);
});
