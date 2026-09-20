/**
 * Payrun - the workflow tabs, the shared search, and the attendance vocabulary.
 *
 * WHY A MODULE RATHER THAN THREE FILTER BARS. Initialization, Adjustments and
 * Calculation & Review are three views of ONE month and of the same three
 * hundred people. A month end is exception work - ten employees need something
 * and a hundred and ninety do not - and the job of these tabs is to put the
 * ten in front of somebody without making them scroll past the rest.
 *
 * NOTHING HERE DECIDES A STATUS, A COUNT OR A READINESS. Every tab's
 * membership is a value the SERVER put on the row, and every count below is
 * arithmetic over rows the server has already classified. A browser that
 * decided who was attendance-pending would be a second copy of a payroll rule,
 * and it would be the copy somebody believed.
 *
 * THE COUNTS ARE OVER THE WHOLE MONTH, NEVER THE FILTERED VIEW. "Ready for
 * approval (0)" meaning "none matching your search" is the single most
 * dangerous number these screens could show.
 */

/** The attendance dimension. Mirrors the server's `ATTENDANCE_STATUS`. */
const ATTENDANCE_STATUS = {
  READY: "READY",
  PENDING: "PENDING",
  CLOSED_FOR_PAYROLL: "CLOSED_FOR_PAYROLL",
};

/**
 * CLOSED IS NOT READY, AND THE BADGE MUST NOT SAY IT IS.
 *
 * A closed employee is being paid on a basis somebody ACCEPTED with known gaps
 * in it; a ready one had no gaps. The figures are equally real and equally
 * payable - what differs is whether anything is still outstanding, and the
 * person approving the month is entitled to see which of the two they are
 * signing. So they get different words and different colours, never one badge.
 */
const ATTENDANCE_STATUS_LABEL = {
  [ATTENDANCE_STATUS.READY]: "Ready",
  [ATTENDANCE_STATUS.PENDING]: "Pending",
  [ATTENDANCE_STATUS.CLOSED_FOR_PAYROLL]: "Closed for payroll",
};

const ATTENDANCE_STATUS_SCHEME = {
  [ATTENDANCE_STATUS.READY]: "green",
  [ATTENDANCE_STATUS.PENDING]: "orange",
  /* Blue, not green: accepted is not the same as settled. */
  [ATTENDANCE_STATUS.CLOSED_FOR_PAYROLL]: "blue",
};

/**
 * WHERE EACH UNRESOLVED ITEM IS ACTUALLY FIXED.
 *
 * The drawer's job is to end with somebody on the screen that can settle the
 * thing, so each unresolved code carries the route that settles it. Held dates
 * deep-link to the exact employee and date, which `/attendance/calculated`
 * already supports; the two approval queues are their own screens and are not
 * redesigned or filtered from here.
 */
function unresolvedLink(item, { employee_id } = {}) {
  if (!item) return null;
  if (item.code === "PENDING_REGULARIZATION") return "/attendance/approval";
  if (item.code === "PENDING_OT") return "/attendance/approval?type=OT";
  if (item.code === "NO_ATTENDANCE_MONTH" || item.code === "ATTENDANCE_NOT_FINAL") {
    const date = Array.isArray(item.dates) && item.dates.length > 0 ? item.dates[0] : null;
    const query = [
      employee_id ? `employee_id=${encodeURIComponent(employee_id)}` : null,
      date ? `date=${encodeURIComponent(date)}` : null,
    ].filter(Boolean);
    return query.length > 0 ? `/attendance/calculated?${query.join("&")}` : "/attendance/calculated";
  }
  return null;
}

/** One held date's own deep link, so a list of dates is a list of links. */
function heldDateLink(employeeId, date) {
  return `/attendance/calculated?employee_id=${encodeURIComponent(
    employeeId
  )}&date=${encodeURIComponent(date)}`;
}

/* ------------------------------------------------------------- the tabs */

/** Every tab list starts with ALL, which is never hidden. */
const ALL = "ALL";

/**
 * INITIALIZATION. `attendance` narrows the ATTENDANCE dimension, `status` the
 * payrun one and `lifecycle` the employment one - three independent questions,
 * which is why a tab names exactly one of them and leaves the others alone.
 */
