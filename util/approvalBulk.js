/**
 * The Attendance Approval Centre's BULK actions - the pure part: which rows
 * may be ticked, what the header checkbox shows, which actions a tab offers,
 * how a selection is sent and how the results are added up. CommonJS so
 * `node --test util/approvalBulk.test.js` runs it without a bundler.
 *
 * THIS IS PRESENTATION. A tick box is offered only where the single-record
 * control would be - Approve / Reject on a row the server marked
 * `actionable`, Revoke on a row it marked `revocable` - but the bulk endpoint
 * re-reads and re-checks every id itself, exactly as the single endpoints do.
 *
 * A SELECTION BELONGS TO ONE VIEW. Changing the request type, the status tab
 * or any filter changes `selectionScope`, and the page starts a new, empty
 * selection: ids ticked under one filter are never actioned under another.
 */

const BULK_ACTION = Object.freeze({ APPROVE: "APPROVE", REJECT: "REJECT", REVOKE: "REVOKE" });

/** One HTTP call carries at most this many; a larger selection is sent in turns. */
const BULK_CHUNK = 25;

const TYPE_NOUN = { REGULARIZATION: "Attendance", OT: "OT", SHIFT_CHANGE: "Shift" };
const VERB = { APPROVE: "Approve", REJECT: "Reject", REVOKE: "Revoke" };

const idOf = (row) => Number(row && row.attendance_approval_request_id);

/**
 * The actions a status tab offers, for this viewer.
 *
 *   Pending            Approve, Reject   - to an approver the page lets decide
 *   Approved/Rejected  Revoke            - administrators only, never Shift
 *                                          (Shift decisions are not revocable)
 *   All                nothing           - a mixed list has no one action
 */
function bulkActionsFor({ status, type, canDecide, isAdmin }) {
  if (status === "PENDING") return canDecide ? [BULK_ACTION.APPROVE, BULK_ACTION.REJECT] : [];
  if (status === "APPROVED" || status === "REJECTED") {
    return isAdmin && type !== "SHIFT_CHANGE" ? [BULK_ACTION.REVOKE] : [];
  }
  return [];
}

/** May this row be ticked on this tab? Exactly where the single control appears. */
function isSelectable(row, status) {
  if (!row) return false;
  if (status === "PENDING") return row.status === "PENDING" && !!row.actionable;
  if (status === "APPROVED" || status === "REJECTED") return row.status === status && !!row.revocable;
  return false;
}

/**
 * What is sent for a ticked row: its id and the state the approver SAW - the
 * stage for Approve / Reject, the status for Revoke - so a request that moved
 * since is reported as changed instead of being decided unseen.
 */
function selectionItem(row) {
  return {
    request_id: idOf(row),
    current_stage_no: Number(row.current_stage_no) || undefined,
    status: row.status,
  };
}

/** The selection's identity: a new type, tab or filter starts a new one. */
function selectionScope({ type, status, filters }) {
  const f = filters || {};
  return [type, status, f.outlet_id || "", f.employee_id || "", f.designation_id || ""].join("|");
}

/** `selected` is a Map of id -> item. Every function returns a NEW Map. */
function toggleRow(selected, row, status) {
  const next = new Map(selected);
  const id = idOf(row);
  if (next.has(id)) next.delete(id);
  else if (isSelectable(row, status)) next.set(id, selectionItem(row));
  return next;
}

/**
 * The header box ticks every SELECTABLE row on the page, or - when they are
 * all ticked already - unticks them. Rows that cannot be actioned are never
 * added, and ticks from "select all matching" beyond the page are kept.
 */
function togglePage(selected, rows, status) {
  const selectable = (rows || []).filter((r) => isSelectable(r, status));
  const next = new Map(selected);
  const allOn = selectable.length > 0 && selectable.every((r) => next.has(idOf(r)));
  selectable.forEach((r) => {
    if (allOn) next.delete(idOf(r));
    else next.set(idOf(r), selectionItem(r));
  });
  return next;
}

/** "all" | "some" | "none" - of the page's selectable rows. */
function pageState(selected, rows, status) {
  const selectable = (rows || []).filter((r) => isSelectable(r, status));
  const on = selectable.filter((r) => selected.has(idOf(r))).length;
  if (selectable.length === 0 || on === 0) return "none";
  return on === selectable.length ? "all" : "some";
}

/** The server's "select all matching" answer, as a selection. */
function selectionFromTargets(items) {
  const next = new Map();
  (items || []).forEach((item) => {
    const id = Number(item.request_id);
    if (Number.isInteger(id) && id > 0) {
      next.set(id, { request_id: id, current_stage_no: Number(item.current_stage_no) || undefined, status: item.status });
    }
  });
  return next;
}

function chunk(list, size = BULK_CHUNK) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** "Approve 146 OT requests?" */
function confirmTitle(action, count, type) {
  return `${VERB[action]} ${count} ${TYPE_NOUN[type] || ""} request${count === 1 ? "" : "s"}?`.replace(/\s+/g, " ");
}

/** Reject and Revoke need a reason of 5 to 500 characters, as the single ones do. */
function reasonRequired(action) {
  return action === BULK_ACTION.REJECT || action === BULK_ACTION.REVOKE;
}
function reasonError(action, reason) {
  const why = String(reason || "").trim();
  if (reasonRequired(action) && why.length < 5) {
    return `A ${action === BULK_ACTION.REJECT ? "rejection" : "revoke"} reason of at least 5 characters is required`;
  }
  if (why.length > 500) return "A reason may be at most 500 characters";
  return null;
}

/**
 * The results of every call, added up. A call that failed as a whole (the
 * network, a refusal of the batch) marks each of ITS ids failed with that
 * message; the calls before it stay as they were - their records are done.
 */
function mergeBulkResults(parts) {
  const results = [];
  (parts || []).forEach((part) => {
    if (part && part.ok) {
      (part.body.results || []).forEach((r) => results.push(r));
    } else if (part) {
      (part.items || []).forEach((item) =>
        results.push({ request_id: item.request_id, outcome: "FAILED", code: "REQUEST_FAILED", message: part.message || "Could not reach the server" })
      );
    }
  });
  const summary = { requested: results.length, succeeded: 0, skipped: 0, failed: 0 };
  results.forEach((r) => {
    if (r.outcome === "SUCCEEDED") summary.succeeded += 1;
    else if (r.outcome === "SKIPPED") summary.skipped += 1;
    else summary.failed += 1;
  });
  return { summary, results, problems: results.filter((r) => r.outcome !== "SUCCEEDED") };
}

module.exports = {
  BULK_ACTION,
  BULK_CHUNK,
  bulkActionsFor,
  isSelectable,
  selectionItem,
  selectionScope,
  toggleRow,
  togglePage,
  pageState,
  selectionFromTargets,
  chunk,
  confirmTitle,
  reasonRequired,
  reasonError,
  mergeBulkResults,
};
