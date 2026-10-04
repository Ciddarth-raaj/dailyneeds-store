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
  /* "Pending" read like a payrun state beside BLOCKED; this says what to do. */
  [ATTENDANCE_STATUS.PENDING]: "Needs action",
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
 * INITIALIZATION - THE CLICKABLE SUMMARY CARDS, which are the stage's only
 * status filter. There are no tabs and no status dropdowns under them: the
 * same filter drawn twice on one screen is two places to disagree.
 *
 * TWO GROUPS, BECAUSE THEY ARE TWO DIMENSIONS. Payrun Progress is what the
 * payrun and the employment record say; Attendance Readiness is what
 * attendance says, and it overlaps the first - one employee can be Blocked
 * AND Attendance Needs Action at once. Each card names exactly one server
 * parameter (`status`, `lifecycle`, `absence` or `attendance`) and its count
 * is the server's summary field of the same meaning.
 */
const INITIALIZATION_CARDS = {
  progress: [
    { key: ALL, label: "All Employees", count: "total_eligible" },
    { key: "READY", label: "Ready", status: "READY", count: "ready" },
    { key: "BLOCKED", label: "Blocked", status: "BLOCKED", count: "blocked" },
    { key: "INITIALIZED", label: "Initialized", status: "INITIALIZED", count: "initialized" },
    /* The server's DATED exit - had they left by the end of THIS month. */
    { key: "EXITED", label: "Exited", lifecycle: "EXITED", count: "exited" },
    /* A warning for HR to review, never a state - see the backend rule. */
    { key: "THREE_DAY_ABSENT", label: "3-Day Absent", absence: "THREE_DAY_ABSENT", count: "three_day_absent" },
  ],
  attendance: [
    {
      key: "ATTENDANCE_NEEDS_ACTION",
      label: "Attendance Needs Action",
      attendance: ATTENDANCE_STATUS.PENDING,
      count: "attendance_pending",
    },
    {
      key: "CLOSED_FOR_PAYROLL",
      label: "Closed for Payroll",
      attendance: ATTENDANCE_STATUS.CLOSED_FOR_PAYROLL,
      count: "attendance_closed_for_payroll",
    },
  ],
};

/** Every initialization card, one list - what `tabFilters` and `tabCount` walk. */
const INITIALIZATION_TABS = [...INITIALIZATION_CARDS.progress, ...INITIALIZATION_CARDS.attendance];

/**
 * CLICKING A CARD. A different card selects it; the selected card again goes
 * back to All Employees - which is also always a card of its own.
 */
function nextCard(active, clicked) {
  if (clicked === active) return ALL;
  return clicked;
}

/** The label a card key is shown under, for the line above the table. */
function cardLabel(key) {
  const card = INITIALIZATION_TABS.find((c) => c.key === key);
  return card ? card.label : "All Employees";
}

/**
 * THE LINE ABOVE THE TABLE: "Showing 8 employees — 3-Day Absent".
 *
 * `shown` is the number of rows the server returned for this filter, so it
 * honours the search as well; the cards above keep the month's counts.
 */
function filterCaption({ shown = 0, active = ALL, search = "" } = {}) {
  const n = Number(shown) || 0;
  const who = `${n} employee${n === 1 ? "" : "s"}`;
  const needle = String(search || "").trim();
  return `Showing ${who} — ${cardLabel(active)}${needle ? ` matching "${needle}"` : ""}`;
}

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
  { key: "PUBLISHED", label: "Payslip Published", status: "PUBLISHED" },
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
  /* The cards show every queue's size at once, so the page opens on the
     whole month and one click narrows it. */
  INITIALIZATION: ALL,
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
  if (tab.absence) filters.absence = tab.absence;
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
    const card = INITIALIZATION_TABS.find((c) => c.key === key);
    return card ? at(card.count) : undefined;
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
    if (key === "PUBLISHED") return at("published");
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
  INITIALIZATION_CARDS,
  INITIALIZATION_TABS,
  nextCard,
  cardLabel,
  filterCaption,
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
