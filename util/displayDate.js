/**
 * The application's date DISPLAY convention, in one place.
 *
 * Dates are stored and sent as ISO `YYYY-MM-DD` - that is what MySQL holds,
 * what every API takes and returns, and what an `<input type="date">` binds
 * to. Nobody in Puducherry reads a date that way, so screens show
 * `DD/MM/YYYY`.
 *
 * THIS IS PRESENTATION ONLY. Nothing here parses, re-serialises or rounds a
 * date: it is a string rearrangement, applied at the last moment before the
 * value is rendered. A value that is not an ISO date is returned untouched
 * rather than mangled into a guess - a display helper has no business
 * deciding that "not recorded" means 01/01/1970.
 *
 * NEVER put the result of this into a form value, a request body or a
 * comparison. The edit path keeps the ISO string throughout, which is what
 * lets the joining date still be typed and saved.
 *
 * `util/attendanceRaw.js` re-exports these so the attendance screens and the
 * employee master cannot drift into two conventions.
 */

/** 'YYYY-MM-DD' (or an ISO timestamp) -> 'DD/MM/YYYY'. Anything else, as-is. */
function displayDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || "";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/** 'YYYY-MM-DD HH:MM:SS' -> 'DD/MM/YYYY HH:MM:SS'. */
function displayDateTime(value) {
  if (!value) return "";
  const [d, t] = String(value).split(" ");
  return t ? `${displayDate(d)} ${t}` : displayDate(d);
}

module.exports = { displayDate, displayDateTime };
