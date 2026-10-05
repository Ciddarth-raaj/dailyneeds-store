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

/** The server's statuses. Mirrored, never re-derived - see the header. */
const STATUS = {
  NOT_CALCULATED: "NOT_CALCULATED",
  /**
   * CALCULATED, BUT FROM AN ATTENDANCE MONTH THAT IS NOT SETTLED.
   *
   * The server sends this instead of CALCULATED when the attendance the
   * figures were priced from is missing or not final, and it sends the
   * attendance-dependent figures as null beside it - so Salary Days, the OT,
   * the PF, the ESI and the Net Pay render as an em dash rather than as a
   * zero. Nothing in this file decides that; the flag and the nulls arrive.
   */
  ATTENDANCE_PENDING: "ATTENDANCE_PENDING",
  CALCULATED: "CALCULATED",
  RECALCULATION_REQUIRED: "RECALCULATION_REQUIRED",
  READY_FOR_APPROVAL: "READY_FOR_APPROVAL",
  APPROVED_LOCKED: "APPROVED_LOCKED",
  PUBLISHED: "PUBLISHED",
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
/*
 * CALCULABLE IS THE SERVER'S VERDICT. `row.calculable` is the shared payroll
 * readiness Calculate itself enforces; a row it is false on is not offered a
 * Calculate button and is not counted as eligible.
 */
const isCalculable = (row) =>
  Boolean(row && row.status === STATUS.NOT_CALCULATED && row.calculable !== false);

/** Process Attendance is offered where the server says it would clear a blocker. */
const isAttendanceProcessable = (row) =>
  Boolean(row && !isLocked(row) && row.attendance_processable === true);

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
        /* A pending-attendance row HAS a calculation, so it can be refreshed -
           and refreshing it is exactly what somebody does the moment the
           attendance month is settled. */
        row.status === STATUS.ATTENDANCE_PENDING ||
        row.status === STATUS.RECALCULATION_REQUIRED ||
        row.status === STATUS.READY_FOR_APPROVAL) &&
      /* ...and only when the server says Calculate would accept it now. */
      row.calculable !== false
  );

/** ONLY A READY ROW MAY BE APPROVED. The server refuses anything else. */
const isApprovable = (row) => Boolean(row && row.status === STATUS.READY_FOR_APPROVAL);

/** A locked row is frozen: nothing on this screen may act on it. */
/* Approved & Locked and Published are both locked: nothing recalculates,
   resets or edits either. */
const isLocked = (row) =>
  Boolean(row && (row.status === STATUS.APPROVED_LOCKED || row.status === STATUS.PUBLISHED));

/* The lifecycle actions are offered by the server's status; it re-decides each. */
const isUnlockable = (row) => Boolean(row && row.status === STATUS.APPROVED_LOCKED);
const isPublishable = (row) => Boolean(row && row.status === STATUS.APPROVED_LOCKED);
const isUnpublishable = (row) => Boolean(row && row.status === STATUS.PUBLISHED);

/** "18 unlocked, 2 skipped — already published, 1 skipped — not approved." */
const LIFECYCLE_DONE = {
  UNLOCK: ["UNLOCKED", "unlocked"],
  PUBLISH: ["PUBLISHED", "payslips published"],
  UNPUBLISH: ["UNPUBLISHED", "payslips unpublished"],
};
/*
 * A PUBLISHED PAYSLIP IS COUNTED BY WHAT HAPPENED TO ITS NOTIFICATION, because
 * "published" and "the employee was told" are two different facts:
 * "198 payslips published and notified, 8 published, Telegram notification
 * failed, 12 published, no Telegram link".
 */
const PUBLISHED_BY_NOTIFICATION = [
  ["QUEUED", "published, Telegram notification queued"],
  ["SENDING", "published, Telegram notification sending"],
  ["SENT", "published and notified"],
  ["FAILED", "published, Telegram notification failed"],
  ["NO_TELEGRAM_LINK", "published, no Telegram link"],
  ["NOT_ATTEMPTED", "published, not notified"],
];
function lifecycleOutcomeMessage(result) {
  if (!result) return "Nothing was changed.";
  const done = LIFECYCLE_DONE[result.action] || ["", "done"];
  const counts = new Map();
  const rows = result.results || [];
  const n = rows.filter((r) => r && r.result === done[0]).length;
  const parts = [];
  if (result.action === "PUBLISH") {
    PUBLISHED_BY_NOTIFICATION.forEach(([status, text]) => {
      const k = rows.filter((r) => r && r.result === "PUBLISHED" && (r.notification_status || "NOT_ATTEMPTED") === status).length;
      if (k > 0) parts.push(`${k} ${k === 1 ? "payslip" : "payslips"} ${text}`);
    });
  } else if (n > 0) {
    parts.push(`${n} ${done[1]}`);
  }
  rows
    .filter((r) => r && r.result !== done[0])
    .forEach((r) => {
      const text = String(r.message || r.result).replace(/^Skipped — /, "skipped — ").replace(/\..*$/, "");
      counts.set(text, (counts.get(text) || 0) + 1);
    });
  counts.forEach((count, text) => parts.push(`${count} ${text}`));
  return parts.length > 0 ? `${parts.join(", ")}.` : "Nothing was changed.";
}
const lifecycleHasRefusals = (result) =>
  Boolean(result) &&
  (result.results || []).some(
    (r) =>
      r &&
      (r.result !== (LIFECYCLE_DONE[result.action] || [])[0] ||
        (result.action === "PUBLISH" &&
          r.notification_status &&
          !["SENT", "QUEUED", "SENDING"].includes(r.notification_status)))
  );
