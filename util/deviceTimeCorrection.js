/**
 * Attendance -> Device Time Correction - the screen's pure logic.
 *
 * The backend (`/attendance/device-time-corrections`, administrators only)
 * decides everything that matters: which punches match, whether the preview
 * is stale, whether a payroll month is locked. This builds what the screen
 * SENDS and words what it SHOWS, and nothing here is a boundary.
 *
 * The offset is NEVER defaulted or guessed: an empty offset is an error, so
 * the administrator must type the confirmed real-time difference.
 */

const MAX_OFFSET_MINUTES = 720;
const MIN_TEXT = 5;

const EMPTY_FORM = Object.freeze({
  date: "",
  biomax_device_id: "",
  outlet_id: "",
  from_time: "",
  to_time: "",
  offset_minutes: "",
  reason_code: "BIOMAX_DEVICE_TIME_ERROR",
  remarks: "",
});

const TIME_RE = /^\d{1,2}:\d{2}(:\d{2})?$/;

/**
 * The criteria body for Preview and Apply, or `{ error }`. Only the keys the
 * route accepts are sent; an empty outlet is left out, meaning "wherever the
 * device was".
 */
function buildCriteriaBody(form) {
  const f = form || {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(f.date || ""))) return { error: "Choose the date" };
  const device = Number(f.biomax_device_id);
  if (!Number.isInteger(device) || device <= 0) return { error: "Choose the affected device" };
  if (!TIME_RE.test(String(f.from_time || ""))) return { error: "Enter the Affected From time" };
  if (!TIME_RE.test(String(f.to_time || ""))) return { error: "Enter the Affected To time" };
  if (normaliseTime(f.from_time) > normaliseTime(f.to_time)) return { error: "Affected From must not be after Affected To" };

  const rawOffset = String(f.offset_minutes === undefined || f.offset_minutes === null ? "" : f.offset_minutes).trim();
  if (rawOffset === "") return { error: "Enter the correction offset in minutes (the confirmed real-time difference)" };
  if (!/^[+-]?\d+$/.test(rawOffset)) return { error: "The offset must be a whole number of minutes, e.g. 150 or -30" };
  const offset = Number(rawOffset);
  if (offset === 0) return { error: "The offset cannot be zero" };
  if (Math.abs(offset) > MAX_OFFSET_MINUTES) return { error: `The offset may be at most ${MAX_OFFSET_MINUTES} minutes either way` };

  if (!f.reason_code) return { error: "Choose a reason" };
  const remarks = String(f.remarks || "").trim();
  if (remarks.length < MIN_TEXT) return { error: `Remarks of at least ${MIN_TEXT} characters are required` };

  const body = {
    date: f.date,
    biomax_device_id: device,
    from_time: normaliseTime(f.from_time),
    to_time: normaliseTime(f.to_time),
    offset_minutes: offset,
    reason_code: f.reason_code,
    remarks,
  };
  const outlet = Number(f.outlet_id);
  if (f.outlet_id !== "" && f.outlet_id !== null && f.outlet_id !== undefined && Number.isInteger(outlet) && outlet > 0) {
    body.outlet_id = outlet;
  }
  return { body };
}

/** `6:30` -> `06:30:00`. */
function normaliseTime(value) {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value || "").trim());
  if (!m) return String(value || "");
  return `${m[1].padStart(2, "0")}:${m[2]}:${m[3] || "00"}`;
}

/** The Apply body: the SAME criteria plus the batch ID and fingerprint Preview issued. */
function buildApplyBody(criteriaBody, preview) {
  if (!criteriaBody || !preview || !preview.batch_ref || !preview.preview_fingerprint) return null;
  return { ...criteriaBody, batch_ref: preview.batch_ref, preview_fingerprint: preview.preview_fingerprint };
}

/** `+150 min (2h 30m later)` / `-30 min (30m earlier)`. */
function offsetLabel(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const span = [h ? `${h}h` : null, m ? `${m}m` : null].filter(Boolean).join(" ");
  return `${n > 0 ? "+" : "-"}${abs} min (${span} ${n > 0 ? "later" : "earlier"})`;
}

/** `HH:MM:SS` of a `YYYY-MM-DD HH:MM:SS`. */
function clockOf(value) {
  const m = /(\d{2}:\d{2}:\d{2})/.exec(String(value || ""));
  return m ? m[1] : "—";
}

/**
 * The Punch Audit line for a punch whose device clock an administrator
 * corrected, or null. Worded so it cannot be mistaken for an employee
 * regularization.
 */
function correctionAuditLine(punch) {
  if (!punch || !punch.time_corrected) return null;
  const parts = [
    `Device clock corrected: ${punch.original_clock_time || "—"} → ${punch.clock_time || "—"}`,
    offsetLabel(punch.time_correction_offset_minutes),
    punch.time_correction_reason || punch.time_correction_reason_code || null,
    punch.time_corrected_by_name ? `by ${punch.time_corrected_by_name}` : null,
    punch.time_corrected_at ? `on ${punch.time_corrected_at}` : null,
    punch.time_correction_id ? `batch #${punch.time_correction_id}` : null,
  ];
  return parts.filter(Boolean).join(" · ");
}

const STATUS_COLOR = Object.freeze({ APPLIED: "green", REVERTED: "gray" });

/** Revert is offered on an APPLIED batch only; the server re-checks everything. */
function canRevert(batch) {
  return !!batch && batch.status === "APPLIED";
}

/** The error sentence for a refused answer, with the lock named plainly. */
function refusalMessage(body, fallback = "The request could not be completed") {
  if (!body || typeof body !== "object") return fallback;
  if (body.error === "PREVIEW_STALE") return `${body.msg} (the preview is out of date)`;
  if (typeof body.msg === "string" && body.msg) return body.msg.replace(/^ValidationError:\s*/, "");
  return fallback;
}

module.exports = {
  MAX_OFFSET_MINUTES,
  EMPTY_FORM,
  STATUS_COLOR,
  buildCriteriaBody,
  buildApplyBody,
  normaliseTime,
  offsetLabel,
  clockOf,
  correctionAuditLine,
  canRevert,
  refusalMessage,
};
