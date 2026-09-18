/**
 * Payrun Calculation & Review - the browser's pure parts.
 *
 * SEPARATED SO THEY CAN BE TESTED WITHOUT A BROWSER, an axios instance or a
 * React tree, exactly as `util/payrunAdjustments.js` and
 * `util/payrunSelection.js` are. `node --test` runs a dependency-free CommonJS
 * module directly.
 *
 * WHAT IS **NOT** HERE, AND DELIBERATELY: there is no formula, no rate, no
 * rounding, no PF rule, no ESI rule, no net pay arithmetic and no status
 * derivation. Every one of those is the server's answer, arriving on the row.
 * A copy of any of them here would be a second payroll engine in a browser,
 * and the two would disagree the first time one was changed - on a screen
 * whose entire purpose is to show what somebody is about to be paid.
 *
 * WHAT **IS** here is selection and wording: which rows an action may apply
 * to, what the buttons say, and what a confirmation dialog warns about. Those
 * are browser concerns with no server counterpart.
 */

/** The server's five statuses. Mirrored, never re-derived - see the header. */
const STATUS = {
  NOT_CALCULATED: "NOT_CALCULATED",
  CALCULATED: "CALCULATED",
  RECALCULATION_REQUIRED: "RECALCULATION_REQUIRED",
  READY_FOR_APPROVAL: "READY_FOR_APPROVAL",
  APPROVED_LOCKED: "APPROVED_LOCKED",
};

/**
 * WHICH ROWS EACH ACTION MAY APPLY TO, AND THE SERVER'S VERDICT DECIDES EVERY
 * ONE OF THEM.
 *
 * `row.status` is what the server computed from this employee's real salary,
 * attendance, approved OT, adjustments and lock. Re-deriving any of that from
 * the figures on screen would be a second copy of the state machine, and the
 * copy would be the one that lets somebody approve a stale month.
 */
const isCalculable = (row) => Boolean(row && row.status === STATUS.NOT_CALCULATED);

/**
 * RECALCULATE IS OFFERED ON ANYTHING CALCULATED AND NOT LOCKED, not only on
 * the stale ones. Refreshing a calculation that has not drifted produces the
 * same figures and costs nothing, and somebody who has just fixed a punch
 * should not have to wait for a screen to agree that it mattered before they
 * can act.
 */
const isRecalculable = (row) =>
  Boolean(
    row &&
      (row.status === STATUS.CALCULATED ||
        row.status === STATUS.RECALCULATION_REQUIRED ||
        row.status === STATUS.READY_FOR_APPROVAL)
  );

/** ONLY A READY ROW MAY BE APPROVED. The server refuses anything else. */
const isApprovable = (row) => Boolean(row && row.status === STATUS.READY_FOR_APPROVAL);

/** A locked row is frozen: nothing on this screen may act on it. */
const isLocked = (row) => Boolean(row && row.status === STATUS.APPROVED_LOCKED);

const calculableEmployeeIds = (rows) => (rows || []).filter(isCalculable).map((r) => r.employee_id);
const recalculableEmployeeIds = (rows) =>
  (rows || []).filter(isRecalculable).map((r) => r.employee_id);
const approvableEmployeeIds = (rows) => (rows || []).filter(isApprovable).map((r) => r.employee_id);

/* ------------------------------------------------------------- selection */

function toggleSelection(selected, employeeId, checked) {
  const next = (selected || []).filter((id) => id !== employeeId);
  if (checked) next.push(employeeId);
  return next;
}

/** A selection never outlives the rows it was made on. */
function pruneSelection(selected, selectable) {
  return (selected || []).filter((id) => (selectable || []).includes(id));
}

function isAllSelected(selectable, selected) {
  return (
    (selectable || []).length > 0 &&
    (selectable || []).every((id) => (selected || []).includes(id))
  );
}

function nextSelectAll(selectable, selected) {
  return isAllSelected(selectable, selected) ? [] : [...(selectable || [])];
}

