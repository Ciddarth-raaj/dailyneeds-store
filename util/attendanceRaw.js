/**
 * Attendance List / Punch Audit - pure helpers for the screens.
 *
 * Kept free of React and of the API so they can be tested with
 * `node --test util/attendanceRaw.test.js`, the way util/workShiftForm.js is.
 */

/** Dynamic Clock Time columns: N follows the widest row, never a fixed 4. */
function clockTimeColumnCount(meta, rows) {
  const fromMeta = meta && Number(meta.max_punch_count);
  if (Number.isSafeInteger(fromMeta) && fromMeta > 0) return fromMeta;
  return (rows || []).reduce((max, r) => Math.max(max, (r.punches || []).length), 0);
}

/**
 * 'YYYY-MM-DD' -> 'DD/MM/YYYY', and the timestamp form beside it.
 *
 * Moved to `util/displayDate.js` and re-exported here: the employee master
 * needs the same convention, and two copies of a formatting rule is how a
 * screen ends up showing 2013-06-08 next to 08/06/2013.
 */
const { displayDate, displayDateTime, displayIstDateTime, istDateTimeLocalValue } = require("./displayDate");

/** The fixed part of the Attendance List, then Clock Time-1..N, then the count. */
function attendanceListColumns(n) {
  const cols = [
    { key: "user_id", header: "Employee Code" },
    { key: "employee_name", header: "Employee Name" },
    { key: "department_name", header: "Department" },
    { key: "home_outlet", header: "Home Outlet" },
    { key: "clock_date", header: "Clock Date" },
  ];
  for (let i = 1; i <= n; i += 1) {
    cols.push({ key: `clock_time_${i}`, header: `Clock Time-${i}`, punchIndex: i - 1 });
  }
  cols.push({ key: "punch_count", header: "Punches" });
  return cols;
}

/**
 * Flatten a row for the grid: `clock_time_1..n` hold the punch objects (the
 * cell renderer shows time + location), `clock_date` is display-formatted.
 * Nothing about IN/OUT, hours or status is computed here - or anywhere.
 */
function flattenRow(row, n) {
  const flat = {
    ...row,
    clock_date_display: displayDate(row.clock_date),
  };
  for (let i = 0; i < n; i += 1) {
    flat[`clock_time_${i + 1}`] = row.punches && row.punches[i] ? row.punches[i] : null;
  }
  return flat;
}

/** The Punches cell text: "4", or "4 (+1 quarantined)". */
function punchesCellText(row) {
  const q = Number(row.quarantined_punch_count) || 0;
  return q > 0 ? `${row.punch_count} (+${q} quarantined)` : String(row.punch_count);
}

/**
 * THE PUNCH AUDIT'S OPENING REVIEW FILTER.
 *
 * The audit opens in REVIEW ONLY. It is a queue of things somebody has to
 * act on, and opening it on every punch ever recorded buried the handful
 * that needed attention among thousands that did not.
 *
 * A DEEP LINK WINS. A URL that states a review filter - including
 * `review=all`, which is how "show me everything" is said explicitly - is
 * honoured exactly as written, because somebody following a link from a
 * warning asked for that view and having the default overwrite it on load
 * is the bug this replaces. Only a URL that is silent about `review` gets
 * the default.
 *
 * `review=all` is translated to the empty string the API means by "no
 * review filter"; the word exists so that the intent survives a URL, which
 * an absent parameter cannot express.
 */
const DEFAULT_AUDIT_REVIEW = "needs_review";

function initialReviewFilter(query = {}) {
  const raw = query.review;
  if (raw === undefined || raw === null || raw === "") return DEFAULT_AUDIT_REVIEW;
  const value = String(raw).trim().toLowerCase();
  if (value === "all") return "";
  return value === "needs_review" || value === "ok" ? value : DEFAULT_AUDIT_REVIEW;
}

/**
 * The issue types the Punch Audit can be narrowed to, in step with
 * `usecase/attendance_raw.js#AUDIT_ISSUES` on the server. An unknown value
 * is dropped rather than sent, so a stale link cannot 422 the screen.
 */
const AUDIT_ISSUES = [
  "NO_SHIFT",
  "UNKNOWN_EMPLOYEE",
  "SHIFT_SETUP",
  "UNDATED",
  "UNREGISTERED_DEVICE",
  "INACTIVE_DEVICE",
];

const initialIssueFilter = (query = {}) => {
  const value = String((query && query.issue) || "").trim().toUpperCase();
  return AUDIT_ISSUES.includes(value) ? value : "";
};

/** Human wording for each issue, for the filter control and the heading. */
const AUDIT_ISSUE_LABEL = {
  NO_SHIFT: "No shift assigned",
  UNKNOWN_EMPLOYEE: "Unknown employee code",
  SHIFT_SETUP: "Shift setup issue",
  UNDATED: "Could not be dated",
  UNREGISTERED_DEVICE: "Unregistered device",
  INACTIVE_DEVICE: "Inactive device",
};

/** Query string for the Punch Audit tab pre-filtered to one employee's day. */
function auditLinkFor(row) {
  const params = new URLSearchParams({
    tab: "audit",
    from: row.clock_date,
    to: row.clock_date,
    employee_id: String(row.employee_id),
    attendance_date: row.clock_date,
  });
  return `/attendance/list?${params.toString()}`;
}

