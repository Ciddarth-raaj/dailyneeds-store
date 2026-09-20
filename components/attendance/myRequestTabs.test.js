/**
 * My Attendance - the Attendance / Correction Requests / OT Requests tabs.
 *
 *   node --test components/attendance/myRequestTabs.test.js
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

const myPage = strip(read("pages/attendance/my/index.jsx"));
const otList = strip(read("components/attendance/OtRequestList.jsx"));
const correctionList = strip(read("components/attendance/CorrectionRequestList.jsx"));
const otForm = strip(read("components/attendance/OtRequestForm.jsx"));
const helper = strip(read("helper/attendanceV2.js"));

/* ================================================== the tab shell ==== */

test("the employee's own page shows the four tabs, Attendance first", () => {
  assert.match(myPage, /<Tabs[\s\S]*?index=\{myTabIndex\(tab\)\}/);
  assert.match(myPage, /onChange=\{\(i\) => setTab\(myTabAtIndex\(i\)\)\}/);
  assert.match(myPage, /MY_TAB_ORDER\.map/);
  assert.match(myPage, /MY_TAB_LABEL\[key\]/);
  // The month list stays the first panel.
  const panels = myPage.slice(myPage.indexOf("<TabPanels>"));
  assert.ok(
    panels.indexOf("AttendanceDayList") < panels.indexOf("CorrectionRequestList"),
    "Attendance is the first panel"
  );
  assert.ok(
    panels.indexOf("CorrectionRequestList") < panels.indexOf("OtRequestList"),
    "Correction Requests comes before OT Requests"
  );
  // The one-day shift change is the third REQUEST tab and the last of the
  // four: it was added beside the other two rather than in front of them, so
  // nobody's muscle memory for Correction Requests or OT Requests moves.
  assert.ok(
    panels.indexOf("OtRequestList") < panels.indexOf("ShiftRequestList"),
    "Shift Requests comes last"
  );
});

test("the OT tab is visible to every employee: no permission key anywhere on the page", () => {
  assert.match(myPage, /<GlobalWrapper title="My Attendance">/);
  assert.ok(!/permissionKey/.test(myPage), "no permission gate on the employee's own page");
  assert.ok(!/employee_id/.test(myPage), "the page never names an employee id");
});