/**
 * WHICH SELECTED ROWS AN ACTION WOULD ACTUALLY APPLY TO.
 *
 * ONE SELECTION SERVES THREE BUTTONS on this screen - Recalculate, Approve and
 * the row actions - and the three accept different rows. Sending the whole
 * selection to each would mean every bulk action coming back with refusals
 * somebody could have been told about before they pressed it.
 */
function eligibleWithin(rows, selectedIds, predicate) {
  return (rows || [])
    .filter((row) => (selectedIds || []).includes(row.employee_id))
    .filter(predicate)
    .map((row) => row.employee_id);
}

/* ------------------------------------------------------------ the wording */

/**
 * THE APPROVAL DIALOG'S WORDS, AND THEY SAY WHAT IS IRREVERSIBLE.
 *
 * "Approve 84 employees?" invites a click. What somebody should read before
 * signing off eighty-four people's pay is that it locks each of those months -
 * no recalculation, no adjustment edit, no pay type change - and that their
 * name goes on it.
 */
function approveMessage(count) {
  const who = count === 1 ? "this employee" : `these ${count} employees`;
  return (
    `Approve and lock ${who}?\n\n` +
    "Approving locks each employee's payroll for this month: it cannot be recalculated, " +
    "their adjustments cannot be edited and their pay type cannot be changed. " +
    "Your name and the time are recorded against it.\n\n" +
    "It locks only the employees you have selected. Everybody else in the month is unaffected."
  );
}

/** The recalculate dialog. It says what is refreshed and what is kept. */
function recalculateMessage(count) {
  const who = count === 1 ? "this employee" : `these ${count} employees`;
  return (
    `Recalculate ${who}?\n\n` +
    "This re-reads the approved salary, the attendance result, the approved OT and the " +
    "effective NRM as they are now. Incentive, Bonus, Arrears, the recoveries, the Balance " +
    "Advance and this month's pay type are kept exactly as they are."
  );
}

/**
 * WHAT A BULK RESULT ACTUALLY DID, said as a partial outcome when it was one.
 *
 * "12 calculated" on a run where three were locked and two failed is a lie by
 * omission, and the five would sit there until somebody noticed.
 */
function outcomeMessage(result) {
  if (!result) return "Nothing was changed.";
  const parts = [];
  const add = (count, text) => {
    const n = Number(count || 0);
    if (n > 0) parts.push(`${n} ${text}`);
  };
  add(result.calculated_count, "calculated");
  add(result.recalculated_count, "recalculated");
  add(result.approved_count, "approved and locked");
  add(result.skipped_count, "skipped");
  add(result.already_locked_count, "already locked");
  add(result.locked_count, "locked");
  add(result.blocked_count, "not ready");
  add(result.failed_count, "could not be calculated");
  add(result.not_in_scope_count, "not in this month");
  return parts.length > 0 ? `${parts.join(", ")}.` : "Nothing was changed.";
}

/** Did anything in this result need somebody's attention? */
function hasRefusals(result) {
  if (!result) return false;
  return (
    Number(result.blocked_count || 0) +
      Number(result.failed_count || 0) +
      Number(result.locked_count || 0) +
      Number(result.not_in_scope_count || 0) >
    0
  );
}

/** The badge colour for a status. Presentation only; the label is the server's. */
function statusScheme(status) {
  if (status === STATUS.APPROVED_LOCKED) return "green";
  if (status === STATUS.READY_FOR_APPROVAL) return "teal";
  if (status === STATUS.RECALCULATION_REQUIRED) return "orange";
  if (status === STATUS.CALCULATED) return "purple";
  return "gray";
}

module.exports = {
  STATUS,
  isCalculable,
  isRecalculable,
  isApprovable,
  isLocked,
  calculableEmployeeIds,
  recalculableEmployeeIds,
  approvableEmployeeIds,
  toggleSelection,
  pruneSelection,
  isAllSelected,
  nextSelectAll,
  eligibleWithin,
  approveMessage,
  recalculateMessage,
  outcomeMessage,
  hasRefusals,
  statusScheme,
};
