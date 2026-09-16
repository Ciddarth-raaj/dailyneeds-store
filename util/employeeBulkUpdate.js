/**
 * EMPLOYEE MASTER BULK EXPORT / IMPORT — the pure parts.
 *
 * Separated from `helper/employeeBulkUpdate.js` so they can be tested without
 * a browser, an axios instance or a React tree. This repository has no
 * frontend test runner, and adding one for this feature would be a larger
 * change than the feature; `node --test` runs a dependency-free ES module
 * directly, so the two decisions that are genuinely worth pinning are pinned.
 *
 * Both of them are about NOT defeating a server-side check from the client:
 * the staleness echo must be sent faithfully, and a failed binary download
 * must not be saved as a spreadsheet.
 */

/**
 * The `expected_before` envelope a confirm carries: for each previewed row,
 * the values the server said were current when the user was shown the change.
 *
 * SENT VERBATIM FROM THE PREVIEW RESPONSE. The server compares it against the
 * database as it is at confirm time and refuses a row that has moved in
 * between. Recomputing, filtering or "correcting" any of this in the browser
 * would be the client quietly opting out of that check on the user's behalf -
 * which is exactly the case the check exists for.
 *
 * A row with no proposed change carries an empty object rather than being
 * dropped: the server keys the echo by row number, and a missing row is
 * treated as an unverifiable one.
 */
export function buildExpectedBefore(preview) {
  return (preview?.rows || []).map((row) => ({
    row_number: row.row_number,
    expected_before: row.expected_before || {},
  }));
}

/**
 * The error message hiding inside a failed binary download, or null when the
 * body really is a spreadsheet.
 *
 * The export streams .xlsx, but a refusal - a permission, a branch outside
 * the caller's scope - comes back as JSON with the same request. Saving that
 * as an .xlsx would hand somebody a file that will not open, or worse, one
 * that opens empty and reads as "there are no employees".
 */
export function exportErrorMessage(blobType, text) {
  if (!blobType || !String(blobType).includes("json")) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed.msg || "The export could not be produced";
  } catch (err) {
    return "The export could not be produced";
  }
}

/**
 * Whether the Confirm button may be pressed.
 *
 * Mirrors - never replaces - the server's own gate. The server refuses the
 * whole operation if anything still fails revalidation, so this is about
 * showing an honest button, not about enforcement.
 */
export function canConfirm(preview) {
  if (!preview) return false;
  return preview.error_rows === 0 && (preview.rows_with_changes || 0) > 0;
}