test("all four tabs are the SAME /attendance/me read - no second endpoint, no second engine", () => {
  assert.match(myPage, /getMyAttendance\(/);
  assert.equal((myPage.match(/AttendanceV2Helper\./g) || []).length, 1, "one helper call on the page");
  assert.match(myPage, /days=\{correctionRequestRows\(days\)\}/);
  assert.match(myPage, /days=\{otRequestRows\(days\)\}/);
  assert.match(myPage, /days=\{shiftRequestRows\(days\)\}/);
});

test("the Shift Requests tab reports the BACKEND's request state and raises nothing", () => {
  const shiftList = strip(read("components/attendance/ShiftRequestList.jsx"));
  assert.match(shiftList, /shiftRequestStatus\(day\)/);
  assert.match(shiftList, /shift_change_state|shiftRequestStatus/);
  // No button: a shift request names a date the employee chooses, so it is
  // raised from the page's own control with the date as a field.
  assert.ok(!/<Button/.test(shiftList), "the tab raises nothing");
  // And it decides nothing about the day: a pending request is not an issue
  // with the date, so no attendance status is drawn here.
  assert.ok(!/dayIssue|issueLabel/.test(shiftList));
});

/* ============================================= the OT Requests tab ==== */

test("the OT row renders the BACKEND's eligible OT, never a figure derived here", () => {
  assert.match(otList, /candidate_ot_minutes/);
  assert.match(otList, /Eligible OT/);
  assert.match(otList, /otRequestStatus\(day\)/);
  // The columns the tab must carry.
  ["Date", "Shift", "Punches", "Worked / NRM", "Eligible OT", "Status", "Action"].forEach((header) => {
    assert.ok(otList.includes(`>${header}<`), `the ${header} column`);
  });
});

test("no OT arithmetic is done in the OT tab", () => {
  // No minute maths, and nothing reading a clock time to produce a duration.
  assert.ok(!/[-+*/]\s*60\b/.test(otList), "no minute arithmetic");
  assert.ok(!/candidate_ot_minutes\s*[-+*/]/.test(otList), "the engine's figure is not adjusted");
  assert.ok(!/new Date\(/.test(otList), "no date maths on the punch times it displays");
});

test("the OT status uses the four request words, and the tab reads them from one place", () => {
  assert.match(otList, /otRequestStatus\(day\)/);
  assert.ok(!/"Pending"|"Approved"|"Rejected"|"Not Requested"/.test(otList), "no status word is spelled here");
  const util = read("util/attendanceV2.js");
  assert.match(util, /NOT_REQUESTED: "Not Requested"/);
  assert.match(util, /PENDING: "Pending"/);
  assert.match(util, /APPROVED: "Approved"/);
  assert.match(util, /REJECTED: "Rejected"/);
});

test("the web OT tab also separates a payroll closure from a rejection", () => {
  assert.match(otList, /Rejected: \{status\.rejectionReason\}/);
  assert.match(otList, /Closed: \{status\.closureReason\}/);
  const util = read("util/attendanceV2.js");
  assert.match(util, /CLOSED: "Closed – Payroll Locked"/);
});

test("an existing request shows requested OT, reason, submitted time and the rejection reason", () => {
  assert.match(otList, /Requested OT:/);
  assert.match(otList, /Reason: \{status\.reason\}/);
  assert.match(otList, /Rejected: \{status\.rejectionReason\}/);
  assert.match(otList, /Submitted \$\{displayDateTime\(status\.requestedAt\)\}/);
  assert.match(otList, /Decided \$\{displayDateTime\(status\.decidedAt\)\}/);
});

test("a blocked date offers no button and shows the correction message instead", () => {
  assert.match(otList, /const blocked = otBlockedReason\(day\)/);
  assert.match(otList, /if \(blocked\)/);
  assert.match(otList, /if \(!canRequestOt\(day\)\) return/);
  const util = read("util/attendanceV2.js");
  assert.match(util, /OT_BLOCKED_BY_CORRECTION = "Complete attendance correction first\."/);
});

/* ============================================== the OT request form ==== */

test("the OT form has no field for a duration and submits a date and a reason only", () => {
  assert.ok(!/type="number"/.test(otForm), "no numeric input anywhere on the form");
  assert.ok(!/<Input/.test(otForm), "the only free text is the reason Textarea");
  assert.equal((otForm.match(/<Textarea/g) || []).length, 1);
  assert.match(otForm, /Calculated OT \(read only\)/);
  assert.match(otForm, /raiseMyOtRequest\(\{\s*attendance_date: date,\s*reason: reason\.trim\(\),\s*\}\)/);
  assert.ok(!/minutes:/.test(otForm), "no minutes field is ever sent");
  assert.ok(!/employee_id/.test(otForm), "no employee id is ever sent");
});

test("the form requires a reason before it will submit", () => {
  assert.match(otForm, /if \(reason\.trim\(\)\.length < 5\)/);
  assert.match(otForm, /Enter a reason for the overtime/);
  assert.match(otForm, /isRequired/);
});

test("the helper posts the date and the reason to the self-only OT endpoint", () => {
  const fn = helper.slice(helper.indexOf("raiseMyOtRequest"), helper.indexOf("getApprovals"));
  assert.match(fn, /"\/attendance\/me\/ot-request"/);
  assert.match(fn, /\{ attendance_date, reason \}/);
  assert.ok(!/employee_id/.test(fn));
  assert.ok(!/minutes/.test(fn));
});

/* ====================================== the Correction Requests tab ==== */

test("the Correction tab shows the request state and stays out of OT", () => {
  assert.match(correctionList, /correctionRequestStatus\(day\)/);
  assert.match(correctionList, /canRegularize\(day\)/);
  assert.match(correctionList, /Rejected: \{status\.rejectionReason\}/);
  assert.ok(!/ot_claim_state|candidate_ot_minutes|Request OT/.test(correctionList), "no OT on the correction tab");
});

test("the two tabs raise two separate requests", () => {
  assert.match(myPage, /onRegularize=\{\(day\) => setRegularizing\(day\)\}/);
  assert.match(myPage, /onRequestOt=\{\(day\) => setRequestingOt\(day\)\}/);
  assert.ok(!/RegularizationForm/.test(otList), "the OT tab cannot raise a correction");
  assert.ok(!/OtRequestForm/.test(correctionList), "the correction tab cannot raise OT");
});

/* ============ OT authorised by an approved one-day shift change ========= */

test("the OT tab says Approved via Shift Change, and never offers to claim it again", () => {
  const otList = strip(read("components/attendance/OtRequestList.jsx"));
  // The row states where the approval came from, and names the request that
  // made it - not an OT request, which does not exist for these minutes.
  assert.match(otList, /status\.key !== "APPROVED_VIA_SHIFT_CHANGE"/);
  assert.match(otList, /Approved by your shift change/);
  assert.match(otList, /no OT request needed/);
  assert.match(otList, /outside the approved shift is still to be requested/);
  // Request OT is still gated on `canRequestOt`, which is false once the
  // shift change has authorised the whole of it.
  assert.match(otList, /if \(!canRequestOt\(day\)\) return/);
});
