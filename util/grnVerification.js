/**
 * Reading a GRN's verification block.
 *
 * CommonJS, like `util/handle403.js`, so `node --test` can require it
 * directly; the webpack bundler imports it the same way either way.
 *
 * The backend sends this block on every GRN in the list and on the detail
 * payload, ALWAYS PRESENT - a GRN nobody has verified yet reads as PENDING
 * rather than as a missing field. These helpers only format what arrived;
 * they never decide whether something is verified from anything other than
 * the status the server sent.
 */
const VERIFIED = "VERIFIED";
const PENDING = "PENDING";

const STATUS_LABELS = {
  [VERIFIED]: "Verified",
  [PENDING]: "Pending Verification",
};

/** Is this GRN signed off? Only the server's own status answers that. */
function isGrnVerified(verification) {
  return verification?.status === VERIFIED;
}

/** "Verified" / "Pending Verification" — a GRN with no block yet is pending. */
function grnVerificationStatusLabel(verification) {
  return STATUS_LABELS[verification?.status] ?? STATUS_LABELS[PENDING];
}

/** The verifier's display name as the API resolved it, or an em dash. */
function grnVerifiedByLabel(verification) {
  if (!isGrnVerified(verification)) return "—";
  const name = verification?.verified_by_name;
  if (name != null && String(name).trim() !== "") return String(name).trim();
  // A name the employee table could not resolve still leaves the id, which
  // is more use to an auditor than a blank cell.
  const id = verification?.verified_by;
  return id != null && id !== "" ? `#${id}` : "—";
}

/**
 * The zone GRN verification times are shown in.
 *
 * India Standard Time is a FIXED +05:30 with no daylight saving, which is why
 * this is arithmetic on the instant rather than Intl with a `timeZone`: the
 * answer is the same either way, and this one cannot be thrown off by a
 * browser built without full ICU data. Named as a constant so the choice is
 * visible rather than a 19800 hiding in a formatter.
 */
const IST_LABEL = "Asia/Kolkata";
const IST_OFFSET_MINUTES = 5 * 60 + 30;

/**
 * `verified_at` as DD/MM/YYYY hh:mm A in Asia/Kolkata.
 *
 * THE INPUT MUST NAME AN INSTANT. The API sends ISO-8601 UTC ("2026-09-17T
 * 09:00:00Z") because the database column is read back with UNIX_TIMESTAMP;
 * an epoch number is accepted too. A timestamp with NO zone on it is refused
 * rather than guessed at - guessing is exactly the bug this replaced, where a
 * wall-clock string was read in whatever zone the reader happened to be in
 * and an approval could be shown an hour or a day away from when it happened.
 *
 * The conversion is done on the UTC parts of the shifted instant, so the
 * output does not depend on the browser's own time zone either: a viewer in
 * London and a viewer in Chennai see the same IST time.
 */
function formatGrnVerifiedAt(value) {
  const instant = toInstant(value);
  if (instant == null) return "—";

  const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const year = shifted.getUTCFullYear();
  const hour24 = shifted.getUTCHours();
  const minute = String(shifted.getUTCMinutes()).padStart(2, "0");
  const meridiem = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${day}/${month}/${year} ${String(hour12).padStart(2, "0")}:${minute} ${meridiem}`;
}

/**
 * The instant a value names, or null when it names none.
 *
 * Accepts an ISO-8601 string carrying an explicit zone (Z or ±HH:MM) and a
 * numeric epoch in seconds or milliseconds. Anything else - "2026-09-17
 * 14:30:00", free text, an empty cell - is null, because there is no honest
 * way to place it on a clock.
 */
function toInstant(value) {
  if (value == null || value === "") return null;

  if (typeof value === "number" && Number.isFinite(value)) {
    // Seconds unless the magnitude says milliseconds.
    const ms = Math.abs(value) < 1e11 ? value * 1000 : value;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const s = String(value).trim();
  if (s === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    return null;
  }
  const d = new Date(s.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = {
  VERIFIED,
  PENDING,
  IST_LABEL,
  IST_OFFSET_MINUTES,
  isGrnVerified,
  grnVerificationStatusLabel,
  grnVerifiedByLabel,
  formatGrnVerifiedAt,
};
