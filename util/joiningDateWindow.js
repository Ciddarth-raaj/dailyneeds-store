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

module.exports = {
  JOINING_DATE_WINDOW_DAYS,
  JOINING_DATE_ERROR,
  istTodayIso,
  joiningDateBounds,
  joiningDateWindowError,
};
