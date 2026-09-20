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

/**
 * MACHINE TIMESTAMPS ARE A DIFFERENT KIND OF VALUE, AND NEED A DIFFERENT
 * HELPER.
 *
 * `displayDateTime` above rearranges a string and nothing else. That is
 * exactly right for the values an administrator TYPED - Effective From,
 * Effective To, an assignment period, anything bound to a
 * `datetime-local` input: those are business-local wall-clock times and
 * shifting them by five and a half hours would move a device's location
 * history to a time nobody chose.
 *
 * It is wrong for the timestamps a MACHINE wrote. The API servers run in
 * UTC, so MySQL `NOW(3)` - which is what stamps biomax_device.last_seen_at,
 * last_punch_at, first_seen_at, biomax_device_event.created_at and the
 * receiver's last_punch_received - lands in the database as UTC. Rearranged
 * without conversion, a poll at 11:12 in the morning in Puducherry reads
 * 05:42, and the page tells somebody a working terminal has been silent
 * since dawn.
 *
 * So: this helper converts, `displayDateTime` does not, and which one a
 * screen calls is decided by who wrote the value, not by how it looks.
 *
 * NOT EVERY BIOMAX TIMESTAMP IS UTC. `biomax_punch.io_time` is the
 * DEVICE's own clock, which the terminals keep in IST, and it is stored
 * that way (docs/biomax-attendance-part1.md R3: it never passes through a
 * JS Date). The unregistered-device first/last punch and the Register
 * prefill read io_time, so they are already IST and must NOT be passed
 * through here - converting them would push them forward another 5:30.
 */

/** Asia/Kolkata has never observed DST; the offset is a constant, not a lookup. */
const IST_OFFSET_MINUTES = 330;
const IST_TIME_ZONE = "Asia/Kolkata";

const UTC_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/;

/** A UTC 'YYYY-MM-DD HH:MM[:SS]' string -> the IST calendar fields of that instant. */
function istParts(value) {
  if (!value) return null;
  const m = UTC_DATETIME_RE.exec(String(value).trim());
  if (!m) return null;
  const utcMs = Date.UTC(
    Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    Number(m[4]), Number(m[5]), Number(m[6] || 0)
  );
  if (Number.isNaN(utcMs)) return null;
  // The offset is applied to the epoch and the fields read back in UTC, so
  // no local Date is ever constructed and the browser's own zone - which
  // may be anything - cannot influence the result.
  const ist = new Date(utcMs + IST_OFFSET_MINUTES * 60000);
  const p = (n) => String(n).padStart(2, "0");
  return {
    year: String(ist.getUTCFullYear()),
    month: p(ist.getUTCMonth() + 1),
    day: p(ist.getUTCDate()),
    hour: p(ist.getUTCHours()),
    minute: p(ist.getUTCMinutes()),
    second: p(ist.getUTCSeconds()),
  };
}

/**
 * A UTC machine timestamp -> 'DD/MM/YYYY HH:mm:ss' in Asia/Kolkata.
 *
 * Null, empty or anything that is not a timestamp comes back as "" rather
 * than as a guess: "not recorded" is not 01/01/1970.
 */
function displayIstDateTime(value) {
  const t = istParts(value);
  if (!t) return "";
  return `${t.day}/${t.month}/${t.year} ${t.hour}:${t.minute}:${t.second}`;
}

/** The same instant as an `<input type="datetime-local">` value, 'YYYY-MM-DDTHH:mm'. */
function istDateTimeLocalValue(value) {
  const t = istParts(value);
  if (!t) return "";
  return `${t.year}-${t.month}-${t.day}T${t.hour}:${t.minute}`;
}

module.exports = { displayDate, displayDateTime, displayIstDateTime, istDateTimeLocalValue, IST_OFFSET_MINUTES, IST_TIME_ZONE };

