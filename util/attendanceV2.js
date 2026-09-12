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
 * The effective status of a raw punch on a day, as the backend derives it
 * (`utils/attendance_effective_punches.js` there). A day's
 * `effective_punches` are all USED (plus REGULARIZED ones); its
 * `excluded_punches` are IGNORED_DUPLICATE or VOIDED and count for nothing.
 */
const PUNCH_STATUS = Object.freeze({
  USED: "USED",
  IGNORED_DUPLICATE: "IGNORED_DUPLICATE",
  VOIDED: "VOIDED",
});

const PUNCH_STATUS_LABEL = Object.freeze({
  USED: "Used",
  IGNORED_DUPLICATE: "Ignored – Duplicate within 10 min",
  VOIDED: "Voided",
});

/** The colour scheme a status badge takes. */
const PUNCH_STATUS_COLOR = Object.freeze({
  USED: "green",
  IGNORED_DUPLICATE: "yellow",
  VOIDED: "red",
});

/** Only a raw BIOMAX / IMPORT punch that is not already voided may be voided. */
function canVoidPunch(punch) {
  if (!punch) return false;
  if (punch.source !== "BIOMAX" && punch.source !== "IMPORT") return false;
  if (punch.effective_status === PUNCH_STATUS.VOIDED) return false;
  if (punch.attendance_punch_void_id) return false;
  return true;
}

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

/**
 * EVERY punch of a day, effective and excluded, chronological, for the Day
 * Detail. An effective punch carries its position and direction; an
 * excluded one carries no position (it is not paired) and its status and
 * reason instead. A raw punch is `void_able` when the caller may void it.
 *
 * @returns {Array<{punch_id, time, io_time, source, effective_status,
 *   position:number|null, direction:"IN"|"OUT"|null, regularized:boolean,
 *   excluded:boolean, reason:string|null, void:object|null, void_able:boolean}>}
 */
function dayPunchRows(day) {
  const effective = positionalPunches(day).map((p, i) => {
    const raw = day.effective_punches[i] || {};
    return {
      punch_id: raw.punch_id === undefined ? null : raw.punch_id,
      time: p.time,
      io_time: p.io_time,
      source: raw.source || "BIOMAX",
      effective_status: raw.source === "REGULARIZED" ? "REGULARIZED" : PUNCH_STATUS.USED,
      position: p.position,
      direction: p.direction,
      regularized: p.regularized,
      excluded: false,
      reason: null,
      void: null,
      void_able: canVoidPunch({ source: raw.source, effective_status: PUNCH_STATUS.USED }),
    };
  });
  const excluded = (day && Array.isArray(day.excluded_punches) ? day.excluded_punches : []).map((p) => ({
    punch_id: p.punch_id === undefined ? null : p.punch_id,
    time: clock(p.io_time),
    io_time: p.io_time,
    source: p.source || "BIOMAX",
    effective_status: p.effective_status || PUNCH_STATUS.IGNORED_DUPLICATE,
    position: null,
    direction: null,
    regularized: false,
    excluded: true,
    reason: p.exclusion_reason || null,
    void: p.void || null,
    void_able: canVoidPunch({ source: p.source, effective_status: p.effective_status }),
  }));
  return [...effective, ...excluded].sort((a, b) => {
    if (a.io_time !== b.io_time) return String(a.io_time) < String(b.io_time) ? -1 : 1;
    return Number(a.punch_id || 0) - Number(b.punch_id || 0);
  });
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

/* ============================================ approval screens ==== */

const ROLE_LABEL = Object.freeze({
  STORE_MANAGER: "Store Manager",
  OPERATIONS_MANAGER: "Operations Manager",
  HR: "HR",
  ADMIN: "Admin",
});
function roleLabel(role) {
  return ROLE_LABEL[role] || String(role || "—");
}

/** `15 Sep 2026 09:00` from `YYYY-MM-DD HH:MM:SS`; a dash for nothing. */
function displayDateTime(value) {
  if (!value) return "—";
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(String(value));
  if (!m) return String(value);
  return `${displayDate(m[1])} ${m[2]}`;
}

const LEVEL_LABEL = Object.freeze({ FIRST: "First Level", SECOND: "Second Level", FINAL: "Final Approver" });
function levelLabel(level) {
  return LEVEL_LABEL[level] || String(level || "—");
}

/**
 * `Stage 2 of 3 · Operations Manager` for a role-based chain, or
 * `Stage 2 of 3 · Priya (Final Approver)` when the stage carries a
 * snapshotted employee-level approver.
 */
function stageLabel(row) {
  if (!row) return "—";
  if (row.status !== "PENDING") return row.status === "APPROVED" ? "Approved" : row.status === "REJECTED" ? "Rejected" : String(row.status);
  const who =
    row.current_stage_approver_employee_id !== null && row.current_stage_approver_employee_id !== undefined
      ? `${row.current_stage_approver_name || `Employee ${row.current_stage_approver_employee_id}`}${row.current_stage_approval_level ? ` (${levelLabel(row.current_stage_approval_level)})` : ""}`
      : roleLabel(row.current_stage_role);
  return `Stage ${row.current_stage_no} of ${row.total_stages} · ${who}`;
}

/**
 * What a history row says was decided: the payroll-lock closure wording
 * where the lock closed it, otherwise the plain status.
 */
function decisionLabel(row) {
  if (!row) return "—";
  if (row.closure_label) return row.closure_label;
  if (row.status === "REJECTED") return "Rejected";
  if (row.status === "APPROVED") return "Approved";
  return stageLabel(row);
}

/* ============================================= recalculation ==== */

const RECALC_STATUS_LABEL = Object.freeze({
  READY: "Ready",
  RUNNING: "Recalculating",
  COMPLETED: "Completed",
  COMPLETED_WITH_ERRORS: "Completed with errors",
  FAILED: "Failed",
});
function recalcStatusLabel(status) {
  return RECALC_STATUS_LABEL[status] || String(status || "Ready");
}

/**
 * The request body for a bulk recalculation: the date range, plus ONLY the
 * optional filters that were actually chosen. Returns `{ error }` when the
 * range is missing or inverted, so the screen never sends a bad range.
 */
function buildRecalcBody({ from_date, to_date, employee_id, store_id, designation_id }) {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRe.test(String(from_date || "")) || !dateRe.test(String(to_date || ""))) {
    return { error: "Choose a From and To date" };
  }
  if (from_date > to_date) return { error: "From must not be after To" };
  const body = { from_date, to_date };
  if (employee_id) body.employee_id = Number(employee_id);
  if (store_id) body.store_id = Number(store_id);
  if (designation_id) body.designation_id = Number(designation_id);
  return { body };
}

