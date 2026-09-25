/**
 * ADMIN "Revoke Decision" on the Attendance Approval Centre - the shape of the
 * screen, read from the sources (no renderer in this repo).
 *
 *   node --test components/attendance/revokeDecision.test.js
 *
 * The backend is the boundary: `POST /attendance/approvals/:id/revoke` checks
 * `user_type` 2, the stage, the payroll lock and the request's state itself.
 * What this pins is that the SCREEN offers the control to administrators only,
 * never on Shift, only on a REQUEST the server marked `revocable`, never
 * without a confirmation that says the request will be CANCELLED (not
 * reopened) and demands a reason, and that it sends nothing but the reason.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/attendance/approval/index.jsx"));
const queue = strip(read("components/attendance/ApprovalQueue.jsx"));
const modal = strip(read("components/attendance/RevokeDecisionModal.jsx"));
const helper = strip(read("helper/attendanceV2.js"));

test("the page offers Revoke to an ADMINISTRATOR only - on Attendance, OT and Shift alike", () => {
  assert.match(page, /const isAdmin = String\(userConfig && userConfig\.userType\) === "2";/);
  assert.match(page, /onRevoke=\{isAdmin \? \(row\) => setRevoking\(\{ row \}\) : null\}/);
  // Offered on every status tab - Approved, Rejected and All as well as Pending
  // - because a revocable decision can sit on a request in any of them.
  assert.ok(!/onRevoke=\{[^}]*name ===/.test(page), "not limited to one tab");
});

test("a REQUEST shows Revoke only where the server said `revocable`, and only when the page passed onRevoke", () => {
  assert.match(queue, /\{onRevoke && row\.revocable \? \(/);
  assert.match(queue, /onClick=\{\(\) => onRevoke\(row\)\}/);
  assert.match(queue, />\s*Revoke\s*</);
  assert.ok(!/st\.revocable/.test(queue), "no per-step revoke: the whole request is voided");
  assert.match(queue, /export default function ApprovalQueue\(\{ rows, kind, loading, onDecide, deciding, onRevoke = null, selection = null \}\)/);
});

test("the confirmation states employee, date, type, stage/level, current decision, approved OT, and what the revoke will do", () => {
  for (const label of ["Employee", "Date", "Request type", "Stage / approver level", "Current decision", "Approved OT", "Requested shift", "Revoke reason"]) {
    assert.ok(modal.includes(`"${label}"`) || modal.includes(`>${label}<`), label);
  }
  assert.match(modal, /\{isOt \? <Field label="Approved OT">/);
  assert.match(modal, /<Box>\{effectOf\(row, step\.stage_no\)\.text\}<\/Box>/);
});

test("OT and Attendance: the request is CANCELLED - never reopened", () => {
  const plain = modal.slice(modal.indexOf("  return {\n    verb: \"cancelled\",\n    text: `Request #${id} will be cancelled. It will not come back for approval, and its approval history is kept as it is. ${"));
  assert.match(plain, /will be cancelled\. It will not come back for approval/);
  assert.match(plain, /the day shows OT as Not Requested again/);
  assert.match(plain, /raise a fresh request, which starts a new approval chain/);
  assert.match(plain, /The original decision and your reason are kept in the audit/);
  assert.ok(!/reopen/i.test(plain), "nothing for OT or Attendance promises a reopening");
});

test("Shift: an APPROVED one is cancelled and its one-day shift and authorised OT removed; a REJECTED one is reopened at its stage", () => {
  const shift = modal.slice(modal.indexOf("function effectOf"), modal.indexOf("  return {\n    verb: \"cancelled\",\n    text: `Request #${id} will be cancelled. It will not come back for approval, and its approval history is kept as it is. ${"));
  assert.match(shift, /row\.request_type === "SHIFT_CHANGE" && row\.status === "REJECTED"/);
  assert.match(shift, /will be reopened: the rejection at stage \$\{stageNo\} is withdrawn and the request goes back to Pending at that stage/);
  assert.match(shift, /The one-day shift stops applying: the date is recalculated on the employee's normal shift, and any OT that shift authorised is removed/);
  assert.match(shift, /refused while an OT request stands on the date - revoke that first/);
});

test("the button says Revoke Decision and stays disabled until a reason is typed", () => {
  assert.match(modal, />\s*Revoke Decision\s*</);
  assert.match(modal, /isDisabled=\{reason\.trim\(\)\.length < MIN_REASON\}/);
  assert.match(modal, /const MIN_REASON = 5;/);
});

test("it sends the request id and the reason - and nothing the server must decide", () => {
  assert.match(modal, /revokeApproval\(row\.attendance_approval_request_id, \{ reason: trimmed \}\)/);
  assert.match(helper, /API\.post\(`\/attendance\/approvals\/\$\{request_id\}\/revoke`, \{ reason \}\)/);
  for (const forbidden of ["employee_id", "request_type", "approved_ot_minutes", "decision:", "stage_no"]) {
    assert.ok(!new RegExp(`revokeApproval[\\s\\S]{0,200}${forbidden}`).test(helper), `the helper never sends ${forbidden}`);
  }
});

test("a refusal is shown in the modal; success refreshes the queue and says the request reopened", () => {
  assert.match(modal, /setError\(apiMessage\(res, "The decision could not be revoked"\)\)/);
  assert.match(page, /title: "Decision revoked"/);
  assert.match(page, /The request is cancelled and the date has been recalculated/);
  assert.match(page, /res && res\.status === "PENDING"\s*\? `The rejection is withdrawn and the request is back in approval at stage \$\{res\.reopened_stage_no\}\.`/);
  assert.ok(!/pending again/.test(page), "never says the request is pending again");
  assert.match(page, /const onRevoked = async \(res\) => \{[\s\S]*?await load\(\);/);
});

test("the revocation history is shown with the request", () => {
  assert.match(queue, /function Revocations\(\{ revocations \}\)/);
  assert.match(queue, /<Revocations revocations=\{row\.revocations\} \/>/);
  assert.match(queue, /revoked by\{" "\}/);
});

test("a revoked request reads 'Cancelled – revoked by Admin', never Pending", () => {
  const util = strip(read("util/attendanceV2.js"));
  assert.match(util, /const REVOKED_LABEL = "Cancelled – revoked by Admin";/);
  assert.match(util, /if \(row\.status === "CANCELLED"\) return row\.revoked \? REVOKED_LABEL : "Cancelled";/);
  const { decisionLabel, stageLabel } = require("../../util/attendanceV2");
  const row = { status: "CANCELLED", revoked: true, current_stage_no: 3, total_stages: 3 };
  assert.equal(decisionLabel(row), "Cancelled – revoked by Admin");
  assert.equal(stageLabel(row), "Cancelled – revoked by Admin");
});
