/**
 * My Attendance - the Attendance / Correction Requests / OT Approvals tabs.
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

const myPage = strip(read("components/attendance/MyAttendanceView.jsx"));
const otList = strip(read("components/attendance/OtRequestList.jsx"));
const correctionList = strip(read("components/attendance/CorrectionRequestList.jsx"));
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
  assert.match(myPage, /<CustomContainer title="My Attendance"/);
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
  ["Date", "Shift", "Punches", "Worked / NRM", "Eligible OT", "Status", "Next"].forEach((header) => {
    assert.ok(otList.includes(`>${header}<`), `the ${header} column`);
  });
});

test("no OT arithmetic is done in the OT tab", () => {
  // No minute maths, and nothing reading a clock time to produce a duration.
  assert.ok(!/[-+*/]\s*60\b/.test(otList), "no minute arithmetic");
  assert.ok(!/candidate_ot_minutes\s*[-+*/]/.test(otList), "the engine's figure is not adjusted");
  assert.ok(!/new Date\(/.test(otList), "no date maths on the punch times it displays");
});

test("the OT status uses the approval words, and the tab reads them from one place", () => {
  assert.match(otList, /otRequestStatus\(day\)/);
  assert.ok(!/"Pending Approval"|"Approved"|"Rejected"|"Awaiting Approval Queue"/.test(otList), "no status word is spelled here");
  const util = read("util/attendanceV2.js");
  assert.match(util, /NOT_REQUESTED: "Awaiting Approval Queue"/);
  assert.match(util, /PENDING: "Pending Approval"/);
  assert.match(util, /APPROVED: "Approved"/);
  assert.match(util, /REJECTED: "Rejected"/);
});

test("the web OT tab also separates a payroll closure from a rejection", () => {
  assert.match(otList, /Rejected: \{status\.rejectionReason\}/);
  assert.match(otList, /Closed: \{status\.closureReason\}/);
  const util = read("util/attendanceV2.js");
  assert.match(util, /CLOSED: "Closed – Payroll Locked"/);
});

test("an existing OT record shows the minutes sent for approval, times and the rejection reason", () => {
  assert.match(otList, /Sent for approval:/);
  assert.match(otList, /Rejected: \{status\.rejectionReason\}/);
  assert.match(otList, /Submitted \$\{displayDateTime\(status\.requestedAt\)\}/);
  assert.match(otList, /Decided \$\{displayDateTime\(status\.decidedAt\)\}/);
});

test("a blocked date shows the correction message; nothing on the tab requests OT", () => {
  assert.match(otList, /const blocked = otBlockedReason\(day\)/);
  assert.match(otList, /if \(blocked\)/);
  const util = read("util/attendanceV2.js");
  assert.match(util, /OT_BLOCKED_BY_CORRECTION = "OT goes to approval once the attendance correction is complete\."/);
});

/* ============================================ NO OT REQUEST, ANYWHERE ==== */

test("employees no longer request OT: no form, no button, no API call", () => {
  assert.ok(!fs.existsSync(path.join(__dirname, "OtRequestForm.jsx")), "the OT request form is gone");
  assert.ok(!/Request OT|onRequestOt|<Button/.test(otList), "the OT tab offers no request");
  assert.ok(!/OtRequestForm|onRequestOt|setRequestingOt/.test(myPage), "the page wires no OT request");
  assert.ok(!/raiseMyOtRequest|\/attendance\/me\/ot-request"/.test(helper), "no helper posts an OT request");
  // What the tab says instead.
  assert.match(otList, /OT_AUTOMATIC_NOTE/);
  assert.match(read("util/attendanceV2.js"), /OT_AUTOMATIC_NOTE = "Sent for approval automatically - no request needed"/);
});

/* ====================================== the Correction Requests tab ==== */

test("the Correction tab shows the request state and stays out of OT", () => {
  assert.match(correctionList, /correctionRequestStatus\(day\)/);
  assert.match(correctionList, /canRegularize\(day\)/);
  assert.match(correctionList, /Rejected: \{status\.rejectionReason\}/);
  assert.ok(!/ot_claim_state|candidate_ot_minutes|Request OT/.test(correctionList), "no OT on the correction tab");
});

test("only the correction tab raises anything; the OT tab raises nothing at all", () => {
  assert.match(myPage, /onRegularize=\{\(day\) => setRegularizing\(day\)\}/);
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
  // The excess outside the approved shift goes to approval by itself.
  assert.match(otList, /outside the approved shift goes to approval automatically/);
  assert.ok(!/canRequestOt/.test(otList), "nothing on the tab asks whether OT may be requested");
});
