/**
 * Branch Master's RetailPilot ID: RetailPilot's store slug (e.g. 9rJMC).
 *
 * CommonJS so `node --test` can load it with no bundler, the way
 * util/workShiftForm.js is. The backend applies the same rule
 * (routes/outlet.js) and refuses an ID another branch already has.
 */
const RETAILPILOT_ID_MAX_LENGTH = 50;
const RETAILPILOT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Trimmed, or null when blank - slugs are case-sensitive, so no case change. */
function normalizeRetailPilotId(value) {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

/** "" when fine, else the message to show under the field. */
function retailPilotIdError(value) {
  const id = normalizeRetailPilotId(value);
  if (id === null) return "";
  if (id.length > RETAILPILOT_ID_MAX_LENGTH) return `At most ${RETAILPILOT_ID_MAX_LENGTH} characters`;
  if (!RETAILPILOT_ID_PATTERN.test(id)) return "Letters, digits, - and _ only, no spaces";
  return "";
}

module.exports = {
  RETAILPILOT_ID_MAX_LENGTH,
  RETAILPILOT_ID_PATTERN,
  normalizeRetailPilotId,
  retailPilotIdError,
};
