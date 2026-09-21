import { istToday } from "./attendanceDashboard";

/**
 * The Shift Change Eligibility Report, presented.
 *
 * COLUMN DEFINITIONS AND SMALL FORMATTERS ONLY. There is no rule in this
 * file, and there must not be one.
 *
 * "Can Raise Shift Change?" is decided ONCE, on the server, by
 * `utils/shift_change_eligibility.js#decide` - the very function that accepts
 * or refuses the employee's own request on the Telegram Mini App. A browser
 * that compared two shifts' hours, or tested a date against the backdating
 * window, would be a second definition, and the first thing it would do is
 * tell HR to chase somebody the backend then refuses.
 *
 * "Worked Longer Than Assigned Shift?" is likewise the server's, measured
 * from the attendance engine's own worked minutes against the normal minutes
 * of the shift EFFECTIVE ON THAT ATTENDANCE DATE - the dated assignment
 * history, not the employee's current shift, so a roster change never
 * re-judges the days behind it. It is a SEPARATE question and it authorises
 * nothing: an employee can have worked longer and still not be able to raise
 * a request, and the report shows exactly that.
 *
 * So: the screen renders `row.can_raise`, `row.worked_longer`,
 * `row.eligibility_reason` and `row.request_status` as the server sent them.
 */

/** The report's columns, in the approved order. Shared by the grid. */
export const SHIFT_CHANGE_ELIGIBILITY_COLUMNS = [
  { key: "attendance_date", header: "Date", minWidth: 115 },
  { key: "employee_id", header: "Employee ID", minWidth: 120 },
  { key: "employee_name", header: "Employee Name", minWidth: 190 },
  { key: "outlet_name", header: "Outlet", minWidth: 150 },
  { key: "designation_name", header: "Designation", minWidth: 160 },
  { key: "assigned_shift", header: "Assigned Shift", minWidth: 190 },
  { key: "first_punch", header: "Actual First Punch", minWidth: 150 },
  { key: "last_punch", header: "Actual Last Punch", minWidth: 150 },
  { key: "worked_hours", header: "Worked Hours", minWidth: 130 },
  { key: "extra_hours", header: "Extra Hours", minWidth: 120 },
  { key: "can_raise_label", header: "Can Raise by System?", minWidth: 175 },
  {
    key: "worked_longer_label",
    header: "Worked Longer Than Assigned Shift?",
    minWidth: 240,
  },
  { key: "eligibility_reason", header: "Eligibility Reason", minWidth: 320 },
  // THE HR GATE, BESIDE THE SYSTEM ONE AND NEVER FOLDED INTO IT. A row may
  // read "Can Raise by System = Yes" and "Blocked by HR" at once, which is
  // exactly the fact HR needs to see - the system would have allowed it, and
  // a person decided otherwise.
  { key: "hr_eligibility", header: "HR Eligibility", minWidth: 150 },
  { key: "hr_block_reason", header: "HR Block Reason", minWidth: 260 },
  { key: "hr_blocked_by", header: "Blocked By", minWidth: 160 },
  { key: "hr_blocked_at", header: "Blocked At", minWidth: 165 },
  { key: "effective_can_raise_label", header: "Effective Can Raise?", minWidth: 175 },
  { key: "request_status", header: "Request Status", minWidth: 145 },
  { key: "request_id", header: "Request ID", minWidth: 120 },
  { key: "action", header: "Action", minWidth: 250 },
];

/** The Request Status vocabulary, exactly as the server spells it. */
export const REQUEST_STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "NOT_RAISED", label: "Not Raised" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

/** The HR gate's vocabulary, exactly as the server spells it. */
export const HR_ELIGIBILITY_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "ALLOWED", label: "Allowed" },
  { value: "BLOCKED", label: "Blocked by HR" },
];

/**
 * The reasons HR is offered. Suggestions only - the server takes any text of
 * at least five characters, and "Other" requires the person to type their own.
 */
export const BLOCK_REASONS = [
  "Punch timing is incorrect",
  "Employee worked outside shift without approval",
  "Wrong biometric punch",
  "No authorised extended duty",
  "Other",
];

export const OTHER_REASON = "Other";

export const YES_NO_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "YES", label: "Yes" },
  { value: "NO", label: "No" },
];