/** The Attendance List query, with nothing about devices in it. */
function buildListQuery(filters) {
  const q = { from: filters.from, to: filters.to };
  if (filters.home_outlet_id) q.home_outlet_id = filters.home_outlet_id;
  if (filters.department_id) q.department_id = filters.department_id;
  if (filters.search && filters.search.trim()) q.search = filters.search.trim();
  return q;
}

function buildAuditQuery(filters) {
  const q = { from: filters.from, to: filters.to, limit: filters.limit || 500, offset: filters.offset || 0 };
  if (filters.dev_id) q.dev_id = filters.dev_id;
  if (filters.punch_outlet_id) q.punch_outlet_id = filters.punch_outlet_id;
  if (filters.device_status) q.device_status = filters.device_status;
  if (filters.review) q.review = filters.review;
  if (filters.issue) q.issue = filters.issue;
  if (filters.source_ip && filters.source_ip.trim()) q.source_ip = filters.source_ip.trim();
  if (filters.search && filters.search.trim()) q.search = filters.search.trim();
  if (filters.employee_id) q.employee_id = filters.employee_id;
  if (filters.attendance_date) q.attendance_date = filters.attendance_date;
  return q;
}

/** Human wording for the review-queue statuses, all neutral. */
const DERIVATION_STATUS_LABEL = {
  OK: "Dated",
  UNMATCHED: "Employee code not in employee master",
  NO_SHIFT: "Employee has no assigned shift",
  NO_SCHEDULE_ROW: "Shift has no schedule row for that weekday",
  MISSING_CUTOFF: "Shift day has no Attendance Day Cutoff",
};

const DEVICE_STATUS_LABEL = {
  REGISTERED: "Registered",
  INACTIVE_DEVICE: "Inactive device at that time",
  UNREGISTERED_DEVICE: "Unregistered device",
};

/**
 * The Review Queue link for one warning.
 *
 * It opens the Punch Audit IN REVIEW ONLY and narrowed to the very punches
 * the warning counted, rather than landing on the generic audit and leaving
 * the reader to reconstruct the filter themselves - which is what it used
 * to do. `review=needs_review` is stated explicitly even though it is now
 * the default: the link says what it means, and it keeps working if the
 * default ever changes.
 *
 * The date range travels with it, because the counts the warning quotes are
 * for the range the Attendance List is showing and a queue over a different
 * range would not add up to the number the reader just read.
 */
function reviewQueueLink({ issue, from, to } = {}) {
  const params = new URLSearchParams({ tab: "audit", review: "needs_review" });
  if (issue) params.set("issue", issue);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  return `/attendance/list?${params.toString()}`;
}

/** Banner sentences from `meta`, each with the screen that fixes it. */
function bannerItems(meta) {
  if (!meta) return [];
  const range = { from: meta.from, to: meta.to };
  const items = [];
  if (meta.no_shift_punches > 0) {
    items.push({ key: "no_shift", issue: "NO_SHIFT", text: `${meta.no_shift_punches} punch(es) from employees without an assigned shift are in the review queue.`, href: "/employee-shift-assignment", linkText: "Employee Shift Assignment", reviewHref: reviewQueueLink({ issue: "NO_SHIFT", ...range }) });
  }
  if (meta.missing_cutoff_punches > 0 || meta.no_schedule_row_punches > 0) {
    const n = (meta.missing_cutoff_punches || 0) + (meta.no_schedule_row_punches || 0);
    items.push({ key: "config", issue: "SHIFT_SETUP", text: `${n} punch(es) could not be dated because a working shift day has no Attendance Day Cutoff.`, href: "/work-shift", linkText: "Work Shift Master", reviewHref: reviewQueueLink({ issue: "SHIFT_SETUP", ...range }) });
  }
  if (meta.unmatched_punches > 0) {
    items.push({ key: "unmatched", issue: "UNKNOWN_EMPLOYEE", text: `${meta.unmatched_punches} punch(es) carry an employee code that is not in the employee master.`, href: "/hr/employees", linkText: "Employees", reviewHref: reviewQueueLink({ issue: "UNKNOWN_EMPLOYEE", ...range }) });
  }
  if (meta.unregistered_device_punches > 0 || (meta.unregistered_devices || []).length > 0) {
    items.push({ key: "unregistered", issue: "UNREGISTERED_DEVICE", text: `${meta.unregistered_device_punches || 0} punch(es) from ${(meta.unregistered_devices || []).length} unregistered device(s) are quarantined until the device is registered.`, href: "/attendance/devices", linkText: "Devices", reviewHref: reviewQueueLink({ issue: "UNREGISTERED_DEVICE", ...range }) });
  }
  if (meta.inactive_device_punches > 0) {
    items.push({ key: "inactive", issue: "INACTIVE_DEVICE", text: `${meta.inactive_device_punches} punch(es) came from a device with no active location at that time and are quarantined.`, href: "/attendance/devices", linkText: "Devices", reviewHref: reviewQueueLink({ issue: "INACTIVE_DEVICE", ...range }) });
  }
  return items;
}

module.exports = {
  clockTimeColumnCount,
  displayDate,
  displayDateTime,
  displayIstDateTime,
  istDateTimeLocalValue,
  attendanceListColumns,
  flattenRow,
  punchesCellText,
  auditLinkFor,
  buildListQuery,
  buildAuditQuery,
  bannerItems,
  reviewQueueLink,
  initialReviewFilter,
  initialIssueFilter,
  DEFAULT_AUDIT_REVIEW,
  AUDIT_ISSUES,
  AUDIT_ISSUE_LABEL,
  DERIVATION_STATUS_LABEL,
  DEVICE_STATUS_LABEL,
};
