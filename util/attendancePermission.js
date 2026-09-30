/**
 * Attendance PERMISSION screens - the pure part. CommonJS so
 * `node --test util/attendancePermission.test.js` runs it without a bundler.
 *
 * A Permission is PAID FORGIVEN SHORTAGE, NEVER WORKED TIME. Everything here
 * keeps the two apart on screen:
 *
 *   Worked      what the punches say - never increased by a permission
 *   Permission  the window management allowed, and the minutes of it that
 *               actually covered a shortage (paid, not worked)
 *   Short       what is still charged after grace and permission
 *
 * NOTHING HERE CALCULATES. The minutes are the backend engine's
 * (`permission_minutes`, `shortage_before_permission_minutes`,
 * `payable_minutes` on the day); this file only words them.
 */

const PERMISSION_STATE = Object.freeze({
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  REVOKED: "REVOKED",
  CLOSED_AT_PAYROLL_LOCK: "CLOSED_AT_PAYROLL_LOCK",
});

const PERMISSION_STATE_LABEL = Object.freeze({
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVOKED: "Revoked",
  CLOSED_AT_PAYROLL_LOCK: "Closed – Not approved before payroll lock",
});

const PERMISSION_STATE_COLOR = Object.freeze({
  PENDING: "orange",
  APPROVED: "green",
  REJECTED: "red",
  REVOKED: "gray",
  CLOSED_AT_PAYROLL_LOCK: "gray",
});

const PERMISSION_SOURCE_LABEL = Object.freeze({
  REQUEST: "Requested",
  DIRECT: "Management grant",
});

/** The line that tells a reader these minutes were not worked. */
const PAID_NOT_WORKED = "Paid permission – not worked";

const n0 = (v) => Math.max(0, Math.trunc(Number(v) || 0));