/**
 * `YYYY-MM-DD` plus `n` days, by UTC arithmetic on the PARTS.
 *
 * NO LOCAL `Date` IS CONSTRUCTED FROM THE STRING, and that is the whole
 * point: `new Date("2026-09-19")` is parsed as UTC midnight while
 * `new Date(2026, 8, 19)` is LOCAL midnight, and mixing the two is exactly
 * how a date moves a day. Here the parts go in and the parts come out.
 */
export function addDays(dateOnly, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOnly || ""));
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

/**
 * THE DEFAULT WINDOW: the last SEVEN COMPLETED attendance dates, ending
 * YESTERDAY.
 *
 * THE BUSINESS DATE COMES FROM `istToday`, the shared helper the Attendance
 * Dashboard already defaults with, and NEVER from `toISOString()`, which
 * renders the instant in UTC: between 00:00 and 05:29 IST that is still
 * yesterday's date, and the screen would open a day early and hide the very
 * day somebody opened it to chase. `now` is injectable so the boundary can be
 * tested; production passes nothing.
 *
 * Today itself is deliberately not the default even though a shift change CAN
 * be raised for it - and for the next sixty days. The report opens on days
 * that have finished being punched, because "worked longer" is not a
 * meaningful reading of a day somebody is still working. HR can move the
 * dates forward whenever they want to look ahead; the server accepts it.
 */
export function defaultRange(now = new Date()) {
  const to_date = addDays(istToday(now), -1);
  return { from_date: addDays(to_date, -6), to_date };
}