/** `Employee 42` / `Store DN1` / `Designation Cashier` / `All employees`, from a run row. */
function runFilterLabel(run) {
  if (!run) return "—";
  const parts = [];
  if (run.employee_id) parts.push(run.employee_name ? `${run.employee_name} (${run.employee_id})` : `Employee ${run.employee_id}`);
  return parts.length ? parts.join(" · ") : "All employees";
}

/* ============================================ hover explanations ==== */

const n0 = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0;
};

/**
 * Why the Short figure is what it is, one short line per step, in the order
 * the engine settles it: the shift's NRM, what was punched, the break
 * charged, worked, then the late/early-out grace and deduction rule. Pure,
 * so the tooltip on the list and on the Day Detail say the same thing.
 *
 * @returns {string[]} empty when the day has no calculation to explain
 */
function shortExplanation(day) {
  if (!day || !day.shift_snapshot) return [];
  const snap = day.shift_snapshot;
  const lines = [];
  const punches = n0(day.punch_count);

  lines.push(
    `Shift ${clock(snap.in_time)}–${clock(snap.out_time)}: ${formatMinutes(snap.shift_span_minutes)} minus ${formatMinutes(
      day.break_allowance_minutes
    )} break = NRM ${formatMinutes(day.nrm_minutes)}`
  );

  if (punches === 0) {
    lines.push("No punches: absent, nothing owed");
    return lines;
  }
  if (punches % 2 === 1) {
    lines.push("A punch is missing, so the day is not settled yet");
    return lines;
  }

  lines.push(`Punched ${formatMinutes(day.span_minutes)} from first to last punch`);
  if (punches === 2) {
    lines.push(`Break charged ${formatMinutes(day.break_charged_minutes)} (the shift's allowance)`);
  } else {
    const gaps = n0(day.actual_gap_minutes);
    const allowed = n0(day.break_allowance_minutes);
    lines.push(
      `Breaks between punches ${formatMinutes(gaps)} against ${formatMinutes(allowed)} allowed` +
        (gaps > allowed ? ` – ${formatMinutes(gaps - allowed)} over` : "")
    );
  }
  lines.push(`Worked ${formatMinutes(day.worked_minutes)}`);

  const late = n0(day.late_minutes);
  const early = n0(day.early_exit_minutes);
  const forgiven = n0(day.grace_forgiven_minutes);
  if (late > 0) {
    lines.push(`Late ${formatMinutes(late)} (grace ${formatMinutes(snap.late_grace_minutes)})`);
  }
  if (early > 0) {
    lines.push(`Left early ${formatMinutes(early)} (grace ${formatMinutes(snap.early_exit_grace_minutes)})`);
  }
  if (forgiven > 0) lines.push(`Grace forgave ${formatMinutes(forgiven)}`);
  if (day.break_credit_withheld) lines.push("Left before 15:00: no lunch taken, break not credited");

  const lateCharged = n0(day.late_charged_minutes);
  const earlyCharged = n0(day.early_exit_charged_minutes);
  // "1m per 1m" is the plain one-for-one shortage, not a rule worth a line.
  const isRule = (interval, deduct) => n0(interval) > 0 && n0(deduct) > 0 && !(n0(interval) === 1 && n0(deduct) === 1);
  const ruleLate = isRule(snap.late_deduction_interval_minutes, snap.late_deduct_minutes);
  const ruleEarly = isRule(snap.early_exit_deduction_interval_minutes, snap.early_exit_deduct_minutes);
  if (ruleLate && lateCharged > 0) {
    lines.push(
      `Deduction rule: ${formatMinutes(snap.late_deduct_minutes)} per ${formatMinutes(
        snap.late_deduction_interval_minutes
      )} late → ${formatMinutes(lateCharged)} charged`
    );
  }
  if (ruleEarly && earlyCharged > 0) {
    lines.push(
      `Deduction rule: ${formatMinutes(snap.early_exit_deduct_minutes)} per ${formatMinutes(
        snap.early_exit_deduction_interval_minutes
      )} early → ${formatMinutes(earlyCharged)} charged`
    );
  }

  const short = n0(day.shortage_minutes);
  if (short === 0) {
    lines.push(n0(day.worked_minutes) >= n0(day.nrm_minutes) ? "Worked the full NRM: nothing short" : "Nothing short after grace");
  } else {
    lines.push(`Short ${formatMinutes(short)}`);
  }
  return lines;
}

