/**
 * ADMIN "Revoke Decision" on the Attendance Approval Centre - the shape of the
 * screen, read from the sources (no renderer in this repo).
 *
 *   node --test components/attendance/revokeDecision.test.js
 *
 * The backend is the boundary: `POST /attendance/approvals/:id/revoke` checks
 * `user_type` 2, the stage, the payroll lock and the request's state itself.
 * What this pins is that the SCREEN offers the control to administrators only,
 * never on Shift, only on a step the server marked `revocable`, never without
 * a confirmation that states what will happen and demands a reason, and that
 * it sends nothing but the stage and the reason.
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
  assert.match(page, /onRevoke=\{isAdmin && type !== "SHIFT_CHANGE" \? \(row, step\) => setRevoking\(\{ row, step \}\) : null\}/);
  // Offered on every status tab - Approved, Rejected and All as well as Pending
  // - because a revocable decision can sit on a request in any of them.
  assert.ok(!/onRevoke=\{[^}]*name ===/.test(page), "not limited to one tab");
});

test("a step shows Revoke only where the server said `revocable`, and only when the page passed onRevoke", () => {
  assert.match(queue, /\{onRevoke && st\.revocable \? \(/);
  assert.match(queue, />\s*Revoke\s*</);
  assert.match(queue, /onRevoke=\{onRevoke \? \(st\) => onRevoke\(row, st\) : null\}/);
  assert.match(queue, /export default function ApprovalQueue\(\{ rows, kind, loading, onDecide, deciding, onRevoke = null \}\)/);
});

test("the confirmation states employee, date, type, stage/level, current decision, approved OT, and the consequence", () => {
  for (const label of ["Employee", "Date", "Request type", "Stage / approver level", "Current decision", "Approved OT", "Revoke reason"]) {
    assert.ok(modal.includes(`"${label}"`) || modal.includes(`>${label}<`), label);
  }
  assert.match(modal, /\{isOt \? <Field label="Approved OT">/);
  assert.match(modal, /go back to\s+pending, and the request reopens at stage/);
  assert.match(modal, /stops reaching payroll until it is approved again/);
  assert.match(modal, /The original decision is kept in the audit/);
});

test("the button says Revoke Decision and stays disabled until a reason is typed", () => {
  assert.match(modal, />\s*Revoke Decision\s*</);
  assert.match(modal, /isDisabled=\{reason\.trim\(\)\.length < MIN_REASON\}/);
  assert.match(modal, /const MIN_REASON = 5;/);
});

test("it sends the request id, the stage and the reason - and nothing the server must decide", () => {
  assert.match(modal, /revokeApproval\(row\.attendance_approval_request_id, \{\s*stage_no: step\.stage_no,\s*reason: trimmed,\s*\}\)/);
  assert.match(helper, /API\.post\(`\/attendance\/approvals\/\$\{request_id\}\/revoke`, \{ stage_no: Number\(stage_no\), reason \}\)/);
  for (const forbidden of ["employee_id", "request_type", "approved_ot_minutes", "decision:"]) {
    assert.ok(!new RegExp(`revokeApproval[\\s\\S]{0,200}${forbidden}`).test(helper), `the helper never sends ${forbidden}`);
  }
});

test("a refusal is shown in the modal; success refreshes the queue and says the request reopened", () => {
  assert.match(modal, /setError\(apiMessage\(res, "The decision could not be revoked"\)\)/);
  assert.match(page, /title: "Decision revoked"/);
  assert.match(page, /pending again at stage \$\{res\.current_stage_no\}/);
  assert.match(page, /const onRevoked = async \(res\) => \{[\s\S]*?await load\(\);/);
});

test("the revocation history is shown with the request", () => {
  assert.match(queue, /function Revocations\(\{ revocations \}\)/);
  assert.match(queue, /<Revocations revocations=\{row\.revocations\} \/>/);
  assert.match(queue, /revoked by\{" "\}/);
});