function formatMinutes(value) {
  const m = n0(value);
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${String(r).padStart(2, "0")}m`;
}

/** `HH:MM` out of a time or a date-time string. */
function hhmm(value) {
  const m = /(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value || "").trim());
  return m ? `${m[1]}:${m[2]}` : "";
}

/** "20:00 – 22:00", or "20:00 – shift end (22:00)". */
function permissionWindowLabel(p) {
  if (!p) return "";
  const from = p.from_time || hhmm(p.permission_from);
  const to = p.to_time || hhmm(p.permission_to);
  return p.to_shift_end ? `${from} – shift end (${to})` : `${from} – ${to}`;
}

function permissionStateLabel(p) {
  const state = p && p.state;
  return PERMISSION_STATE_LABEL[state] || state || "";
}

function permissionStateColor(p) {
  return PERMISSION_STATE_COLOR[p && p.state] || "gray";
}

function permissionSourceLabel(p) {
  if (!p) return "";
  if (p.source === "DIRECT" && p.bulk_operation_id) return "Management grant (bulk)";
  return PERMISSION_SOURCE_LABEL[p.source] || p.source || "";
}

/**
 * What a day says about Permission, or null when it has none to say.
 *
 *   windows            every permission on the date, in every state
 *   appliedMinutes     paid permission that covered chargeable shortage
 *   windowMinutes      the effective windows, clipped to the shift
 *   beforeMinutes      the shortage without it (null on an old stored row)
 *   fullPay            present, settled, nothing short, and a permission
 *                      covered part of it - "Present / Full Pay"
 */
function dayPermission(day) {
  if (!day) return null;
  const windows = Array.isArray(day.permissions) ? day.permissions : [];
  const applied = n0(day.permission_minutes);
  const windowMinutes = n0(day.permission_window_minutes);
  if (windows.length === 0 && applied === 0 && windowMinutes === 0) return null;
  const before =
    day.shortage_before_permission_minutes === null || day.shortage_before_permission_minutes === undefined
      ? null
      : n0(day.shortage_before_permission_minutes);
  const present = n0(day.attendance_day_count) > 0;
  const settled = day.is_final === true || day.is_final === 1;
  const fullPay = present && settled && applied > 0 && n0(day.shortage_minutes) === 0;
  return {
    windows,
    appliedMinutes: applied,
    windowMinutes,
    beforeMinutes: before,
    fullPay,
    payLabel: fullPay ? "Present / Full Pay" : null,
    // Said out loud when a window exists but covered nothing, so nobody reads
    // an approved permission as paid time it did not produce.
    uncoveredNote:
      windowMinutes > 0 && applied === 0
        ? "No chargeable shortage fell inside the permitted window"
        : null,
  };
}

/** Explanation lines appended to the Short tooltip. Empty with no permission. */
function permissionExplanation(day) {
  const p = dayPermission(day);
  if (!p || p.appliedMinutes === 0) return [];
  const lines = [];
  if (p.beforeMinutes !== null) lines.push(`Short before permission ${formatMinutes(p.beforeMinutes)}`);
  lines.push(`Permission forgave ${formatMinutes(p.appliedMinutes)} (${PAID_NOT_WORKED.toLowerCase()})`);
  return lines;
}

/* ---------------------------------------------------- the grant screen */

const TARGET_MODE = Object.freeze({
  ONE: "ONE",
  EMPLOYEES: "EMPLOYEES",
  OUTLETS: "OUTLETS",
  ALL: "ALL",
});

const TARGET_MODE_LABEL = Object.freeze({
  ONE: "One employee",
  EMPLOYEES: "Selected employees",
  OUTLETS: "Selected outlets",
  ALL: "All eligible employees",
});

/** Does this target need the bulk key as well? The server decides too. */
function needsBulkKey(form) {
  if (!form) return true;
  if (form.mode === TARGET_MODE.ONE) return false;
  if (form.mode === TARGET_MODE.EMPLOYEES) return (form.employee_ids || []).length !== 1;
  return true;
}

/**
 * The request body for preview/apply from the form, or `{ error }`.
 * Validated here so the screen can say what is missing; the server
 * validates again and is the authority.
 */
function grantBody(form) {
  const f = form || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.attendance_date || ""))) return { error: "Choose the date" };
  if (!/^\d{2}:\d{2}$/.test(String(f.from_time || ""))) return { error: "Choose the time the permission starts" };
  if (!f.to_shift_end && !/^\d{2}:\d{2}$/.test(String(f.to_time || ""))) {
    return { error: "Choose the time it ends, or until the scheduled shift end" };
  }
  const reason = String(f.reason || "").trim();
  if (reason.length < 5) return { error: "A reason of at least 5 characters is required" };
  const employees = (f.employee_ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const outlets = (f.outlet_ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0);
  let target;
  if (f.mode === TARGET_MODE.ONE) {
    if (employees.length !== 1) return { error: "Choose the employee" };
    target = { target_mode: "EMPLOYEES", employee_ids: employees.slice(0, 1) };
  } else if (f.mode === TARGET_MODE.EMPLOYEES) {
    if (employees.length === 0) return { error: "Choose at least one employee" };
    target = { target_mode: "EMPLOYEES", employee_ids: employees };
  } else if (f.mode === TARGET_MODE.OUTLETS) {
    if (outlets.length === 0) return { error: "Choose at least one outlet" };
    target = { target_mode: "OUTLETS", outlet_ids: outlets };
  } else if (f.mode === TARGET_MODE.ALL) {
    target = { target_mode: "ALL" };
  } else {
    return { error: "Choose who the permission is for" };
  }
  return {
    body: {
      attendance_date: f.attendance_date,
      from_time: f.from_time,
      ...(f.to_shift_end ? { to_shift_end: true } : { to_time: f.to_time }),
      ...target,
      reason,
      ...(f.remarks && String(f.remarks).trim() ? { remarks: String(f.remarks).trim() } : {}),
    },
  };
}

/** Anything changed since the preview discards it: a key over the form. */
function grantKey(form) {
  const r = grantBody(form);
  return r.body ? JSON.stringify(r.body) : null;
}

/** The confirm sentence, restating count, date and times before any write. */
function confirmSentence(preview) {
  if (!preview) return "";
  const n = n0(preview.counts && preview.counts.eligible);
  const who = n === 1 ? "1 employee" : `${n} employees`;
  const until = preview.to_shift_end ? "their scheduled shift end" : preview.to_time;
  return `Grant paid permission to ${who} on ${preview.attendance_date}, from ${preview.from_time} to ${until}?`;
}

/** Outcome counts of an apply or a bulk revoke, as the result tiles show them. */
function outcomeSummary(result) {
  const s = (result && result.summary) || {};
  return {
    succeeded: n0(s.succeeded),
    skipped: n0(s.skipped),
    failed: n0(s.failed),
    problems: ((result && result.results) || []).filter((r) => r && r.outcome !== "SUCCEEDED"),
  };
}

/** May the viewer revoke this row here? Direct grants only; the server checks again. */
function canRevokeDirect(p) {
  return !!p && p.source === "DIRECT" && p.state === PERMISSION_STATE.APPROVED;
}

/* ------------------------------------------- the employee's own request */

/**
 * The body for "Request Permission" from the form, or `{ error }`. One or
 * two windows (a late start and an early finish on one day).
 */
function requestBody(form) {
  const f = form || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.attendance_date || ""))) return { error: "Choose the date" };
  const windows = (f.windows || [])
    .filter((w) => w && (w.from_time || w.to_time))
    .map((w) => (w.to_shift_end ? { from_time: w.from_time, to_shift_end: true } : { from_time: w.from_time, to_time: w.to_time }));
  if (windows.length === 0) return { error: "Give the time you need" };
  for (const w of windows) {
    if (!/^\d{2}:\d{2}$/.test(String(w.from_time || ""))) return { error: "Times must be HH:MM" };
    if (!w.to_shift_end && !/^\d{2}:\d{2}$/.test(String(w.to_time || ""))) return { error: "Times must be HH:MM" };
  }
  const reason = String(f.reason || "").trim();
  if (reason.length < 5) return { error: "A reason of at least 5 characters is required" };
  return {
    body: {
      attendance_date: f.attendance_date,
      windows,
      reason,
      ...(f.employee_id ? { employee_id: Number(f.employee_id) } : {}),
    },
  };
}

module.exports = {
  PERMISSION_STATE,
  PERMISSION_STATE_LABEL,
  PERMISSION_STATE_COLOR,
  PERMISSION_SOURCE_LABEL,
  PAID_NOT_WORKED,
  TARGET_MODE,
  TARGET_MODE_LABEL,
  formatMinutes,
  permissionWindowLabel,
  permissionStateLabel,
  permissionStateColor,
  permissionSourceLabel,
  dayPermission,
  permissionExplanation,
  needsBulkKey,
  grantBody,
  grantKey,
  confirmSentence,
  outcomeSummary,
  canRevokeDirect,
  requestBody,
};