/**
 * Why the OT figure is what it is: worked against NRM, pre/post-shift time,
 * the offsets, the shift's minimum, rounding and cap, then the candidate.
 *
 * @returns {string[]} empty when the day has no calculation to explain
 */
function otExplanation(day) {
  if (!day || !day.shift_snapshot) return [];
  const snap = day.shift_snapshot;
  const lines = [];
  const punches = n0(day.punch_count);

  if (punches === 0) return ["No punches: no OT"];
  if (punches % 2 === 1) return ["A punch is missing, so OT is not settled yet"];

  const worked = n0(day.worked_minutes);
  const nrm = n0(day.nrm_minutes);
  if (worked > nrm) {
    lines.push(`Worked ${formatMinutes(worked)} against NRM ${formatMinutes(nrm)}: ${formatMinutes(worked - nrm)} over`);
  } else {
    lines.push(`Worked ${formatMinutes(worked)} against NRM ${formatMinutes(nrm)}: nothing over`);
  }

  const pre = n0(day.pre_shift_minutes);
  const post = n0(day.post_shift_minutes);
  if (pre > 0) {
    lines.push(
      `Before shift in-time ${formatMinutes(pre)}` +
        (snap.pre_shift_overtime_allowed ? "" : " (pre-shift OT not allowed on this shift)")
    );
  }
  if (post > 0) lines.push(`After shift out-time ${formatMinutes(post)}`);
  if (punches === 2 && worked > nrm && post < worked - nrm) {
    lines.push("Two punches only: OT counts time after out-time, not an unused break");
  }

  if (!snap.overtime_allowed) {
    lines.push("OT not allowed on this shift");
  } else {
    const raw = n0(day.raw_ot_minutes);
    const offset = n0(day.ot_offset_minutes);
    if (offset > 0) lines.push(`Late / early-out offset –${formatMinutes(offset)}`);
    const min = n0(snap.overtime_minimum_minutes);
    if (raw > 0 && min > 0) {
      lines.push(
        raw - offset < min
          ? `Below the ${formatMinutes(min)} minimum: no OT`
          : `Minimum OT ${formatMinutes(min)} met`
      );
    }
    const method = String(snap.overtime_rounding_method || "NONE").toUpperCase();
    const interval = n0(snap.overtime_rounding_interval_minutes);
    if (method !== "NONE" && interval > 1) lines.push(`Rounded ${method.toLowerCase()} to ${formatMinutes(interval)}`);
    if (snap.maximum_ot_minutes_per_day !== null && snap.maximum_ot_minutes_per_day !== undefined) {
      lines.push(`Daily cap ${formatMinutes(snap.maximum_ot_minutes_per_day)}`);
    }
  }

  const candidate = n0(day.candidate_ot_minutes);
  lines.push(candidate > 0 ? `OT ${formatMinutes(candidate)}` : "OT 0m");
  const approved = n0(day.approved_ot_minutes);
  if (approved > 0) lines.push(`Approved ${formatMinutes(approved)}`);
  return lines;
}

module.exports = {
  STATUS,
  roleLabel,
  levelLabel,
  displayDateTime,
  stageLabel,
  decisionLabel,
  recalcStatusLabel,
  buildRecalcBody,
  runFilterLabel,
  LABEL,
  REGULARIZED_PUNCH_LABEL,
  PUNCH_STATUS,
  PUNCH_STATUS_LABEL,
  PUNCH_STATUS_COLOR,
  canVoidPunch,
  dayPunchRows,
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
  shortExplanation,
  otExplanation,
};
