/**
 * Attendance v2 screens - the pure part: status labels, punch rendering and
 * the month window. CommonJS so `node --test util/attendanceV2.test.js` runs
 * it without a bundler; the screens import it through Babel's interop.
 *
 * THE STATUS MAPPING IS THE CONTRACT. Backend statuses are engine words; what
 * staff see are the six agreed labels and nothing else. In particular
 * "Review Required" is never shown: a REVIEW_REQUIRED day with an odd punch
 * count is a Missing Punch, and that is the only way the engine produces
 * REVIEW_REQUIRED on a day that has a shift. A FINAL day gets NO badge.
 *
 * PUNCHES ARE DYNAMIC. A day has as many punches as it has; two, four, six
 * or nine are all rendered from the same list. There are no Clk1-Clk4
 * columns and no fixed In/Out fields. Position decides direction: 1st IN,
 * 2nd OUT, 3rd IN, ... exactly as the engine pairs them.
 */

const STATUS = Object.freeze({
  FINAL: "FINAL",
  ABSENT: "ABSENT",
  REVIEW_REQUIRED: "REVIEW_REQUIRED",
  REGULARIZATION_PENDING: "REGULARIZATION_PENDING",
  OT_PENDING: "OT_PENDING",
  NO_SHIFT_FOR_DATE: "NO_SHIFT_FOR_DATE",
  NO_SCHEDULE_ROW: "NO_SCHEDULE_ROW",
});

/** The exact labels staff see. Keys are what the screen renders on. */
const LABEL = Object.freeze({
  MISSING_PUNCH: "Missing Punch",
  REGULARIZATION_PENDING: "Regularization Pending",
  ABSENT: "Absent",
  NO_SHIFT: "No Shift Assigned",
  SHIFT_SETUP: "Shift Setup Issue",
});

const REGULARIZED_PUNCH_LABEL = "Missed Punch – Regularized";

/**
 * The one issue a day shows, or null for a normal day.
 *
 * @returns {{key: string, label: string, color: string}|null}
 */
function dayIssue(day) {
  if (!day) return null;
  const status = day.status;
  const reasons = Array.isArray(day.review_reasons) ? day.review_reasons : [];
  const punchCount = Number(day.punch_count) || 0;

  switch (status) {
    case STATUS.REGULARIZATION_PENDING:
      return { key: "REGULARIZATION_PENDING", label: LABEL.REGULARIZATION_PENDING, color: "orange" };
    case STATUS.OT_PENDING:
      // Legacy stored rows only: the engine no longer produces it, and the OT
      // claim is shown from `ot_claim_state` (see `otClaim`), never as an
      // attendance issue. A day like this is treated as a normal day.
      return null;
    case STATUS.ABSENT:
      return { key: "ABSENT", label: LABEL.ABSENT, color: "red" };
    case STATUS.NO_SHIFT_FOR_DATE:
      return { key: "NO_SHIFT", label: LABEL.NO_SHIFT, color: "gray" };
    case STATUS.NO_SCHEDULE_ROW:
      return { key: "SHIFT_SETUP", label: LABEL.SHIFT_SETUP, color: "gray" };
    case STATUS.REVIEW_REQUIRED:
      // Odd punch count is the missing-punch case. The engine only produces
      // REVIEW_REQUIRED with a shift for that reason, but the reason list is
      // checked too so an unexpected review never leaks a generic label.
      if (reasons.includes("MISSING_PUNCH") || punchCount % 2 === 1) {
        return { key: "MISSING_PUNCH", label: LABEL.MISSING_PUNCH, color: "red" };
      }
      if (reasons.includes("NO_SCHEDULE_ROW")) {
        return { key: "SHIFT_SETUP", label: LABEL.SHIFT_SETUP, color: "gray" };
      }
      if (reasons.includes("NO_SHIFT_FOR_DATE")) {
        return { key: "NO_SHIFT", label: LABEL.NO_SHIFT, color: "gray" };
      }
      return null;
    case STATUS.FINAL:
    default:
      return null;
  }
}

/**
 * THE OT CLAIM, separate from the attendance status.
 *
 * Comes from the actual OT request state the backend derives beside each day
 * (`ot_claim_state`), never from the attendance status. The minutes shown are
 * the engine's: the employee never enters or edits them.
 *
 *   AVAILABLE               "OT Available: 00:28"        + Request OT
 *   REQUEST_PENDING         "OT Request Pending: 00:28"
 *   APPROVED                "OT Approved: 00:28"
 *   REJECTED                "OT Rejected"
 *   CLOSED_AT_PAYROLL_LOCK  "OT Rejected" + the closure wording in the detail
 *
 * @returns {{state:string, label:string, minutes:number, canRequest:boolean,
 *   color:string, detail:string|null}|null} null when the day has no OT at all
 */
const OT_CLOSURE_LABEL = Object.freeze({
  NOT_REQUESTED_BEFORE_PAYROLL_LOCK: "Rejected – Not Requested Before Payroll Lock",
  NOT_APPROVED_BEFORE_PAYROLL_LOCK: "Rejected – Not Approved Before Payroll Lock",
});

