/**
 * Attendance v2 - My Attendance, Employee Attendance, Day Detail,
 * Regularization and Edit Shift: the approved shape of the screens.
 *
 *   node --test components/attendance/attendanceV2Screens.test.js
 *
 * No component renderer is wired up in this repo, so these read the sources
 * the way components/attendance/attendanceScreens.test.js does.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const myPage = strip(read("pages/attendance/my/index.jsx"));
const hrPage = strip(read("pages/attendance/calculated/index.jsx"));
const list = strip(read("components/attendance/AttendanceDayList.jsx"));
const detail = strip(read("components/attendance/AttendanceDayDetail.jsx"));
const form = strip(read("components/attendance/RegularizationForm.jsx"));
const editShift = strip(read("components/attendance/EditShiftModal.jsx"));
const helper = strip(read("helper/attendanceV2.js"));
const permissions = read("constants/permissions.js");

/* ============================================== My Attendance ==== */

test("My Attendance has no employee selector and sends no employee id", () => {
  assert.ok(!/EmployeePicker/.test(myPage), "no employee picker");
  assert.ok(!/employee_id/.test(myPage), "the page never names an employee id");
  assert.match(myPage, /getMyAttendance\(/);
  assert.ok(!/getEmployeeAttendance/.test(myPage));
});

test("My Attendance needs no permission key; Employee Attendance is behind view_calculated_attendance", () => {
  assert.match(myPage, /<GlobalWrapper title="My Attendance">/);
  assert.match(hrPage, /permissionKey=\{\["view_calculated_attendance"\]\}/);
  assert.match(hrPage, /<EmployeePicker/);
});

test("the self read hits /attendance/me with dates only", () => {
  const fn = helper.slice(helper.indexOf("getMyAttendance"), helper.indexOf("getEmployeeAttendance"));
  assert.match(fn, /"\/attendance\/me"/);
  assert.match(fn, /params: \{ from_date, to_date \}/);
  assert.ok(!/employee_id/.test(fn));
});

test("both pages browse by month and open the Day Detail from the list, with no View button", () => {
  for (const page of [myPage, hrPage]) {
    assert.match(page, /type="month"/);
    assert.match(page, /<AttendanceDayList[\s\S]*?onSelect=\{setSelected\}/);
    assert.match(page, /<AttendanceDayDetail/);
    assert.ok(!/>\s*View\s*</.test(page), "no separate View button");
  }
});

/* ================================================== the list ==== */

test("the list shows Date, Day, Punches, Shift, NRM, Worked, Short, OT", () => {
  for (const header of ["Date", "Day", "Punches", "Shift", "NRM", "Worked", "Short", "OT"]) {
    assert.match(list, new RegExp(`<Th[^>]*>${header}</Th>`), header);
  }
});

test("punches are dynamic - the punch summary, not Clk1..Clk4 columns", () => {
  assert.match(list, /punchSummary\(day\)/);
  assert.ok(!/Clk\s?[1-4]|clk_?[1-4]/i.test(list));
  assert.ok(!/Clk\s?[1-4]|clk_?[1-4]/i.test(detail));
});

test("the list is responsive: cards on mobile, a compact table otherwise, and the whole card/row is the tap target", () => {
  assert.match(list, /useBreakpointValue\(\{ base: true, md: false \}\)/);
  assert.match(list, /function DayCard/);
  assert.match(list, /function DayTable/);
  assert.match(list, /as="button"[\s\S]*?onClick=\{\(\) => onSelect\(day\)\}/);
  assert.match(list, /<Tr[\s\S]*?onClick=\{\(\) => onSelect\(day\)\}/);
  assert.ok(!/>\s*View\s*</.test(list), "no View button on a card or row");
});

test("only the exact issue labels are rendered, through the shared mapping; a FINAL day gets no badge", () => {
  assert.match(list, /dayIssue\(day\)/);
  assert.match(list, /if \(!issue\) return null;/);
  for (const src of [list, detail, myPage, hrPage]) {
    assert.ok(!/Review Required/.test(src), "never Review Required");
  }
});

/* ============================================ the day detail ==== */

test("the Day Detail shows positional punches, NRM/Worked/Short/OT, Approved OT only when there is any", () => {
  assert.match(detail, /positionalPunches\(day\)/);
  assert.match(detail, /\{p\.position\}/);
  assert.match(detail, /p\.direction === "IN"/);
  for (const label of ['label="NRM"', 'label="Worked"', 'label="Short"', 'label="OT"']) assert.match(detail, new RegExp(label));
  assert.match(detail, /approvedOt > 0 \?[\s\S]*?label="Approved OT"/);
  assert.match(detail, /REGULARIZED_PUNCH_LABEL/);
});

test("the Day Detail carries none of the DigiSME clutter", () => {
  assert.ok(!/late_minutes|early_exit_minutes|penalt/i.test(detail), "no late/early penalty");
  assert.ok(!/OT\s?(10|15|20|30)/.test(detail));
  assert.ok(!/\bLock\b/.test(detail));
  assert.ok(!/Review Required/.test(detail));
});

test("Regularize appears only on a Missing Punch day, and Edit Shift only when the caller may edit", () => {
  assert.match(detail, /const showRegularize = !!onRegularize && canRegularize\(day\)/);
  assert.match(detail, /\{onEditShift \? \([\s\S]*?Edit Shift/);
  // My Attendance never passes onEditShift; the HR page passes it only with the key.
  assert.ok(!/onEditShift/.test(myPage), "no Edit Shift for the employee");
  assert.match(hrPage, /usePermissions\(\["edit_attendance_date_shift"\]\)/);
  assert.match(hrPage, /onEditShift=\{canEditShift \? \(day\) => setEditing\(day\) : null\}/);
  assert.ok(!/onRegularize/.test(hrPage), "the HR view does not regularize on somebody's behalf");
});

/* ======================================== the regularization ==== */

test("the regularization form shows the date and the existing punches read-only, asks only for time and reason", () => {
  assert.match(form, /Existing punches \(read only\)/);
  assert.match(form, /Missing Punch Time/);
  assert.match(form, /type="time"/);
  assert.match(form, /<Textarea/);
  assert.ok(!/punch_id/.test(form), "no way to name an existing punch");
  assert.ok(!/<Select/.test(form), "no IN/OUT choice: position decides");
  assert.match(form, /raiseMyRegularization\(/);
  const body = form.slice(form.indexOf("const body = {"), form.indexOf("};", form.indexOf("const body = {")));
  assert.match(body, /attendance_date: date/);
  assert.match(body, /punch_time:/);
  assert.match(body, /reason: reason\.trim\(\)/);
  assert.ok(!/employee/.test(body), "the body never names an employee");
});

test("backend validation and conflict messages are shown as they come", () => {
  assert.match(form, /setError\(apiMessage\(res\)\)/);
  assert.match(form, /<Alert status="error"[\s\S]*?\{error\}/);
});

test("the self regularization route is /attendance/me/regularization", () => {
  assert.match(helper, /"\/attendance\/me\/regularization"/);
});

/* ============================================= the Edit Shift ==== */

test("Edit Shift is current shift, a dropdown, Save - and nothing else", () => {
  assert.match(editShift, /Current Shift/);
  assert.match(editShift, /New Shift/);
  assert.match(editShift, /<Select/);
  assert.match(editShift, />\s*Save\s*</);
  for (const forbidden of ["effective_from", "effective_to", "date range", "reason", "bulk", 'type="date"']) {
    assert.ok(!editShift.toLowerCase().includes(forbidden), `no ${forbidden}`);
  }
  const body = editShift.slice(editShift.indexOf("setDateShift({"), editShift.indexOf("});", editShift.indexOf("setDateShift({")));
  assert.match(body, /employee_id: Number\(employeeId\)/);
  assert.match(body, /attendance_date: day\.attendance_date/);
  assert.match(body, /work_shift_id: Number\(shiftId\)/);
  assert.match(helper, /"\/attendance\/calculated\/date-shift"/);
});

test("the two new keys are in the permission matrix so they can be granted", () => {
  assert.match(permissions, /view_calculated_attendance:/);
  assert.match(permissions, /edit_attendance_date_shift:/);
});
