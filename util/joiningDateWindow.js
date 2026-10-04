const { toIsoDate } = require("./joiningDate");

/**
 * THE JOINING-DATE ENTRY WINDOW - the browser's copy of the backend rule in
 * `utils/joining_date_window.js`: a joining date being RECORDED must fall
 * within 30 calendar days either side of today's IST business date.
 *
 *   today 2026-10-04   earliest 2026-09-04   latest 2026-11-03
 *
 * It exists so 03/10/2026 typed as 03/10/2006 (employee 2298) is caught on
 * the form and the date picker cannot offer it. IT IS A CONVENIENCE, NOT THE
 * GUARD: every API that writes a joining date applies the same rule on the
 * server, so a request that never touched this screen is refused too.
 *
 * IT JUDGES A DATE BEING ENTERED, NEVER A STORED ONE. A 2015 employee opened
 * for an unrelated edit is not judged - callers apply this only on create or
 * when `joiningDateChanged` says the date itself moved.
 *
 * CALENDAR DATES IN IST. Today is the Indian business date whatever zone the
 * browser is in, and the bounds are whole-day arithmetic in UTC, so neither
 * the device clock's zone nor the hour can shift a bound by a day.
 */

const JOINING_DATE_WINDOW_DAYS = 30;

const JOINING_DATE_ERROR = Object.freeze({
  TOO_EARLY: "Joining date cannot be more than 30 days before today.",
  TOO_LATE: "Joining date cannot be more than 30 days after today.",
});

const IST_OFFSET_MINUTES = 5 * 60 + 30;

/** Today's IST calendar date as `YYYY-MM-DD`, from an instant (default now). */
function istTodayIso(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(
    ist.getUTCDate()
  ).padStart(2, "0")}`;
}

function addDays(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** `{ min, max }` for a date input, both inclusive, for a business date. */
function joiningDateBounds(today = istTodayIso()) {
  return {
    min: addDays(today, -JOINING_DATE_WINDOW_DAYS),
    max: addDays(today, JOINING_DATE_WINDOW_DAYS),
  };
}

/**
 * The message for a date outside the window, or null when it may be
 * recorded. A value that is not a readable date is left to the caller's own
 * "use a full date" check and answers null here.
 */
function joiningDateWindowError(value, today = istTodayIso()) {
  const date = toIsoDate(value);
  if (!date) return null;
  const { min, max } = joiningDateBounds(today);
  if (date < min) return JOINING_DATE_ERROR.TOO_EARLY;
  if (date > max) return JOINING_DATE_ERROR.TOO_LATE;
  return null;
}

/* ============================== historical joining-date correction ====== */

/**
 * THE ONE EXCEPTION, AND ONLY TO THE PAST. The dedicated joining-date
 * correction may record a date OLDER than the window - a genuine historical
 * correction, or a legacy employee's missing date - for a user holding this
 * key, with a stated reason. Never a date later than today + 30, and never
 * from New Employee or Rejoin. The backend decides it from the caller's own
 * key; this only decides whether the screen offers the action.
 */
const HISTORICAL_CORRECTION_KEY = "employee_joining_date_historical_correction";
const CORRECTION_REASON_MIN = 10;
const CORRECTION_REASON_MAX = 500;
const REASON_ERROR = `Give a correction reason of at least ${CORRECTION_REASON_MIN} characters.`;

/** May this user be offered the historical correction? (It needs employee_edit too.) */
function canCorrectJoiningDateHistorically({ permissions = [], isAdmin = false } = {}) {
  if (isAdmin === true) return true;
  const list = Array.isArray(permissions) ? permissions : [];
  const has = (key) => list.some((p) => p === key || (p && p.permission_key === key));
  return has(HISTORICAL_CORRECTION_KEY) && has("employee_edit");
}

/** The historical picker: no lower bound, the same upper bound as everywhere. */
function historicalCorrectionBounds(today = istTodayIso()) {
  return { max: joiningDateBounds(today).max };
}

/** Only the FUTURE bound applies to a historical correction. */
function historicalCorrectionDateError(value, today = istTodayIso()) {
  const date = toIsoDate(value);
  if (!date) return "Choose the correct joining date.";
  return date > joiningDateBounds(today).max ? JOINING_DATE_ERROR.TOO_LATE : null;
}

function correctionReasonError(value) {
  const text = String(value === null || value === undefined ? "" : value).trim();
  return text.length < CORRECTION_REASON_MIN || text.length > CORRECTION_REASON_MAX ? REASON_ERROR : null;
}

module.exports = {
  HISTORICAL_CORRECTION_KEY,
  CORRECTION_REASON_MIN,
  canCorrectJoiningDateHistorically,
  historicalCorrectionBounds,
  historicalCorrectionDateError,
  correctionReasonError,
  JOINING_DATE_WINDOW_DAYS,
  JOINING_DATE_ERROR,
  istTodayIso,
  joiningDateBounds,
  joiningDateWindowError,
};
