/**
 * The Effective From that Register suggests for an unregistered Cloud ID.
 *
 * The value travels through the URL as `?first_punch=YYYY-MM-DD HH:MM:SS`
 * and lands in an `<input type="datetime-local">`, which binds to
 * 'YYYY-MM-DDTHH:mm' and NOTHING else - a space, seconds, or a trailing Z
 * leave the field blank and the administrator silently loses the
 * suggestion.
 *
 * IT IS ALREADY IST AND IS NOT CONVERTED. `first_punch` is
 * MIN(biomax_punch.io_time): the terminal's own clock, kept in Indian time
 * and stored without a timezone conversion. It is a wall-clock value, like
 * the Effective From the administrator would type by hand, so it is
 * reshaped and never shifted. (The Devices screen's Last Seen and Last
 * Punch ARE UTC - those are MySQL NOW(3) on a UTC server - and they go
 * through displayIstDateTime instead. Two kinds of timestamp, two helpers.)
 */

const PUNCH_RE = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/;

/** 'YYYY-MM-DD HH:MM:SS' (IST wall clock) -> 'YYYY-MM-DDTHH:mm', or "". */
function registerPrefill(value) {
  if (!value) return "";
  const m = PUNCH_RE.exec(String(value).trim());
  return m ? `${m[1]}T${m[2]}` : "";
}

module.exports = { registerPrefill };