function lifecycleRefusalDetail(result) {
  const done = (LIFECYCLE_DONE[result && result.action] || [])[0];
  const refused = ((result && result.results) || []).filter((r) => r && r.result !== done && r.message);
  if (refused.length === 0) return null;
  const first = refused[0];
  const who = first.employee_name ? `${first.employee_name} (${first.employee_id}): ` : `Employee ${first.employee_id}: `;
  return `${who}${first.message}${refused.length > 1 ? ` (and ${refused.length - 1} more)` : ""}`;
}

/* ------------------------------------------------------------ payslips */

/*
 * THE PAYSLIP TIMES ARE UTC. `published_at`, `first_viewed_at`,
 * `last_viewed_at` and the notification attempt times are written with the
 * database's CURRENT_TIMESTAMP, which runs in UTC, so they are converted to
 * IST here - through the same `istParts` every other screen uses - before
 * anybody reads them. Printed unconverted they were 5:30 behind.
 */
const { istParts } = require("./displayDate");

/** Telegram notification status of a published payslip, as a badge. */
const NOTIFICATION_BADGE = {
  QUEUED: { label: "Telegram Queued", scheme: "purple" },
  SENDING: { label: "Telegram Sending", scheme: "purple" },
  SENT: { label: "Telegram Sent", scheme: "green" },
  FAILED: { label: "Telegram Failed", scheme: "red" },
  NO_TELEGRAM_LINK: { label: "No Telegram Link", scheme: "orange" },
  NOT_ATTEMPTED: { label: "Not Notified", scheme: "gray" },
};
function notificationBadge(payslip) {
  if (!payslip) return null;
  return NOTIFICATION_BADGE[payslip.notification_status] || NOTIFICATION_BADGE.NOT_ATTEMPTED;
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** UTC "2026-10-04 09:42:10" -> "4 Oct 2026, 15:12" (IST). */
function formatViewedAt(value) {
  const t = istParts(value);
  if (!t) return "";
  return `${Number(t.day)} ${MONTH_SHORT[Number(t.month) - 1]} ${t.year}, ${t.hour}:${t.minute}`;
}

/** The same, without the year, for the compact row line: "4 Oct, 15:12" (IST). */
function formatViewedAtShort(value) {
  const t = istParts(value);
  if (!t) return "";
  return `${Number(t.day)} ${MONTH_SHORT[Number(t.month) - 1]}, ${t.hour}:${t.minute}`;
}

/**
 * A PUBLISHED PAYSLIP'S TWO FACTS, AS ONE QUIET LINE for the employee row:
 * "Telegram sent · Viewed 5 Oct, 14:14". Only what needs attention is
 * coloured - a failed or impossible notification - and the colour is never
 * the only signal: the words say it. The full badges stay in View Payslip.
 */
const NOTIFICATION_TEXT = {
  QUEUED: { text: "Telegram queued", tone: "muted" },
  SENDING: { text: "Telegram sending", tone: "muted" },
  SENT: { text: "Telegram sent", tone: "muted" },
  FAILED: { text: "Telegram failed", tone: "problem" },
  NO_TELEGRAM_LINK: { text: "No Telegram link", tone: "warning" },
  NOT_ATTEMPTED: { text: "Not notified", tone: "warning" },
};
function payslipSummary(payslip) {
  if (!payslip) return null;
  const notification = NOTIFICATION_TEXT[payslip.notification_status] || NOTIFICATION_TEXT.NOT_ATTEMPTED;
  const viewed =
    payslip.viewed && payslip.first_viewed_at
      ? { text: `Viewed ${formatViewedAtShort(payslip.first_viewed_at)}`, title: `First viewed ${formatViewedAt(payslip.first_viewed_at)} IST` }
      : { text: "Not viewed", title: "The employee has not opened this payslip yet" };
  return { notification, viewed };
}

/**
 * PROOF OF ACCESS, never acceptance: "Not Viewed" or "Viewed on 4 Oct 2026, 09:42".
 */
function viewBadge(payslip) {
  if (!payslip) return null;
  if (!payslip.viewed || !payslip.first_viewed_at) return { label: "Not Viewed", scheme: "gray" };
  return { label: `Viewed on ${formatViewedAt(payslip.first_viewed_at)}`, scheme: "teal" };
}

/** A notification still waiting in the outbox or being sent right now. */
const isNotificationPending = (row) =>
  Boolean(row && row.payslip && ["QUEUED", "SENDING"].includes(row.payslip.notification_status));

/**
 * Retry Notification is offered for a published payslip whose employee was
 * not told - not while one is already queued or sending.
 */
const isNotificationRetryable = (row) =>
  Boolean(
    row &&
      row.status === STATUS.PUBLISHED &&
      row.payslip &&
      !["SENT", "QUEUED", "SENDING"].includes(row.payslip.notification_status)
  );

/** View Payslip is offered on a published row that has a payslip. */
const hasPayslip = (row) => Boolean(row && row.status === STATUS.PUBLISHED && row.payslip);

/** "3 — Notification queued; 2 — Skipped — already notified." */
function retryOutcomeMessage(result) {
  if (!result) return "Nothing was queued.";
  const counts = new Map();
  (result.results || []).forEach((r) => {
    if (!r) return;
    const text = String(r.message || r.result).replace(/\.$/, "");
    counts.set(text, (counts.get(text) || 0) + 1);
  });
  const parts = [];
  counts.forEach((count, text) => parts.push(`${count} — ${text}`));
  return parts.length > 0 ? `${parts.join("; ")}.` : "Nothing was queued.";
}
const retryHasRefusals = (result) =>
  Boolean(result) && (result.results || []).some((r) => r && r.result !== "QUEUED");
function retryRefusalDetail(result) {
  const queued = ((result && result.results) || []).filter((r) => r && r.result === "QUEUED");
  return queued.length > 0
    ? "Queued notifications are sent in the background; the badges update on refresh."
    : null;
}

/**
 * RESET CALCULATION IS OFFERED where a calculation exists and nobody has
 * approved it. This only decides which button to DRAW: the server re-decides
 * every employee on a held row lock and refuses anyone locked meanwhile.
 */
const isResettable = (row) =>
  Boolean(
    row &&
      (row.status === STATUS.CALCULATED ||
        row.status === STATUS.ATTENDANCE_PENDING ||
        row.status === STATUS.RECALCULATION_REQUIRED ||
        row.status === STATUS.READY_FOR_APPROVAL)
  );

/** The reset reasons the server accepts, with the words the screen shows. */
const RESET_REASON_OPTIONS = [
  { value: "ATTENDANCE_CORRECTED", label: "Attendance corrected" },
  { value: "SALARY_MASTER_CORRECTED", label: "Salary Master corrected" },
  { value: "WRONG_OT", label: "Wrong OT" },
  { value: "WRONG_ADDITION_DEDUCTION", label: "Wrong addition/deduction" },
  { value: "OTHER", label: "Other" },
];
const RESET_REMARK_MAX = 500;

/**
 * WHY THE CONFIRM BUTTON IS DISABLED, or null when the form may be sent. The
 * server applies the same rule and refuses the request regardless.
 */
function resetFormProblem({ reason, remark }) {
  if (!RESET_REASON_OPTIONS.some((o) => o.value === reason)) return "Choose a reset reason.";
  const text = (remark || "").trim();
  if (reason === "OTHER" && text === "") return "A remark is required when the reason is Other.";
  if (text.length > RESET_REMARK_MAX) return `The remark must be at most ${RESET_REMARK_MAX} characters.`;
  return null;
}

/**
 * "8 reset successfully, 2 skipped — payroll locked." Each kind of skip is
 * named, because "2 skipped" alone does not say who has to do what next.
 */
function resetOutcomeMessage(result) {
  if (!result) return "Nothing was changed.";
  const parts = [];
  const add = (count, text) => {
    const n = Number(count || 0);
    if (n > 0) parts.push(`${n} ${text}`);
  };
  add(result.reset_count, "reset successfully");
  add(result.locked_count, "skipped — payroll locked");
  add(result.skipped_count, "skipped — not calculated");
  add(result.not_in_scope_count, "skipped — not in this month or your branches");
  add(result.failed_count, "could not be reset");
  return parts.length > 0 ? `${parts.join(", ")}.` : "Nothing was changed.";
}

/** "3 processed (2 now clear), 1 skipped - needs attention in Attendance." */
function processOutcomeMessage(result) {
  if (!result) return "Nothing was changed.";
  const parts = [];
  const add = (count, text) => {
    const n = Number(count || 0);
    if (n > 0) parts.push(`${n} ${text}`);
  };
  const processed = Number(result.processed_count || 0);
  if (processed > 0) parts.push(`${processed} processed (${Number(result.cleared_count || 0)} now clear)`);
  add(result.skipped_count, "skipped — needs a fix in Attendance");
  add(result.locked_count, "skipped — payroll locked");
  add(result.not_in_scope_count, "not in this month or your branches");
  add(result.failed_count, "could not be processed");
  return parts.length > 0 ? `${parts.join(", ")}.` : "Nothing was changed.";
}

/** Whether a Process Attendance run left anybody still blocked. */
const processHasRefusals = (result) =>
  Boolean(result) &&
  ((result.results || []).some((r) => r && (r.result !== "PROCESSED" || (r.blockers || []).length > 0)));

/** The first employee still blocked after processing, in the server's words. */
function processRefusalDetail(result) {
  const open = ((result && result.results) || []).filter(
    (r) => r && r.message && (r.result !== "PROCESSED" || (r.blockers || []).length > 0)
  );
  if (open.length === 0) return null;
  const first = open[0];
  const who = first.employee_name ? `${first.employee_name} (${first.employee_id}): ` : `Employee ${first.employee_id}: `;
  const more = open.length > 1 ? ` (and ${open.length - 1} more)` : "";
  return `${who}${first.message}${more}`;
}

/** Whether a reset left anybody as they were. */
const resetHasRefusals = (result) =>
  Boolean(result) && Number(result.reset_count || 0) < ((result.results || []).length || 0);

/** The first non-reset employee's reason, in the server's words. */
function resetRefusalDetail(result) {
  const refused = ((result && result.results) || []).filter(
    (r) => r && r.result !== "RESET" && r.message
  );
  if (refused.length === 0) return null;
  const first = refused[0];
  const who = first.employee_name
    ? `${first.employee_name} (${first.employee_id}): `
    : first.employee_id != null
    ? `Employee ${first.employee_id}: `
    : "";
  const more = refused.length > 1 ? ` (and ${refused.length - 1} more)` : "";
  return `${who}${first.message}${more}`;
}

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

/**
 * THE REASON TO SHOW WITH A PARTIAL OUTCOME. A refusal such as "attendance
 * changed after the month was calculated" lives only in the result, not on
 * the row, so the toast carries the first one and says how many more there
 * are. The text is the server's; nothing is paraphrased here.
 */
const REFUSED_RESULTS = ["BLOCKED", "FAILED", "NOT_IN_SCOPE"];
function refusalDetail(result) {
  const refused = ((result && result.results) || []).filter(
    (r) => r && REFUSED_RESULTS.includes(r.result) && r.message
  );
  if (refused.length === 0) return null;
  const first = refused[0];
  const who = first.employee_id != null ? `Employee ${first.employee_id}: ` : "";
  const more = refused.length > 1 ? ` (and ${refused.length - 1} more)` : "";
  return `${who}${first.message}${more}`;
}

/** The badge colour for a status. Presentation only; the label is the server's. */
function statusScheme(status) {
  if (status === STATUS.PUBLISHED) return "blue";
  if (status === STATUS.APPROVED_LOCKED) return "green";
  if (status === STATUS.READY_FOR_APPROVAL) return "teal";
  if (status === STATUS.RECALCULATION_REQUIRED) return "orange";
  /* Distinct from the orange of a moved source: this row is not stale, it is
     waiting on somebody else settling the attendance month. */
  if (status === STATUS.ATTENDANCE_PENDING) return "yellow";
  if (status === STATUS.CALCULATED) return "purple";
  return "gray";
}

module.exports = {
  payslipSummary,
  formatViewedAtShort,
  STATUS,
  isCalculable,
  isRecalculable,
  isApprovable,
  isLocked,
  isResettable,
  isAttendanceProcessable,
  isUnlockable,
  isPublishable,
  isUnpublishable,
  isNotificationRetryable,
  isNotificationPending,
  hasPayslip,
  notificationBadge,
  viewBadge,
  formatViewedAt,
  retryOutcomeMessage,
  retryHasRefusals,
  retryRefusalDetail,
  lifecycleOutcomeMessage,
  lifecycleHasRefusals,
  lifecycleRefusalDetail,
  processOutcomeMessage,
  processHasRefusals,
  processRefusalDetail,
  RESET_REASON_OPTIONS,
  RESET_REMARK_MAX,
  resetFormProblem,
  resetOutcomeMessage,
  resetHasRefusals,
  resetRefusalDetail,
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
  refusalDetail,
  statusScheme,
};