const INITIALIZATION_TABS = [
  { key: ALL, label: "All" },
  { key: "ATTENDANCE_PENDING", label: "Attendance Pending", attendance: ATTENDANCE_STATUS.PENDING },
  { key: "READY", label: "Ready", status: "READY" },
  { key: "INITIALIZED", label: "Initialized", status: "INITIALIZED" },
  { key: "EXITED", label: "Exited", lifecycle: "EXITED" },
];

const ADJUSTMENT_TABS = [
  { key: ALL, label: "All" },
  { key: "HAS_ADJUSTMENT", label: "Has Adjustment", state: "HAS_ADJUSTMENT" },
  {
    key: "NO_ADJUSTMENT_PENDING_CONFIRMATION",
    label: "No Adjustment Pending",
    state: "NO_ADJUSTMENT_PENDING_CONFIRMATION",
  },
  { key: "NO_ADJUSTMENT_CONFIRMED", label: "Confirmed", state: "NO_ADJUSTMENT_CONFIRMED" },
];

const CALCULATION_TABS = [
  { key: ALL, label: "All" },
  { key: "ATTENDANCE_PENDING", label: "Attendance Pending", status: "ATTENDANCE_PENDING" },
  { key: "RECALCULATION_REQUIRED", label: "Recalculation Required", status: "RECALCULATION_REQUIRED" },
  { key: "READY_FOR_APPROVAL", label: "Ready for Approval", status: "READY_FOR_APPROVAL" },
  { key: "APPROVED_LOCKED", label: "Approved & Locked", status: "APPROVED_LOCKED" },
];

/**
 * THE TAB EACH STAGE OPENS ON, and it is the one with work in it.
 *
 * Staff open this screen to finish a month, not to admire it. Landing on ALL
 * means scrolling past two hundred finished employees to find the ten that
 * need something - so each stage opens on its most actionable queue, and ALL
 * is one click away and never hidden.
 *
 * APPROVED & LOCKED IS DELIBERATELY NOT A DEFAULT anywhere: it is the only
 * tab that is definitionally finished work.
 */
const DEFAULT_TAB = {
  INITIALIZATION: "ATTENDANCE_PENDING",
  ADJUSTMENTS: "NO_ADJUSTMENT_PENDING_CONFIRMATION",
  CALCULATION: "ATTENDANCE_PENDING",
};

/** The filter parameters a tab contributes. ALL contributes none. */
function tabFilters(tabs, key) {
  const tab = (tabs || []).find((t) => t.key === key);
  if (!tab || tab.key === ALL) return {};
  const filters = {};
  if (tab.status) filters.status = tab.status;
  if (tab.state) filters.state = tab.state;
  if (tab.lifecycle) filters.lifecycle = tab.lifecycle;
  if (tab.attendance) filters.attendance_status = tab.attendance;
  return filters;
}

/**
 * THE COUNT BESIDE EACH TAB, taken from the server's month summary.
 *
 * `undefined` rather than 0 where the summary does not carry a count: a tab
 * showing "(0)" says there is nothing to do there, and saying that when the
 * truth is "nobody counted" is worse than showing no number at all.
 */
function tabCount(stage, key, summary = {}) {
  const at = (name) => (summary && typeof summary[name] === "number" ? summary[name] : undefined);

  if (stage === "INITIALIZATION") {
    if (key === ALL) return at("total_eligible");
    if (key === "ATTENDANCE_PENDING") return at("attendance_pending");
    if (key === "READY") return at("ready");
    if (key === "INITIALIZED") return at("initialized");
    return undefined; // EXITED is a lifecycle cut the summary does not carry
  }

  /* The adjustments stage names its counts `*_count`; they are read by the
     name the server actually sends rather than by a hopeful guess. */
  if (stage === "ADJUSTMENTS") {
    if (key === ALL) return at("initialized_count");
    if (key === "HAS_ADJUSTMENT") return at("has_adjustment_count");
    if (key === "NO_ADJUSTMENT_PENDING_CONFIRMATION") return at("pending_adjustment_confirmation_count");
    if (key === "NO_ADJUSTMENT_CONFIRMED") return at("no_adjustment_confirmed_count");
    return undefined;
  }

  if (stage === "CALCULATION") {
    if (key === ALL) return at("initialized");
    if (key === "ATTENDANCE_PENDING") return at("attendance_pending");
    if (key === "RECALCULATION_REQUIRED") return at("recalculation_required");
    if (key === "READY_FOR_APPROVAL") return at("ready_for_approval");
    if (key === "APPROVED_LOCKED") return at("approved_locked");
    return undefined;
  }

  return undefined;
}

