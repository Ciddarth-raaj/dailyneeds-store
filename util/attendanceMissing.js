/**
 * The Missing Attendance Report, presented.
 *
 * COLUMN DEFINITIONS AND SMALL FORMATTERS ONLY. There is no rule in this
 * file, and there must not be one: whether a date is Missing Attendance is
 * decided once, on the server, by `utils/attendance_missing.js`, and the same
 * decision drives the 06:00 Telegram alert. A browser that re-tested the
 * punch count would be a second definition, and the first thing it would do
 * is disagree with the message an employee was sent at six in the morning.
 *
 * So: the screen renders `row.status` as the server sent it, and
 * `row.punch_count` as the server counted it.
 */

/** The report's columns, in the approved order. Shared by the grid. */
export const MISSING_ATTENDANCE_COLUMNS = [
  { key: "attendance_date", header: "Date", minWidth: 115 },
  { key: "employee_id", header: "Employee ID", minWidth: 120 },
  { key: "employee_name", header: "Employee Name", minWidth: 190 },
  { key: "outlet_name", header: "Outlet", minWidth: 150 },
  { key: "department_name", header: "Department", minWidth: 150 },
  { key: "designation_name", header: "Designation", minWidth: 160 },
  { key: "shift_name", header: "Shift", minWidth: 140 },
  { key: "punch_count", header: "Punch Count", minWidth: 125 },
  { key: "punch_times", header: "Punch Times", minWidth: 220 },
  { key: "status", header: "Status", minWidth: 160 },
  { key: "correction_requested", header: "Correction Requested", minWidth: 180 },
];

/** `2026-09-18` -> `18 Sep 2026`. Display only; the value sorts on the ISO date. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function displayDate(dateOnly) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOnly || ""));
  if (!m) return String(dateOnly || "");
  return `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/**
 * Whether an attendance correction already exists for this employee/date.
 *
 * Three states rather than two, because "somebody raised one and it is still
 * waiting" is the answer that stops a manager chasing a correction that is
 * already sitting in an approval queue.
 */
export function correctionLabel(row) {
  if (!row || !row.has_correction_request) return "No";
  return row.correction_request_pending ? "Pending" : "Raised";
}

/** One API row, flattened for the grid. No value is recomputed. */
export function flattenRow(row) {
  return {
    ...row,
    attendance_date_display: displayDate(row.attendance_date),
    punch_times_text: (row.punch_times || []).join(", "),
    correction_requested: correctionLabel(row),
  };
}

/**
 * The query the screen sends. Empty filters are OMITTED rather than sent as
 * "", because the server's Joi schema rejects an empty numeric filter and an
 * omitted one means "all".
 *
 * `store_ids` is a SUGGESTION. The server resolves the caller's branch scope
 * itself and intersects it with this, so an outlet chosen here can only
 * narrow what that caller was already authorized to see - never widen it.
 */
export function buildQuery(filters) {
  const query = { from_date: filters.from_date, to_date: filters.to_date };
  if (filters.store_id) query.store_ids = String(filters.store_id);
  if (filters.department_id) query.department_id = Number(filters.department_id);
  if (filters.employee_id) query.employee_id = Number(filters.employee_id);
  if (filters.work_shift_id) query.work_shift_id = Number(filters.work_shift_id);
  if (filters.search) query.search = filters.search;
  return query;
}

/**
 * The line under the table that explains the window actually reported.
 *
 * It is shown whenever the requested range was cut back, so an empty tail
 * never reads as "nobody missed a punch yesterday" when the truth is "today
 * has not finished yet".
 */
export function windowNote(meta) {
  if (!meta) return "";
  if (!meta.effective_from_date) {
    return `Nothing to show: this report never includes today (${meta.today}) or any later date, because those days are still being punched.`;
  }
  if (meta.clamped_to_completed_dates) {
    return `Showing ${meta.effective_from_date} to ${meta.effective_to_date}. Today (${meta.today}) is never included - the day is still being punched.`;
  }
  return `Showing ${meta.effective_from_date} to ${meta.effective_to_date}.`;
}
