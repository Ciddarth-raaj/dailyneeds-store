/**
 * Bulk approval actions - the pure rules of the selection.
 *
 *   node --test util/approvalBulk.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  BULK_CHUNK,
  bulkActionsFor,
  isSelectable,
  selectionScope,
  toggleRow,
  togglePage,
  pageState,
  selectionFromTargets,
  chunk,
  confirmTitle,
  reasonError,
  mergeBulkResults,
} = require("./approvalBulk");

const pending = (id, extra = {}) => ({ attendance_approval_request_id: id, status: "PENDING", actionable: true, current_stage_no: 2, ...extra });
const approved = (id, extra = {}) => ({ attendance_approval_request_id: id, status: "APPROVED", revocable: true, current_stage_no: 3, ...extra });

test("each tab offers only its own actions, to the right viewer", () => {
  assert.deepEqual(bulkActionsFor({ status: "PENDING", type: "OT", canDecide: true, isAdmin: false }), ["APPROVE", "REJECT"]);
  assert.deepEqual(bulkActionsFor({ status: "PENDING", type: "SHIFT_CHANGE", canDecide: false, isAdmin: true }), [], "no Shift approval key");
  assert.deepEqual(bulkActionsFor({ status: "APPROVED", type: "OT", canDecide: true, isAdmin: true }), ["REVOKE"]);
  assert.deepEqual(bulkActionsFor({ status: "REJECTED", type: "REGULARIZATION", canDecide: true, isAdmin: true }), ["REVOKE"]);
  assert.deepEqual(bulkActionsFor({ status: "APPROVED", type: "OT", canDecide: true, isAdmin: false }), [], "revoke is administrators only");
  assert.deepEqual(bulkActionsFor({ status: "APPROVED", type: "SHIFT_CHANGE", canDecide: true, isAdmin: true }), ["REVOKE"], "Shift: approved -> cancelled");
  assert.deepEqual(bulkActionsFor({ status: "REJECTED", type: "SHIFT_CHANGE", canDecide: false, isAdmin: true }), ["REVOKE"], "Shift: rejected -> reopened");
  assert.deepEqual(bulkActionsFor({ status: "REJECTED", type: "SHIFT_CHANGE", canDecide: true, isAdmin: false }), [], "never to a non-administrator");
  assert.deepEqual(bulkActionsFor({ status: "ALL", type: "OT", canDecide: true, isAdmin: true }), [], "a mixed list has no one action");
});

test("a row may be ticked exactly where its own control would appear", () => {
  assert.equal(isSelectable(pending(1), "PENDING"), true);
  assert.equal(isSelectable(pending(1, { actionable: false }), "PENDING"), false, "another approver's stage");
  assert.equal(isSelectable(approved(1), "APPROVED"), true);
  assert.equal(isSelectable(approved(1, { revocable: false }), "APPROVED"), false, "e.g. a payroll-lock closure");
  assert.equal(isSelectable(approved(1), "PENDING"), false, "not on another tab");
  assert.equal(isSelectable({ ...approved(1), status: "REJECTED" }, "REJECTED"), true);
});

test("15. ticking, unticking, and the header box for the current page", () => {
  const rows = [pending(1), pending(2), pending(3, { actionable: false })];
  let sel = new Map();
  assert.equal(pageState(sel, rows, "PENDING"), "none");
  sel = toggleRow(sel, rows[0], "PENDING");
  assert.deepEqual([...sel.keys()], [1]);
  assert.deepEqual(sel.get(1), { request_id: 1, current_stage_no: 2, status: "PENDING" }, "the stage the approver saw goes with the id");
  assert.equal(pageState(sel, rows, "PENDING"), "some");
  sel = togglePage(sel, rows, "PENDING");
  assert.deepEqual([...sel.keys()].sort(), [1, 2], "select all on the page - never the row that cannot be actioned");
  assert.equal(pageState(sel, rows, "PENDING"), "all");
  sel = togglePage(sel, rows, "PENDING");
  assert.equal(sel.size, 0, "the header box unticks the page again");
  sel = toggleRow(sel, rows[2], "PENDING");
  assert.equal(sel.size, 0, "a non-actionable row cannot be ticked");
  sel = toggleRow(toggleRow(sel, rows[1], "PENDING"), rows[1], "PENDING");
  assert.equal(sel.size, 0, "a second tick unticks");
});

test("15. the selection belongs to one view: a new tab, type or filter is a new scope", () => {
  const base = { type: "OT", status: "PENDING", filters: { outlet_id: "", employee_id: "", designation_id: "" } };
  const key = selectionScope(base);
  assert.equal(selectionScope({ ...base }), key, "same view, same selection");
  assert.notEqual(selectionScope({ ...base, status: "APPROVED" }), key);
  assert.notEqual(selectionScope({ ...base, type: "REGULARIZATION" }), key);
  assert.notEqual(selectionScope({ ...base, filters: { ...base.filters, outlet_id: "3" } }), key);
  assert.notEqual(selectionScope({ ...base, filters: { ...base.filters, employee_id: "42" } }), key);
  assert.notEqual(selectionScope({ ...base, filters: { ...base.filters, designation_id: "7" } }), key);
});

test("15. select all MATCHING keeps what the server returned, beyond the page, and the page box still works on it", () => {
  const sel = selectionFromTargets([
    { request_id: 1, current_stage_no: 2, status: "PENDING" },
    { request_id: 500, current_stage_no: 1, status: "PENDING" }, // not on the loaded page
    { request_id: "x" },
  ]);
  assert.deepEqual([...sel.keys()], [1, 500]);
  const page = [pending(1), pending(2)];
  assert.equal(pageState(sel, page, "PENDING"), "some");
  const more = togglePage(sel, page, "PENDING");
  assert.deepEqual([...more.keys()].sort((a, b) => a - b), [1, 2, 500], "ticking the page keeps the off-page ids");
  const less = togglePage(more, page, "PENDING");
  assert.deepEqual([...less.keys()], [500], "unticking the page leaves the off-page ids");
});

test("a large selection is sent in turns", () => {
  const ids = Array.from({ length: 146 }, (_, i) => i + 1);
  const parts = chunk(ids);
  assert.equal(BULK_CHUNK, 25);
  assert.equal(parts.length, 6);
  assert.deepEqual(parts.map((p) => p.length), [25, 25, 25, 25, 25, 21]);
  assert.deepEqual(parts.flat(), ids);
});

test("the confirmation says how many, of what", () => {
  assert.equal(confirmTitle("APPROVE", 146, "OT"), "Approve 146 OT requests?");
  assert.equal(confirmTitle("REJECT", 1, "REGULARIZATION"), "Reject 1 Attendance request?");
  assert.equal(confirmTitle("REVOKE", 12, "OT"), "Revoke 12 OT requests?");
});

test("Reject and Revoke need a reason; Approve does not", () => {
  assert.match(reasonError("REJECT", ""), /rejection reason/);
  assert.match(reasonError("REVOKE", "   ab "), /revoke reason/);
  assert.equal(reasonError("REJECT", "not worked"), null);
  assert.equal(reasonError("APPROVE", ""), null);
  assert.match(reasonError("APPROVE", "x".repeat(501)), /at most 500/);
});

test("results are added up across calls; a call that failed marks only its own ids, and earlier successes stand", () => {
  const report = mergeBulkResults([
    { ok: true, body: { results: [
      { request_id: 1, outcome: "SUCCEEDED" },
      { request_id: 2, outcome: "SKIPPED", code: "PAYROLL_LOCKED", message: "locked" },
    ] } },
    { ok: true, body: { results: [{ request_id: 3, outcome: "FAILED", code: "STATE_CHANGED", message: "moved" }] } },
    { ok: false, items: [{ request_id: 4 }, { request_id: 5 }], message: "Could not reach the server" },
  ]);
  assert.deepEqual(report.summary, { requested: 5, succeeded: 1, skipped: 1, failed: 3 });
  assert.deepEqual(report.problems.map((p) => [p.request_id, p.outcome, p.message]), [
    [2, "SKIPPED", "locked"],
    [3, "FAILED", "moved"],
    [4, "FAILED", "Could not reach the server"],
    [5, "FAILED", "Could not reach the server"],
  ]);
});