/* ------------------------------------------------------- the bulk close */

/**
 * WHAT A BULK CLOSE WOULD ACTUALLY DO, counted before anybody presses it.
 *
 * "32 employees selected, 41 unresolved attendance items" is the sentence
 * somebody needs before accepting a month's worth of gaps, and the breakdown
 * under it says what KIND of gap - because "attendance not final" and "an OT
 * approval nobody has decided" are two different conversations.
 *
 * IT COUNTS ONLY THE CLOSEABLE ROWS. A settled employee in the selection
 * contributes nothing, because closing them would do nothing.
 */
function closeSelectionSummary(rows, selectedIds) {
  const selected = (rows || []).filter(
    (row) => (selectedIds || []).includes(row.employee_id) && row.attendance_closeable === true
  );

  const breakdown = {
    attendance_not_final: 0,
    pending_regularizations: 0,
    pending_ot: 0,
    no_attendance_month: 0,
  };

  selected.forEach((row) => {
    (row.attendance_unresolved || []).forEach((item) => {
      if (item.code === "ATTENDANCE_NOT_FINAL") breakdown.attendance_not_final += item.count;
      else if (item.code === "PENDING_REGULARIZATION") breakdown.pending_regularizations += item.count;
      else if (item.code === "PENDING_OT") breakdown.pending_ot += item.count;
      else if (item.code === "NO_ATTENDANCE_MONTH") breakdown.no_attendance_month += item.count;
    });
  });

  return {
    employees: selected.length,
    employee_ids: selected.map((row) => row.employee_id),
    unresolved_items: Object.values(breakdown).reduce((a, b) => a + b, 0),
    breakdown,
  };
}

/**
 * THE CONFIRMATION, AND IT SAYS WHAT IS BEING ACCEPTED RATHER THAN HOW MANY
 * ROWS ARE SELECTED.
 *
 * Somebody about to close thirty-two people's attendance should read that the
 * underlying requests stay open and that payroll is accepting the gaps - not
 * "Close 32?", which invites a click.
 */
function closeMessage(summary) {
  const { employees, unresolved_items, breakdown } = summary || {};
  if (!employees) return "Nothing in this selection needs closing.";

  const who = employees === 1 ? "1 employee" : `${employees} employees`;
  const items = unresolved_items === 1 ? "1 unresolved attendance item" : `${unresolved_items} unresolved attendance items`;

  const parts = [];
  if (breakdown.no_attendance_month > 0) parts.push(`${breakdown.no_attendance_month} with no attendance calculated`);
  if (breakdown.attendance_not_final > 0) parts.push(`${breakdown.attendance_not_final} unsettled date(s)`);
  if (breakdown.pending_regularizations > 0) parts.push(`${breakdown.pending_regularizations} pending regularization(s)`);
  if (breakdown.pending_ot > 0) parts.push(`${breakdown.pending_ot} pending OT approval(s)`);

  return (
    `Close attendance for payroll for ${who}?\n\n` +
    `${items}${parts.length ? `: ${parts.join(", ")}` : ""}.\n\n` +
    "This accepts the attendance as it stands so these months can be calculated and approved. " +
    "It does NOT approve or reject any of the requests above - they stay open, in their own " +
    "queues, with their history intact.\n\n" +
    "Who closed it and what was still unresolved is recorded against each employee."
  );
}

/** Which selected rows a close would actually apply to. */
const closeableEmployeeIds = (rows) =>
  (rows || []).filter((row) => row.attendance_closeable === true).map((row) => row.employee_id);

module.exports = {
  ALL,
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_SCHEME,
  INITIALIZATION_TABS,
  ADJUSTMENT_TABS,
  CALCULATION_TABS,
  DEFAULT_TAB,
  tabFilters,
  tabCount,
  unresolvedLink,
  heldDateLink,
  closeSelectionSummary,
  closeMessage,
  closeableEmployeeIds,
};
