/**
 * READING A JOINING DATE THAT MAY NOT BE ISO YET.
 *
 * ============================ THE BUG THIS EXISTS FOR =====================
 *
 * Employee Master showed a joining date in view mode and a BLANK
 * `dd-mm-yyyy` placeholder the moment Employment Details entered Edit. The
 * date had not been lost and the form was not failing to initialise: the edit
 * field is a native `<input type="date">`, which accepts EXACTLY `YYYY-MM-DD`
 * and silently renders empty for anything else, and the value being bound to
 * it was not that.
 *
 * `new_employee.date_of_joining` was a `VARCHAR(45)` carrying three shapes -
 * `2022-09-16`, `2022-09-16 00:00:00` and the Indian long form
 * `16 September 2022` - and `currentPlacement` normalised it with
 * `String(value).slice(0, 10)`. A substring is not a parse. On an ISO row it
 * happens to give the right answer; on a long-form row it gives
 * `16 Septemb`, which `displayDate` passes through untouched (so view mode
 * still looked fine) and which the date input rejects (so edit mode was
 * blank). Ten characters of a date is not a date.
 *
 * ============================ WHAT THIS DOES INSTEAD ======================
 *
 * It PARSES, and it returns `YYYY-MM-DD` or null - never a truncation, never
 * a guess. The API is ISO since `date_of_joining` became a real SQL `DATE`
 * (backend `20261012120000-employee-joining-date-to-date`, selected through
 * `DATE_FORMAT`), so in a migrated system the first branch answers every
 * time. The other branches are for values that reach a screen by another
 * route - an older cached response, a `Date` a JSON boundary turned into a
 * timestamp - and they exist so the field is never blank where a date is
 * actually known.
 *
 * NO TIMEZONE ARITHMETIC ANYWHERE. A joining date is a calendar day, not an
 * instant. `new Date("2022-09-16")` is midnight UTC and reading it back with
 * local getters in IST gives 2022-09-16 05:30 - harmless - while
 * `new Date("2022-09-16T00:00:00+05:30")` read with UTC getters gives the
 * 15th. Both mistakes are avoided by never constructing a Date from a string
 * that already names the day.
 */

const MONTHS = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

/** `2022-09-16` if year/month/day name a real calendar day, else null. */
function calendarDay(year, month, day) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Built in UTC purely to validate the day-of-month (31 April, 29 February
  // in a common year). The result is formatted from the inputs, never from
  // the Date, so no offset can reach the answer.
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Any joining date the API might send -> `YYYY-MM-DD`, or null.
 *
 * NULL MEANS "NO DATE I CAN READ", and the caller must treat it as that
 * rather than as an empty string to submit. Nothing here ever returns a
 * partial or reformatted version of an unreadable value.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
function toIsoDate(value) {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    // LOCAL getters: a Date that came from a date-only value was built at
    // local midnight, and the UTC ones would report the previous day
    // everywhere east of Greenwich.
    return calendarDay(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }

  const text = String(value).trim();
  if (text === "") return null;

  // 1. ISO, with or without a time after it. What the API sends.
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ]|$)/.exec(text);
  if (iso) return calendarDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // 2. The Indian long form the legacy column carried: "16 September 2022",
  //    and the abbreviated "16 Sep 2022" a display layer may have produced.
  const long = /^(\d{1,2})[ -]([A-Za-z]{3,9})\.?[ -](\d{4})$/.exec(text);
  if (long) {
    const month = MONTHS[long[2].toLowerCase()];
    return month ? calendarDay(Number(long[3]), month, Number(long[1])) : null;
  }

  // 3. DD/MM/YYYY and DD-MM-YYYY - what `displayDate` renders, so a value
  //    that has been round-tripped through a display can still be read.
  //    DAY FIRST, never month first: this application writes and reads Indian
  //    dates, and guessing the other way round would silently move a date.
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (dmy) return calendarDay(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

  return null;
}

/**
 * The value to bind to an `<input type="date">`.
 *
 * Empty string, not null or undefined, because a controlled React input needs
 * a string - and empty is the honest rendering of "no readable date", which
 * is what an input showing `dd-mm-yyyy` means.
 */
const toDateInputValue = (value) => toIsoDate(value) || "";

/**
 * Whether an edited joining date is a real CHANGE that should be submitted.
 *
 * FALSE when the field was not touched, and false when it is empty. Clicking
 * Edit and then Save without going near the date must preserve it exactly,
 * and an untouched date must never be submitted as null, undefined or "" -
 * the joining-date correction endpoint would reject the first two and this
 * would ask it to blank a date nobody meant to blank.
 */
function joiningDateChanged(edited, original) {
  const next = toIsoDate(edited);
  if (next === null) return false;
  return next !== toIsoDate(original);
}

module.exports = { toIsoDate, toDateInputValue, joiningDateChanged };
