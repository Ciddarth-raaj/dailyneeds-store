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

test("the page offers Revoke to an ADMINISTRATOR only, and never on the Shift tab", () => {
  assert.match(page, /const isAdmin = String\(userConfig && userConfig\.userType\) === "2";/);
  assert.match(page, /onRevoke=\{isAdmin && type !== "SHIFT_CHANGE" \? \(row\) => setRevoking\(\{ row \}\) : null\}/);
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

test("the confirmation states employee, date, type, stage/level, current decision, approved OT, and that the request is CANCELLED", () => {
  for (const label of ["Employee", "Date", "Request type", "Stage / approver level", "Current decision", "Approved OT", "Revoke reason"]) {
    assert.ok(modal.includes(`"${label}"`) || modal.includes(`>${label}<`), label);
  }
  assert.match(modal, /\{isOt \? <Field label="Approved OT">/);
  assert.match(modal, /will be <b>cancelled<\/b>\. It will not come back for\s+approval/);
  assert.match(modal, /the day shows OT as Not Requested again/);
  assert.match(modal, /raise a fresh request, which starts a new\s+approval chain/);
  assert.match(modal, /The original decision and your reason are kept in the audit/);
  assert.ok(!/reopen/i.test(modal.replace(/\/\*[\s\S]*?\*\//g, "")), "nothing on the screen promises a reopening");
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
