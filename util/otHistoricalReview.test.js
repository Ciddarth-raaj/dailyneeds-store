const test = require("node:test");
const assert = require("node:assert/strict");
const r = require("./otHistoricalReview");

const lines = [
  { employee_id: 945, attendance_date: "2026-09-04", calculated_ot_minutes: 22, proposed_action: "CREATE_PENDING_OT", dry_run: { ot_minutes: 22 } },
  { employee_id: 946, attendance_date: "2026-09-04", calculated_ot_minutes: 30, proposed_action: "CREATE_PENDING_OT_PRIOR_MONTH_SETTLEMENT", dry_run: { ot_minutes: 28 } },
  { employee_id: 947, attendance_date: "2026-09-05", calculated_ot_minutes: 10, proposed_action: "SKIP_EXISTING_APPROVED" },
];

test("only CREATE lines can be selected and sent - never an existing approval", () => {
  const all = new Set(lines.map(r.keyOf));
  assert.deepEqual(r.selectedItems(lines, all), [
    { employee_id: 945, attendance_date: "2026-09-04" },
    { employee_id: 946, attendance_date: "2026-09-04" },
  ]);
  assert.equal(r.isCreatable(lines[2]), false);
});

test("the confirmation counts the dry-run minutes and the Prior-Month OT lines", () => {
  assert.deepEqual(r.confirmationSummary(lines, new Set(lines.map(r.keyOf))), { entries: 2, employees: 2, minutes: 50, prior_month: 1 });
});

test("labels name the server's decision in words, including dry-run reasons", () => {
  assert.equal(r.actionLabel("CREATE_PENDING_OT_PRIOR_MONTH_SETTLEMENT"), "Create Pending OT – Prior-Month OT if approved");
  assert.equal(r.actionLabel("SKIP_INCOMPLETE_DAY"), "Not raised: incomplete day");
  assert.equal(r.PAYROLL_LABEL.PUBLISHED, "Published");
  assert.equal(r.actionLabel("SKIP_PREVIOUSLY_WITHDRAWN"), "Previously withdrawn – not reopened");
  assert.equal(r.isCreatable({ proposed_action: "SKIP_PREVIOUSLY_WITHDRAWN" }), false);
});

test("the screen: behind its key, preview first, an explicit confirmation, the preview's hash sent, and no approve action", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs.readFileSync(path.join(__dirname, "..", "pages/attendance/ot-historical-review/index.jsx"), "utf8");
  const helper = fs.readFileSync(path.join(__dirname, "..", "helper/attendanceV2.js"), "utf8");
  assert.match(src, /permissionKey=\{\["attendance_ot_historical_review"\]\}/);
  assert.match(src, /previewHistoricalOt\(range\)/);
  assert.match(src, /preview_hash: preview\.preview_hash/);
  assert.match(src, /items: selectedItems\(lines, selected\)/);
  assert.match(src, /<Modal isOpen=\{confirming\}/);
  assert.match(src, /Nothing is approved or paid now/);
  assert.doesNotMatch(src, /decideApproval|revokeApproval|bulkApprovals/);
  assert.match(helper, /"\/attendance\/ot\/historical-review\/authorise"/);
  assert.match(helper, /confirm: true/);
});
