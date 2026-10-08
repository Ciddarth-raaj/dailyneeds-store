/**
 * HISTORICAL OT REVIEW - what the screen says about each preview line.
 *
 * The server decides every action (`utils/ot_historical_review.js` there,
 * plus a dry run of the real OT sync). Nothing here decides one: it names the
 * server's decision in words and says which lines may be selected.
 */

const CREATE_ACTIONS = Object.freeze(["CREATE_PENDING_OT", "CREATE_PENDING_OT_PRIOR_MONTH_SETTLEMENT"]);

const ACTION_LABEL = Object.freeze({
  CREATE_PENDING_OT: "Create Pending OT",
  CREATE_PENDING_OT_PRIOR_MONTH_SETTLEMENT: "Create Pending OT – Prior-Month OT if approved",
  SKIP_EXISTING_PENDING: "Already pending approval",
  SKIP_EXISTING_APPROVED: "Already approved",
  SKIP_EXISTING_REJECTED: "Already rejected",
  SKIP_CLOSED_AT_PAYROLL_LOCK: "Closed at payroll lock",
  SKIP_ALREADY_PAID: "Already paid / settling",
  SKIP_ALREADY_REVIEWED: "Already raised by a review",
  SKIP_PREVIOUSLY_WITHDRAWN: "Previously withdrawn – not reopened",
  SKIP_PREVIOUSLY_REVOKED: "Decision revoked by an administrator – not reopened",
  SKIP_ATTENDANCE_INCOMPLETE: "Attendance incomplete",
  SKIP_CORRECTION_PENDING: "Attendance correction pending",
  SKIP_OUTSIDE_EMPLOYMENT: "Outside employment",
  SKIP_ON_OR_AFTER_CUTOVER: "Automatic OT handles this date",
  SKIP_NO_APPROVAL_CHAIN: "No approver configured",
});

const PAYROLL_LABEL = Object.freeze({
  NOT_CALCULATED: "Not calculated",
  CALCULATED: "Calculated (unlocked)",
  APPROVED_LOCKED: "Approved & Locked",
  PUBLISHED: "Published",
});

function actionLabel(action) {
  if (ACTION_LABEL[action]) return ACTION_LABEL[action];
  // A reason the dry run of the OT sync gave (SKIP_INCOMPLETE_DAY, ...).
  return String(action || "").replace(/^SKIP_/, "Not raised: ").replace(/_/g, " ").toLowerCase().replace(/^not raised:/, "Not raised:");
}

const isCreatable = (line) => !!line && CREATE_ACTIONS.includes(line.proposed_action);

const keyOf = (line) => `${line.employee_id}|${line.attendance_date}`;

/** The items an authorisation sends: only selected, creatable lines. */
function selectedItems(lines, selected) {
  return (lines || [])
    .filter((l) => isCreatable(l) && selected.has(keyOf(l)))
    .map((l) => ({ employee_id: l.employee_id, attendance_date: l.attendance_date }));
}

/** "What happens next" for the confirmation, in plain words. */
function confirmationSummary(lines, selected) {
  const chosen = (lines || []).filter((l) => isCreatable(l) && selected.has(keyOf(l)));
  const minutes = chosen.reduce((n, l) => n + (l.dry_run && l.dry_run.ot_minutes !== undefined ? l.dry_run.ot_minutes : l.calculated_ot_minutes), 0);
  const prior = chosen.filter((l) => l.proposed_action === "CREATE_PENDING_OT_PRIOR_MONTH_SETTLEMENT").length;
  return {
    entries: chosen.length,
    employees: new Set(chosen.map((l) => l.employee_id)).size,
    minutes,
    prior_month: prior,
  };
}

/*
 * THE SUMMARY CARDS ARE FILTERS. Each card narrows the table to the lines it
 * counts, by the same rule the server counted them with - so the rows shown
 * under a card always add up to the card.
 */
const LOCKED_PAYROLL = Object.freeze(["APPROVED_LOCKED", "PUBLISHED"]);
const CARD_FILTER = Object.freeze({
  ALL: "ALL",
  WITHOUT_REQUEST: "WITHOUT_REQUEST",
  TO_CREATE: "TO_CREATE",
  LOCKED: "LOCKED",
});
const CARD_FILTER_LABEL = Object.freeze({
  ALL: "all calculated OT",
  WITHOUT_REQUEST: "without an approval request",
  TO_CREATE: "to create",
  LOCKED: "locked / published payroll",
});
const CARD_TEST = {
  ALL: () => true,
  // `summarize` on the server: no live (non-cancelled) request.
  WITHOUT_REQUEST: (l) => !l.existing_status,
  TO_CREATE: isCreatable,
  LOCKED: (l) => LOCKED_PAYROLL.includes(l.payroll_status),
};

function filterLines(lines, filter) {
  const test = CARD_TEST[filter] || CARD_TEST.ALL;
  return (lines || []).filter(test);
}

/** Entries, minutes and DISTINCT employees of the lines a card counts. */
function cardTotals(lines, filter) {
  const chosen = filterLines(lines, filter);
  return {
    entries: chosen.length,
    minutes: chosen.reduce((n, l) => n + (Number(l.calculated_ot_minutes) || 0), 0),
    employees: new Set(chosen.map((l) => l.employee_id)).size,
  };
}

module.exports = {
  CARD_FILTER,
  CARD_FILTER_LABEL,
  filterLines,
  cardTotals, CREATE_ACTIONS, ACTION_LABEL, PAYROLL_LABEL, actionLabel, isCreatable, keyOf, selectedItems, confirmationSummary };