function otClaim(day) {
  if (!day) return null;
  const state = day.ot_claim_state || "NONE";
  const candidate = Math.max(0, Math.trunc(Number(day.candidate_ot_minutes) || 0));
  const requested = day.ot_requested_minutes === null || day.ot_requested_minutes === undefined
    ? candidate
    : Math.max(0, Math.trunc(Number(day.ot_requested_minutes) || 0));
  const approved = Math.max(0, Math.trunc(Number(day.approved_ot_minutes) || 0));

  switch (state) {
    case "AVAILABLE":
      return { state, label: `OT Available: ${formatOtClock(candidate)}`, minutes: candidate, canRequest: true, color: "blue", detail: null };
    case "REQUEST_PENDING":
      return { state, label: `OT Request Pending: ${formatOtClock(requested)}`, minutes: requested, canRequest: false, color: "orange", detail: day.ot_reason || null };
    case "APPROVED":
      return { state, label: `OT Approved: ${formatOtClock(approved)}`, minutes: approved, canRequest: false, color: "green", detail: null };
    case "REJECTED":
      return { state, label: "OT Rejected", minutes: requested, canRequest: false, color: "red", detail: null };
    case "CLOSED_AT_PAYROLL_LOCK":
      return {
        state,
        label: "OT Rejected",
        minutes: requested,
        canRequest: false,
        color: "red",
        detail: OT_CLOSURE_LABEL[day.ot_closure_reason] || "Closed at payroll lock",
      };
    default:
      return null;
  }
}

/** `00:28`, `02:30`: the hh:mm form the OT labels use. */
function formatOtClock(minutes) {
  const total = Math.max(0, Math.trunc(Number(minutes) || 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Only a Missing Punch day may be regularized, and only while nothing is pending. */
function canRegularize(day) {
  const issue = dayIssue(day);
  return !!issue && issue.key === "MISSING_PUNCH";
}

/** `HH:MM` from `YYYY-MM-DD HH:MM:SS` (or `HH:MM:SS`). */
function clock(ioTime) {
  if (!ioTime) return "";
  const m = /(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(ioTime).trim());
  return m ? `${m[1]}:${m[2]}` : String(ioTime);
}

/**
 * Every effective punch of a day, in order, with its positional direction.
 *
 * @returns {Array<{position:number, time:string, direction:"IN"|"OUT",
 *   regularized:boolean, io_time:string}>}
 */
function positionalPunches(day) {
  const punches = day && Array.isArray(day.effective_punches) ? day.effective_punches : [];
  return punches.map((p, i) => ({
    position: i + 1,
    time: clock(p.io_time),
    io_time: p.io_time,
    direction: i % 2 === 0 ? "IN" : "OUT",
    regularized: p.source === "REGULARIZED",
  }));
}

/** `09:18 → 14:23 → 15:49 → 22:02`, however many there are. Empty for none. */
function punchSummary(day) {
  return positionalPunches(day).map((p) => p.time).join(" → ");
}

/** `7h 30m`, `45m`, `0m`. Never rounds: minutes are the unit. */
function formatMinutes(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const total = Math.max(0, Math.trunc(n));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** `Mon`, `Tue`... from `YYYY-MM-DD`, by UTC maths so the zone cannot move it. */
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function weekday(dateOnly) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOnly || ""));
  if (!m) return "";
  return DAY_NAMES[new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))).getUTCDay()];
}

/** `15 Sep 2026` from `YYYY-MM-DD`. */
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function displayDate(dateOnly) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOnly || ""));
  if (!m) return String(dateOnly || "");
  return `${Number(m[3])} ${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}`;
}

/** `{ from_date, to_date }` for a `YYYY-MM` month. */
function monthBounds(yearMonth) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(yearMonth || ""));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return null;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const pad = (n) => String(n).padStart(2, "0");
  return { from_date: `${y}-${pad(mo)}-01`, to_date: `${y}-${pad(mo)}-${pad(last)}` };
}

/** `YYYY-MM-DD` plus n days, by UTC maths. */
function addDays(dateOnly, n) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOnly || ""));
  if (!m) return dateOnly;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + n));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

/**
 * The CALENDAR date a clock time on this attendance date falls on.
 *
 * The regularization form asks for a clock time only. A time before the
 * shift's Attendance Day Cutoff (a 00:30 finish on a 10:00-22:00 shift with
 * a 04:00 cutoff) is after midnight: it is on the next calendar day while
 * still belonging to this attendance date. That is the backend's own rule,
 * and the backend re-checks it and refuses the request if they disagree.
 */
function calendarDateFor(day, time) {
  if (!day) return null;
  const cutoff = clock(day.shift_snapshot ? day.shift_snapshot.attendance_day_cutoff : null);
  if (cutoff && time && time < cutoff) return addDays(day.attendance_date, 1);
  return day.attendance_date;
}

/** The current month as `YYYY-MM`, from a Date. */
function currentMonth(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** `Late Shift (10:00–22:00)`, or the code, or a dash. */
function shiftLabel(day) {
  if (!day) return "—";
  const snap = day.shift_snapshot || null;
  const name = day.shift_name || (snap && snap.shift_code) || null;
  if (!name) return "—";
  if (snap && snap.in_time && snap.out_time) {
    return `${name} (${clock(snap.in_time)}–${clock(snap.out_time)})`;
  }
  return name;
}

/**
 * The message a screen shows for an API answer that was not a success.
 * `{ code: 422, msg: "ValidationError: ..." }` becomes the sentence after the
 * error name; anything else is its `msg`, or a generic line.
 */
function apiMessage(body, fallback = "The request could not be completed") {
  if (!body || typeof body !== "object") return fallback;
  if (typeof body.msg !== "string" || !body.msg) return fallback;
  return body.msg.replace(/^ValidationError:\s*/, "");
}

/** True when a helper's answer is the success it promised. */
function isOk(body) {
  return !!body && typeof body === "object" && Number(body.code) === 200;
}

module.exports = {
  STATUS,
  LABEL,
  REGULARIZED_PUNCH_LABEL,
  OT_CLOSURE_LABEL,
  dayIssue,
  otClaim,
  formatOtClock,
  canRegularize,
  clock,
  positionalPunches,
  punchSummary,
  formatMinutes,
  weekday,
  displayDate,
  monthBounds,
  addDays,
  calendarDateFor,
  currentMonth,
  shiftLabel,
  apiMessage,
  isOk,
};