/** `2026-09-18` -> `18 Sep 2026`. Display only; the value sorts on the ISO date. */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function displayDate(dateOnly) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOnly || ""));
  if (!m) return String(dateOnly || "");
  return `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** The Assigned Shift as one cell: the name, and the hours it runs. */
export function assignedShiftLabel(row) {
  const name = row.assigned_shift_name || row.assigned_shift_code || null;
  const hhmm = (t) => (t ? String(t).slice(0, 5) : null);
  const span =
    row.assigned_shift_in_time && row.assigned_shift_out_time
      ? `${hhmm(row.assigned_shift_in_time)}-${hhmm(row.assigned_shift_out_time)}`
      : null;
  if (name && span) return `${name} ${span}`;
  return name || span || "";
}

/** A server boolean, as a person reads it. */
export function yesNo(value) {
  return value ? "Yes" : "No";
}

/**
 * One API row, flattened for the grid.
 *
 * NO VALUE IS RECOMPUTED. `can_raise` and `worked_longer` are turned into the
 * words Yes and No and nothing else; the reason, the status and the hours are
 * rendered exactly as they arrived.
 */
export function flattenRow(row) {
  return {
    ...row,
    attendance_date_display: displayDate(row.attendance_date),
    assigned_shift: assignedShiftLabel(row),
    can_raise_label: yesNo(row.can_raise),
    worked_longer_label: yesNo(row.worked_longer),
    effective_can_raise_label: yesNo(row.effective_can_raise),
    hr_eligibility: row.hr_eligibility || "",
    hr_block_reason: row.hr_block_reason || "",
    hr_blocked_by: row.hr_blocked_by || "",
    hr_blocked_at: row.hr_blocked_at || "",
    request_id: row.request_id === null || row.request_id === undefined ? "" : row.request_id,
  };
}

/**
 * Where the Action column's links go.
 *
 * ATTENDANCE IS ALWAYS THERE - the employee's own calculated month, opened on
 * the date in question, which is how HR checks the punches this report
 * summarises. THE REQUEST LINK EXISTS ONLY WHEN A REQUEST DOES, and it opens
 * the ordinary approval screen. Both are ordinary screens behind their own
 * keys, re-checked there: a link is not an authorization.
 */
export function actionLinks(row) {
  const links = [
    {
      key: "attendance",
      label: "View attendance",
      href: `/attendance/calculated?employee_id=${row.employee_id}&date=${row.attendance_date}`,
    },
  ];
  if (row.request_id) {
    links.push({
      key: "request",
      label: "View request",
      href: `/attendance/approval?type=SHIFT&request=${row.request_id}`,
    });
  }
  return links;
}

/**
 * WHICH HR ACTION, IF ANY, THIS ROW OFFERS.
 *
 * PRESENTATION ONLY. Every value it reads - `hr_blocked`, `request_status`,
 * `can_raise` - was decided by the server, and the server re-decides all of
 * it again when the button is pressed. A row the browser is holding may be
 * minutes old: a month may have closed, somebody may have raised a request.
 * So this function chooses a LABEL, never a permission, and a stale row can
 * at worst offer a button whose action is then refused with a clear reason.
 *
 *   blocked          -> Remove Block
 *   Pending          -> nothing; the approval queue is the authority, and
 *                       rejecting the request there is the correct action
 *   Approved         -> nothing; the date is settled
 *   Not Raised + system eligible -> Mark Not Eligible
 *   Rejected + system eligible   -> Block Further Requests. A rejection does
 *                       NOT close the date in production, so this is the one
 *                       state where "block" means "stop them trying again".
 *   otherwise        -> nothing; the system already refuses the date, and a
 *                       block would record nothing
 */
export function blockAction(row) {
  if (!row) return null;
  if (row.hr_blocked) return { kind: "UNBLOCK", label: "Remove Block" };
  if (row.request_status === "Pending" || row.request_status === "Approved") return null;
  if (!row.can_raise) return null;
  if (row.request_status === "Rejected") {
    return { kind: "BLOCK", label: "Block Further Requests" };
  }
  if (row.request_status === "Not Raised") {
    return { kind: "BLOCK", label: "Mark Not Eligible" };
  }
  return null;
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
  if (filters.designation_id) query.designation_id = Number(filters.designation_id);
  if (filters.employee_id) query.employee_id = Number(filters.employee_id);
  if (filters.can_raise && filters.can_raise !== "ALL") query.can_raise = filters.can_raise;
  if (filters.worked_longer && filters.worked_longer !== "ALL") {
    query.worked_longer = filters.worked_longer;
  }
  if (filters.request_status && filters.request_status !== "ALL") {
    query.request_status = filters.request_status;
  }
  if (filters.hr_eligibility && filters.hr_eligibility !== "ALL") {
    query.hr_eligibility = filters.hr_eligibility;
  }
  if (filters.search) query.search = filters.search;
  return query;
}

/**
 * HR'S OPENING QUESTION, as the filters that ask it.
 *
 * Employees who BOTH may raise a shift change under the production rule AND
 * look like they need one from their punches, and who have not raised it. It
 * is the most useful default and it is only a default: every other cut is one
 * dropdown away, and `clearedView` below is the one that shows everything.
 */
export function actionableView() {
  return {
    can_raise: "YES",
    worked_longer: "YES",
    // HR-blocked rows leave the actionable queue: HR has already decided
    // about them, so they are finished work rather than waiting work. They
    // stay one dropdown away under "Blocked by HR".
    hr_eligibility: "ALLOWED",
    request_status: "NOT_RAISED",
  };
}

/** Every record, whatever its eligibility or its request status. */
export function clearedView() {
  return {
    can_raise: "ALL",
    worked_longer: "ALL",
    hr_eligibility: "ALL",
    request_status: "ALL",
  };
}

/** Whether the screen is currently on the opening question. */
export function isActionableView(filters) {
  const wanted = actionableView();
  return Object.keys(wanted).every((k) => filters[k] === wanted[k]);
}

/** The line under the filters that says which question is on screen. */
export function viewNote(meta, filters) {
  const actionable = meta && meta.actionable_count !== undefined ? meta.actionable_count : null;
  if (isActionableView(filters)) {
    return "Showing employees who can raise a shift change request under the current rules and whose punches ran past their assigned shift, and who have not raised one yet. Change the filters to see every other record.";
  }
  // THE COUNT IS THE SERVER'S, over the SAME scope and the SAME date, outlet,
  // employee and designation filters as the rows - it ignores only the three
  // actionable-state dropdowns, which is what lets it keep saying how much
  // work is waiting while HR looks at some other cut.
  const tail =
    actionable === null
      ? ""
      : ` ${actionable} record(s) matching these filters can raise a shift change, worked longer and have no request raised.`;
  return `Showing every record that matches the filters.${tail}`;
}
