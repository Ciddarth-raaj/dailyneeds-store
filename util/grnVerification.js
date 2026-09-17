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
 * `verified_at` as DD/MM/YYYY hh:mm A.
 *
 * The API sends `YYYY-MM-DD HH:mm:ss` in the server's own wall clock, so this
 * reads the parts out of the string rather than handing it to `new Date()`,
 * which would re-interpret it in the browser's timezone and could show an
 * approval an hour before it happened.
 */
function formatGrnVerifiedAt(value) {
  if (value == null || String(value).trim() === "") return "—";
  const m = String(value)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return "—";
  const [, year, month, day, hourRaw, minute] = m;
  const hour24 = Number(hourRaw);
  if (!Number.isFinite(hour24) || hour24 > 23) return "—";
  const meridiem = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${day}/${month}/${year} ${String(hour12).padStart(2, "0")}:${minute} ${meridiem}`;
}

module.exports = {
  VERIFIED,
  PENDING,
  isGrnVerified,
  grnVerificationStatusLabel,
  grnVerifiedByLabel,
  formatGrnVerifiedAt,
};
