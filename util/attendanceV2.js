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
      // The employee's Extra Break Hours would leave the day no working
      // minutes at all. A configuration fault, reported in the same bucket as
      // the other two - the reason on the row names the exact cause.
      if (reasons.includes("BREAK_EXCEEDS_SHIFT")) {
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
 *   REJECTED                "OT Rejected"                 an APPROVER said no
 *   CLOSED_AT_PAYROLL_LOCK  "OT Closed – Payroll Locked"  the PERIOD said no
 *
 * THE LAST TWO ARE NOT THE SAME THING AND ARE NOT SHOWN AS THE SAME THING.
 * A rejection is a person's decision on this employee's claim and carries
 * that person's remarks; a closure is the payroll period being shut, which
 * no one decided about this claim in particular. The database stores the
 * closure on a row whose `status` happens to be REJECTED - that is a storage
 * detail, and `ot_closure_reason` is what distinguishes them - so the
 * distinction is made HERE, where an employee reads it. Telling somebody
 * their overtime was "rejected" when in fact the month closed sends them to
 * argue with a manager who decided nothing.
 *
 * @returns {{state:string, label:string, minutes:number, canRequest:boolean,
 *   color:string, detail:string|null}|null} null when the day has no OT at all
 */
/**
 * The closure wording as the BACKEND records it, kept for the approval
 * screens that already show `closure_label` from the request row.
 */
const OT_CLOSURE_LABEL = Object.freeze({
  NOT_REQUESTED_BEFORE_PAYROLL_LOCK: "Rejected – Not Requested Before Payroll Lock",
  NOT_APPROVED_BEFORE_PAYROLL_LOCK: "Rejected – Not Approved Before Payroll Lock",
});

/**
 * The same two closures as an EMPLOYEE should read them: the period closed,
 * and why it caught this date. The word "Rejected" is deliberately absent -
 * nobody rejected anything.
 */
const OT_CLOSURE_EMPLOYEE_LABEL = Object.freeze({
  NOT_REQUESTED_BEFORE_PAYROLL_LOCK: "Payroll for this month was locked before this OT was requested",
  NOT_APPROVED_BEFORE_PAYROLL_LOCK: "Payroll for this month was locked before this OT was approved",
});

/** The user-facing name of the closed state, wherever it is shown. */
const OT_CLOSED_LABEL = "Closed – Payroll Locked";

function otClosureReason(day) {
  if (!day) return null;
  return OT_CLOSURE_EMPLOYEE_LABEL[day.ot_closure_reason] || "Payroll for this month was locked";
}

function otClaim(day) {
  if (!day) return null;
  const state = day.ot_claim_state || "NONE";
  const candidate = Math.max(0, Math.trunc(Number(day.candidate_ot_minutes) || 0));
  const requested = day.ot_requested_minutes === null || day.ot_requested_minutes === undefined
    ? candidate
    : Math.max(0, Math.trunc(Number(day.ot_requested_minutes) || 0));
  const approved = Math.max(0, Math.trunc(Number(day.approved_ot_minutes) || 0));

  // What an approved SHIFT CHANGE already authorised, and what is left to
  // claim. Both come from the server; on an ordinary date the first is 0 and
  // the second is the whole candidate.
  const shiftAuthorised = Math.max(0, Math.trunc(Number(day.ot_shift_authorised_minutes) || 0));
  const claimable =
    day.ot_claimable_minutes === null || day.ot_claimable_minutes === undefined
      ? candidate
      : Math.max(0, Math.trunc(Number(day.ot_claimable_minutes) || 0));

  switch (state) {
    /*
     * APPROVED BY THE SHIFT CHANGE ITSELF. There is no OT request and there
     * must not be one - the approval already happened, under Shift, and
     * asking the employee to claim it again would be asking twice for one
     * decision. `canRequest` is true ONLY for whatever fell outside the
     * approved shift's own window, which the ordinary path still covers.
     */
    case "APPROVED_VIA_SHIFT_CHANGE": {
      /*
       * THE EXCESS HAS ITS OWN FATE, and it is not the day's.
       *
       * A 30-minute excess that was closed at payroll lock, rejected, or is
       * still pending does not un-approve the five hours the shift change
       * authorised - so the day stays green and says what happened to the
       * remainder beside it, rather than presenting the whole date as
       * closed. `canRequest` is true only while the excess is genuinely
       * still claimable.
       */
      const excessState = day.ot_excess_state || (claimable > 0 ? "AVAILABLE" : "NONE");
      const excessDetail = {
        AVAILABLE: `${formatOtClock(claimable)} worked outside the approved shift is still to be requested`,
        REQUEST_PENDING: `${formatOtClock(claimable)} outside the approved shift is requested and awaiting approval`,
        // The APPROVED figure is the backend's own component, not the
        // claimable remainder: they differ the moment a later correction
        // clamps what the request may be paid, and showing the wrong one
        // would print a number nobody is owed.
        APPROVED: `${formatOtClock(
          day.ot_request_approved_minutes === undefined || day.ot_request_approved_minutes === null
            ? claimable
            : Math.max(0, Math.trunc(Number(day.ot_request_approved_minutes) || 0))
        )} outside the approved shift was also approved`,
        REJECTED: `${formatOtClock(claimable)} outside the approved shift was rejected`,
        CLOSED_AT_PAYROLL_LOCK: `${formatOtClock(claimable)} outside the approved shift: ${OT_CLOSED_LABEL}`,
      }[excessState] || null;

      return {
        state,
        label: `OT Approved via Shift Change: ${formatOtClock(shiftAuthorised)}`,
        minutes: shiftAuthorised,
        // Only an excess nobody has claimed yet may still be claimed.
        canRequest: claimable > 0 && excessState === "AVAILABLE",
        color: "green",
        detail: excessDetail,
      };
    }
    case "AVAILABLE":
      return { state, label: `OT Available: ${formatOtClock(claimable)}`, minutes: claimable, canRequest: true, color: "blue", detail: null };
    case "REQUEST_PENDING":
      return { state, label: `OT Request Pending: ${formatOtClock(requested)}`, minutes: requested, canRequest: false, color: "orange", detail: day.ot_reason || null };
    case "APPROVED":
      return { state, label: `OT Approved: ${formatOtClock(approved)}`, minutes: approved, canRequest: false, color: "green", detail: null };
    case "REJECTED":
      return { state, label: "OT Rejected", minutes: requested, canRequest: false, color: "red", detail: null };
    case "CLOSED_AT_PAYROLL_LOCK":
      // GREY, NOT RED, AND NOT THE WORD "REJECTED". See the header.
      return {
        state,
        label: `OT ${OT_CLOSED_LABEL}`,
        minutes: requested,
        canRequest: false,
        color: "gray",
        detail: otClosureReason(day),
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

/* ================================== the employee's own request tabs ==== */

/**
 * THE THREE TABS of the employee's own attendance area, in order.
 *
 * Attendance is index 0 and stays the landing tab: the month is what an
 * employee opens this page for, and the two request tabs are what they came
 * back for. The INDEX is what the controlled `<Tabs>` is driven by, exactly
 * as `util/telegramAttendance.js#SECTION_ORDER` drives the Mini App's.
 */
const MY_TAB = Object.freeze({
  ATTENDANCE: "ATTENDANCE",
  CORRECTIONS: "CORRECTIONS",
  OT: "OT",
  // The one-day shift change. It is a REQUEST like the two beside it - the
  // employee asks and an approver decides - so it belongs in the same list
  // rather than behind a button whose outcome is nowhere to be seen.
  SHIFT: "SHIFT",
});

const MY_TAB_ORDER = Object.freeze([MY_TAB.ATTENDANCE, MY_TAB.CORRECTIONS, MY_TAB.OT, MY_TAB.SHIFT]);

const MY_TAB_LABEL = Object.freeze({
  ATTENDANCE: "Attendance",
  CORRECTIONS: "Correction Requests",
  OT: "OT Requests",
  SHIFT: "Shift Requests",
});

function myTabIndex(tab) {
  const i = MY_TAB_ORDER.indexOf(tab);
  return i === -1 ? 0 : i;
}

function myTabAtIndex(index) {
  return MY_TAB_ORDER[index] || MY_TAB.ATTENDANCE;
}

/**
 * THE OT REQUEST STATUS a row shows, in the agreed request words.
 *
 * READ OFF `ot_claim_state`, which the backend derives from the OT request
 * row itself (`usecase/attendance_calculation.js#otClaimFor`). NOTHING HERE
 * DECIDES A STATUS and nothing here decides a duration: the four statuses
 * map one-for-one onto the claim states, and a payroll-lock closure is a
 * Rejected whose reason is the closure wording the backend recorded.
 *
 * @returns {{key:string, label:string, color:string, minutes:number,
 *   rejectionReason:string|null, requestedAt:string|null,
 *   decidedAt:string|null, requestId:number|null}}
 */
const OT_REQUEST_STATUS = Object.freeze({
  NOT_REQUESTED: "Not Requested",
  // A SIXTH STATUS, and not "Approved": an approved one-day shift change
  // authorises the overtime it produces, so the employee never filed - and
  // must never be asked to file - a request for it.
  APPROVED_VIA_SHIFT_CHANGE: "Approved via Shift Change",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  // A FIFTH STATUS, because a closed period is not a decision. `Rejected`
  // below carries an approver's remarks in `rejectionReason`; `Closed`
  // carries the period's reason in `closureReason` and leaves
  // `rejectionReason` null, so no screen can print a closure as though
  // somebody had refused the claim.
  CLOSED: "Closed – Payroll Locked",
});

function otRequestStatus(day) {
  const claim = otClaim(day) || { state: "NONE", minutes: 0 };
  const base = {
    minutes: claim.minutes || 0,
    requestId: day && day.ot_request_id !== undefined ? day.ot_request_id : null,
    reason: (day && day.ot_reason) || null,
    requestedAt: (day && day.ot_requested_at) || null,
    decidedAt: (day && day.ot_decided_at) || null,
    rejectionReason: null,
    closureReason: null,
  };
  switch (claim.state) {
    case "APPROVED_VIA_SHIFT_CHANGE":
      return {
        ...base,
        key: "APPROVED_VIA_SHIFT_CHANGE",
        label: OT_REQUEST_STATUS.APPROVED_VIA_SHIFT_CHANGE,
        color: "green",
        // The request that authorised it, so the row can point at the
        // decision instead of implying an OT request nobody made.
        authorisingRequestId: (day && day.ot_authorising_request_id) || null,
        // And what became of the remainder - a second fact, shown beside the
        // first rather than replacing it.
        excessState: (day && day.ot_excess_state) || "NONE",
        excessMinutes: Math.max(0, Math.trunc(Number(day && day.ot_claimable_minutes) || 0)),
        // The two approved components, read from the backend rather than
        // inferred by subtracting one total from another.
        shiftAuthorisedMinutes: Math.max(
          0,
          Math.trunc(Number(day && day.ot_shift_authorised_minutes) || 0)
        ),
        otRequestApprovedMinutes: Math.max(
          0,
          Math.trunc(Number(day && day.ot_request_approved_minutes) || 0)
        ),
        approvedOtSource: (day && day.approved_ot_source) || null,
        closureReason: (day && day.ot_closure_reason) ? otClosureReason(day) : null,
      };
    case "REQUEST_PENDING":
      return { ...base, key: "PENDING", label: OT_REQUEST_STATUS.PENDING, color: "orange" };
    case "APPROVED":
      return { ...base, key: "APPROVED", label: OT_REQUEST_STATUS.APPROVED, color: "green" };
    case "REJECTED":
      return {
        ...base,
        key: "REJECTED",
        label: OT_REQUEST_STATUS.REJECTED,
        color: "red",
        // The approver's own words. A rejection with no remarks shows the
        // status alone rather than an invented sentence.
        rejectionReason: (day && day.ot_rejection_remarks) || null,
      };
    case "CLOSED_AT_PAYROLL_LOCK":
      return {
        ...base,
        key: "CLOSED",
        label: OT_REQUEST_STATUS.CLOSED,
        color: "gray",
        // NOT `rejectionReason`: nobody rejected this.
        closureReason: otClosureReason(day),
      };
    default:
      return { ...base, key: "NOT_REQUESTED", label: OT_REQUEST_STATUS.NOT_REQUESTED, color: "gray" };
  }
}

/**
 * THE CORRECTION DEPENDENCY, as a sentence or null.
 *
 * OT is a claim on a day that is SETTLED. While the date still has a missing
 * or wrong punch, or a correction nobody has decided yet, its overtime is a
 * guess - so the employee is sent to finish the correction first rather than
 * being allowed to claim against a figure that is about to change.
 *
 * THIS IS NOT A SECOND RULE. The backend refuses the same submission
 * (`raiseOtRequest`: an open request on the date, and a day that is not a
 * complete FINAL one), and would refuse it even if this returned null. What
 * it decides is what the SCREEN says instead of a disabled button with no
 * explanation.
 *
 * @returns {string|null} the message, or null when nothing blocks OT
 */
const OT_BLOCKED_BY_CORRECTION = "Complete attendance correction first.";

function otBlockedReason(day) {
  if (!day) return null;
  if (day.correction_state === "PENDING") return OT_BLOCKED_BY_CORRECTION;
  const issue = dayIssue(day);
  if (issue && (issue.key === "MISSING_PUNCH" || issue.key === "REGULARIZATION_PENDING")) {
    return OT_BLOCKED_BY_CORRECTION;
  }
  return null;
}

/**
 * Whether the Request OT action is offered on a day.
 *
 * `canRequest` is the backend's claim state - AVAILABLE and nothing else -
 * and the correction dependency is checked on top of it. Both have to agree,
 * and neither is computed from punch times on this side.
 */
function canRequestOt(day) {
  const claim = otClaim(day);
  return !!claim && claim.canRequest === true && otBlockedReason(day) === null;
}

/**
 * The rows the OT Requests tab shows: every date of the loaded month that
 * has OT to talk about - one the engine found, or one already claimed.
 *
 * A day with neither is not an OT row. It is not hidden by a rule of this
 * file's own: `candidate_ot_minutes` is the engine's figure on the day, and
 * `ot_claim_state` is the request's state, both as the server sent them.
 */
function otRequestRows(days) {
  return (Array.isArray(days) ? days : []).filter((d) => {
    const state = (d && d.ot_claim_state) || "NONE";
    if (state !== "NONE") return true;
    return Math.trunc(Number(d && d.candidate_ot_minutes) || 0) > 0;
  });
}

/**
 * THE CORRECTION REQUEST STATUS, the mirror of `otRequestStatus`, read off
 * `correction_state` - the request row the backend put beside the day.
 */
const CORRECTION_REQUEST_STATUS = Object.freeze({
  NOT_REQUESTED: "Not Requested",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
});

function correctionRequestStatus(day) {
  const state = (day && day.correction_state) || "NONE";
  const base = {
    requestId: (day && day.correction_request_id) || null,
    reason: (day && day.correction_reason) || null,
    requestedAt: (day && day.correction_requested_at) || null,
    decidedAt: (day && day.correction_decided_at) || null,
    rejectionReason: null,
  };
  switch (state) {
    case "PENDING":
      return { ...base, key: "PENDING", label: CORRECTION_REQUEST_STATUS.PENDING, color: "orange" };
    case "APPROVED":
      return { ...base, key: "APPROVED", label: CORRECTION_REQUEST_STATUS.APPROVED, color: "green" };
    case "REJECTED":
      return {
        ...base,
        key: "REJECTED",
        label: CORRECTION_REQUEST_STATUS.REJECTED,
        color: "red",
        rejectionReason: (day && day.correction_rejection_remarks) || null,
      };
    default:
      return { ...base, key: "NOT_REQUESTED", label: CORRECTION_REQUEST_STATUS.NOT_REQUESTED, color: "gray" };
  }
}

/**
 * The rows the Correction Requests tab shows: a date with a correction filed
 * against it, or one that still needs one (a Missing Punch day).
 */
function correctionRequestRows(days) {
  return (Array.isArray(days) ? days : []).filter((d) => {
    if (d && d.correction_state && d.correction_state !== "NONE") return true;
    const issue = dayIssue(d);
    return !!issue && (issue.key === "MISSING_PUNCH" || issue.key === "REGULARIZATION_PENDING");
  });
}

/**
 * THE SHIFT REQUEST STATUS, the third mirror of `otRequestStatus`, read off
 * `shift_change_state` - the request row the backend put beside the day.
 *
 * A pending shift request decides NOTHING about the day: it is not an issue,
 * it does not hold the date open and the day is still calculated under the
 * employee's ordinary shift until the final approval writes the one-date
 * override. This reads the request's state and says so, and nothing else.
 */
const SHIFT_REQUEST_STATUS = Object.freeze({
  NOT_REQUESTED: "Not Requested",
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
});

function shiftRequestStatus(day) {
  const state = (day && day.shift_change_state) || "NONE";
  const base = {
    requestId: (day && day.shift_change_request_id) || null,
    requestedWorkShiftId: (day && day.shift_change_requested_work_shift_id) || null,
    reason: (day && day.shift_change_reason) || null,
    requestedAt: (day && day.shift_change_requested_at) || null,
    decidedAt: (day && day.shift_change_decided_at) || null,
    rejectionReason: null,
  };
  switch (state) {
    case "PENDING":
      return { ...base, key: "PENDING", label: SHIFT_REQUEST_STATUS.PENDING, color: "orange" };
    case "APPROVED":
      return { ...base, key: "APPROVED", label: SHIFT_REQUEST_STATUS.APPROVED, color: "green" };
    case "REJECTED":
      return {
        ...base,
        key: "REJECTED",
        label: SHIFT_REQUEST_STATUS.REJECTED,
        color: "red",
        rejectionReason: (day && day.shift_change_rejection_remarks) || null,
      };
    default:
      return { ...base, key: "NOT_REQUESTED", label: SHIFT_REQUEST_STATUS.NOT_REQUESTED, color: "gray" };
  }
}

/**
 * The rows the Shift Requests tab shows: the dates a one-day shift change was
 * actually asked for.
 *
 * Unlike the other two tabs there is no "still needs one" case - a shift
 * request is a choice, never something the engine finds wrong with a day - so
 * a date nobody asked about is simply not a row.
 */
function shiftRequestRows(days) {
  return (Array.isArray(days) ? days : []).filter(
    (d) => d && d.shift_change_state && d.shift_change_state !== "NONE"
  );
}

/**
 * THE MONTH SUMMARY: Present / Absent / Need Action, and the filter they drive.
 *
 * CLASSIFICATION READS THE ATTENDANCE STATUS ONLY - through `dayIssue`, the
 * same mapping the badges use, so a day is bucketed exactly as it is labelled.
 * IT NEVER READS THE OT CLAIM. `ot_claim_state` decides OT Available / Request
 * Pending / Approved / Rejected and nothing else; a good day with OT waiting on
 * somebody is still a Present day, because OT is a claim on a day that was
 * worked, not a defect in it. Mixing the two would make a Present count drop
 * when an employee asked for overtime, which is the opposite of the truth.
 *
 *   PRESENT      no issue at all - a complete, final day
 *   ABSENT       the Absent status, and only that
 *   NEED_ACTION  Missing Punch, Regularization Pending, No Shift Assigned,
 *                Shift Setup Issue - the days somebody has to do something about
 *
 * Missing Punch is NEED_ACTION, never ABSENT: the employee was here and a
 * punch is missing, which is a correction to make, not a day off.
 */
const SUMMARY_FILTER = Object.freeze({
  ALL: "ALL",
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  NEED_ACTION: "NEED_ACTION",
});

/** The issue keys that mean somebody has to act. */
const NEED_ACTION_ISSUE_KEYS = Object.freeze([
  "MISSING_PUNCH",
  "REGULARIZATION_PENDING",
  "NO_SHIFT",
  "SHIFT_SETUP",
]);

/**
 * Which summary bucket a day falls in: PRESENT, ABSENT or NEED_ACTION.
 *
 * An issue key that is not one of the five known ones counts as NEED_ACTION
 * rather than PRESENT - an unrecognised problem is still a problem, and
 * counting it as a good day would hide it.
 */
function daySummaryBucket(day) {
  const issue = dayIssue(day);
  if (!issue) return SUMMARY_FILTER.PRESENT;
  if (issue.key === "ABSENT") return SUMMARY_FILTER.ABSENT;
  return SUMMARY_FILTER.NEED_ACTION;
}

/** The four counts for a loaded month. No second request: this is the rows. */
function attendanceSummary(days) {
  const rows = Array.isArray(days) ? days : [];
  const counts = {
    [SUMMARY_FILTER.ALL]: rows.length,
    [SUMMARY_FILTER.PRESENT]: 0,
    [SUMMARY_FILTER.ABSENT]: 0,
    [SUMMARY_FILTER.NEED_ACTION]: 0,
  };
  rows.forEach((day) => {
    counts[daySummaryBucket(day)] += 1;
  });
  return counts;
}

/** The loaded rows a filter shows. ALL - or anything unknown - is every row. */
function filterDaysBySummary(days, filter) {
  const rows = Array.isArray(days) ? days : [];
  if (!filter || filter === SUMMARY_FILTER.ALL) return rows;
  return rows.filter((day) => daySummaryBucket(day) === filter);
}

/** What an empty table says, in the words of the filter that emptied it. */
const SUMMARY_EMPTY_MESSAGE = Object.freeze({
  ALL: "No attendance for this period.",
  PRESENT: "No present days in this month.",
  ABSENT: "No absent days in this month.",
  NEED_ACTION: "No attendance items need action.",
});

function summaryEmptyMessage(filter) {
  return SUMMARY_EMPTY_MESSAGE[filter] || SUMMARY_EMPTY_MESSAGE.ALL;
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
  // A Work Shift save queues its propagation rather than running it in the
  // save's request; the worker picks it up within a minute.
  QUEUED: "Queued",
  RUNNING: "Recalculating",
  COMPLETED: "Completed",
  COMPLETED_WITH_ERRORS: "Completed with errors",
  FAILED: "Failed",
  // A newer queued run for the same shift took this one's work over: it
  // carries the same latest rules across the same open attendance, so this
  // run is resolved and nobody waits for it.
  SUPERSEDED: "Superseded",
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
  // A run started by a Work Shift save has no employee filter: what it
  // targeted is "everybody this shift governs", and saying so is more use
  // than "All employees".
  if (run.trigger_source === "WORK_SHIFT_SAVE") {
    const shift = run.shift_name || run.shift_code || (run.work_shift_id ? `Shift ${run.work_shift_id}` : null);
    parts.push(shift ? `Shift rule change · ${shift}` : "Shift rule change");
  }
  if (run.employee_id) parts.push(run.employee_name ? `${run.employee_name} (${run.employee_id})` : `Employee ${run.employee_id}`);
  return parts.length ? parts.join(" · ") : "All employees";
}

/**
 * Only a run that failed, or that finished with errors, may be retried - and
 * never one a newer queued run has already taken over.
 */
function canRetryRun(run) {
  if (!run || run.superseded_by_run_id) return false;
  return ["FAILED", "COMPLETED_WITH_ERRORS"].includes(run.status);
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
      `Lunch ${formatMinutes(gaps)} against ${formatMinutes(allowed)} allowed` +
        (gaps > allowed ? ` – ${formatMinutes(gaps - allowed)} over` : gaps < allowed ? ` – ${formatMinutes(allowed - gaps)} under, counted as worked` : "")
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

  // The break, so a short lunch that fed the surplus is visible.
  if (punches >= 4) {
    const gaps = n0(day.actual_gap_minutes);
    const allowed = n0(day.break_allowance_minutes);
    if (gaps < allowed) {
      lines.push(`Lunch ${formatMinutes(gaps)} against ${formatMinutes(allowed)} allowed: ${formatMinutes(allowed - gaps)} under, counted as worked`);
    } else if (gaps > allowed) {
      lines.push(`Lunch ${formatMinutes(gaps)} against ${formatMinutes(allowed)} allowed: ${formatMinutes(gaps - allowed)} over`);
    } else {
      lines.push(`Lunch ${formatMinutes(gaps)}, exactly the allowance`);
    }
  }

  const pre = n0(day.pre_shift_minutes);
  const post = n0(day.post_shift_minutes);
  const raw = n0(day.raw_ot_minutes);

  // The engine's chain, as a running figure: the surplus, less the part
  // before in-time (its own rules, or dropped), less the offsets, then the
  // minimum, rounding and cap.
  if (punches === 2 && worked > nrm && raw < worked - nrm) {
    lines.push(`Two punches only: OT counts time after out-time, not an unused break: ${formatMinutes(raw)}`);
  }
  let running = raw;
  if (pre > 0) {
    const prePart = Math.min(pre, running);
    running -= prePart;
    const preMin = n0(snap.pre_shift_overtime_minimum_minutes);
    if (!snap.pre_shift_overtime_allowed) {
      lines.push(`Before in-time ${formatMinutes(prePart)} dropped (pre-shift OT off): ${formatMinutes(running)}`);
    } else if (prePart < preMin) {
      lines.push(`Before in-time ${formatMinutes(prePart)}: below the ${formatMinutes(preMin)} pre-shift minimum, not paid`);
    } else if (snap.pre_shift_overtime_minimum_excluded && preMin > 0) {
      lines.push(`Before in-time ${formatMinutes(prePart)}, minimum ${formatMinutes(preMin)} excluded: ${formatMinutes(prePart - preMin)} pre-shift OT`);
    } else {
      lines.push(`Before in-time ${formatMinutes(prePart)} pre-shift OT`);
    }
  }
  if (post > 0 && running > 0) lines.push(`After out-time ${formatMinutes(post)}`);

  if (!snap.overtime_allowed) {
    lines.push("OT not allowed on this shift");
  } else if (running > 0) {
    const offset = n0(day.ot_offset_minutes);
    if (offset > 0) {
      running = Math.max(0, running - offset);
      lines.push(`Late / early-out offset −${formatMinutes(offset)}: ${formatMinutes(running)}`);
    }
    const min = n0(snap.overtime_minimum_minutes);
    if (min > 0) {
      if (running < min) {
        lines.push(`Below the ${formatMinutes(min)} minimum: no OT`);
        running = 0;
      } else if (snap.overtime_minimum_excluded) {
        lines.push(`Minimum ${formatMinutes(min)} excluded: ${formatMinutes(running)} − ${formatMinutes(min)} = ${formatMinutes(running - min)}`);
        running -= min;
      } else {
        lines.push(`Minimum OT ${formatMinutes(min)} met`);
      }
    }
    const method = String(snap.overtime_rounding_method || "NONE").toUpperCase();
    const interval = n0(snap.overtime_rounding_interval_minutes);
    if (running > 0 && method !== "NONE" && interval > 1) lines.push(`Rounded ${method.toLowerCase()} to ${formatMinutes(interval)}`);
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
  canRetryRun,
  LABEL,
  REGULARIZED_PUNCH_LABEL,
  PUNCH_STATUS,
  PUNCH_STATUS_LABEL,
  PUNCH_STATUS_COLOR,
  canVoidPunch,
  dayPunchRows,
  OT_CLOSURE_LABEL,
  OT_CLOSURE_EMPLOYEE_LABEL,
  OT_CLOSED_LABEL,
  otClosureReason,
  dayIssue,
  SUMMARY_FILTER,
  NEED_ACTION_ISSUE_KEYS,
  daySummaryBucket,
  attendanceSummary,
  filterDaysBySummary,
  SUMMARY_EMPTY_MESSAGE,
  summaryEmptyMessage,
  otClaim,
  MY_TAB,
  MY_TAB_ORDER,
  MY_TAB_LABEL,
  myTabIndex,
  myTabAtIndex,
  OT_REQUEST_STATUS,
  otRequestStatus,
  OT_BLOCKED_BY_CORRECTION,
  otBlockedReason,
  canRequestOt,
  otRequestRows,
  SHIFT_REQUEST_STATUS,
  shiftRequestStatus,
  shiftRequestRows,
  CORRECTION_REQUEST_STATUS,
  correctionRequestStatus,
  correctionRequestRows,
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
