/**
 * BULK actions on the Attendance Approval Centre - the shape of the screen,
 * read from the sources (no renderer in this repo).
 *
 *   node --test components/attendance/bulkActions.test.js
 *
 * The backend is the boundary: `/attendance/approvals/bulk` puts every id
 * through the single-record action and its checks. What this pins is that the
 * SCREEN offers ticks only where it offers the single control, confirms with
 * the count, demands the reason Reject and Revoke need, sends ids and the
 * state the approver saw (never an employee, decision or figure), and shows
 * every record's outcome.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/attendance/approval/index.jsx"));
const queue = strip(read("components/attendance/ApprovalQueue.jsx"));
const bar = strip(read("components/attendance/BulkActionBar.jsx"));
const modal = strip(read("components/attendance/BulkActionModal.jsx"));
const helper = strip(read("helper/attendanceV2.js"));

test("the page offers bulk only on a tab whose actions this viewer has, and only on the tab showing", () => {
  assert.match(page, /const bulkActions = bulkActionsFor\(\{ status, type, canDecide: canDecideHere, isAdmin \}\);/);
  assert.match(page, /const canDecideHere = type !== "SHIFT_CHANGE" \|\| canDecideShift;/);
  assert.match(page, /selection=\{name === status \? selection : null\}/);
  assert.match(page, /\{name === status && selection \? \(\s*<BulkActionBar/);
});

test("15. the selection is reset whenever the type, tab or a filter changes", () => {
  assert.match(page, /const scope = selectionScope\(\{ type, status, filters \}\);/);
  assert.match(page, /useEffect\(\(\) => \{\s*setSelected\(new Map\(\)\);\s*setAllMatching\(null\);\s*\}, \[scope\]\);/);
});

test("a checkbox on each actionable row, a header box for the page, and ticking never expands the row", () => {
  assert.match(queue, /function RowCheck\(\{ row, selection \}\)/);
  assert.match(queue, /isDisabled=\{!selectable\}/);
  assert.match(queue, /onClick=\{\(e\) => e\.stopPropagation\(\)\}/);
  assert.match(queue, /isIndeterminate=\{selection\.pageState === "some"\}/);
  assert.match(queue, /\{selection \? <Th w="1%">\{pageBox\}<\/Th> : null\}/);
  assert.match(queue, /\+ \(selection \? 1 : 0\)/, "the expanded detail still spans every column");
  assert.match(queue, /onRevoke = null, selection = null \}\)/, "without selection the queue is unchanged");
});

test("the bar shows the count and only the tab's actions; select all matching asks the server", () => {
  assert.match(bar, /\{count\} selected/);
  assert.match(bar, /actions\.map\(\(action\) =>/);
  assert.match(bar, /Select all matching the filters/);
  assert.match(page, /AttendanceV2Helper\.getBulkTargets\(\{\s*request_type: type,\s*status,\s*action: status === "PENDING" \? "APPROVE" : "REVOKE",\s*\.\.\.queryFilters,/);
});

test("the confirmation states the count, requires the reason for Reject/Revoke, and says revoked OT is not sent back to Pending", () => {
  assert.match(modal, /confirmTitle\(action, items\.length, type\)/);
  assert.match(modal, /isDisabled=\{reasonRequired\(action\) && reason\.trim\(\)\.length < 5\}/);
  assert.match(modal, /does not go back to Pending/);
  assert.match(modal, /the day shows OT as Not Requested again/);
  assert.match(page, /setBulk\(\{ action, type, status, items: \[\.\.\.selected\.values\(\)\] \}\)/, "the tab's status tells the modal which Shift outcome applies");
  assert.match(modal, /type === "SHIFT_CHANGE" && status === "REJECTED"\s*\? "Each rejected shift request is reopened/);
  assert.match(modal, /Each approved shift request is cancelled - it does not go back to Pending\. Its one-day shift stops applying/);
});

test("it sends ids, the seen state and the reason - in turns - and nothing the server must decide", () => {
  assert.match(modal, /const batches = chunk\(items\);/);
  assert.match(modal, /AttendanceV2Helper\.bulkApprovals\(\{\s*action,\s*request_type: type,\s*items: batch,\s*reason: reason\.trim\(\) \|\| undefined,\s*\}\)/);
  assert.match(helper, /API\.post\("\/attendance\/approvals\/bulk", \{ action, request_type, items, \.\.\.\(reason \? \{ reason \} : \{\}\) \}\)/);
  const util = strip(read("util/approvalBulk.js"));
  const item = util.slice(util.indexOf("function selectionItem"), util.indexOf("function selectionScope"));
  for (const forbidden of ["employee_id", "decision", "approved_ot_minutes", "request_type"]) {
    assert.ok(!item.includes(forbidden), `a selected item never carries ${forbidden}`);
  }
});

test("the results show successful, skipped and failed counts and the reason for each skipped or failed record", () => {
  assert.match(modal, /\["Successful", report\.summary\.succeeded, "green"\]/);
  assert.match(modal, /\["Skipped", report\.summary\.skipped, "orange"\]/);
  assert.match(modal, /\["Failed", report\.summary\.failed, "red"\]/);
  assert.match(modal, /report\.problems\.map\(\(r\) =>/);
  assert.match(modal, /<Text color="gray\.700">\{r\.message\}<\/Text>/);
  assert.match(page, /await load\(\);/);
});

test("13. the single-record controls are untouched: Approve / Reject / Revoke still call their own endpoints", () => {
  assert.match(page, /AttendanceV2Helper\.decideApproval\(row\.attendance_approval_request_id, \{ decision, remarks \}\)/);
  assert.match(page, /onRevoke=\{isAdmin \? \(row\) => setRevoking\(\{ row \}\) : null\}/);
  assert.match(helper, /API\.post\(`\/attendance\/regularization\/\$\{request_id\}\/decision`/);
  assert.match(helper, /API\.post\(`\/attendance\/approvals\/\$\{request_id\}\/revoke`, \{ reason \}\)/);
});
