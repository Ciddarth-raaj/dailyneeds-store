const { isRowInitializable } = require("./payrunAccess");

/**
 * Payrun Initialization - what a selection may be made of, and what the
 * summary says.
 *
 * Pure functions, no React, so the rule that decides what is tickable can be
 * tested without a renderer - the same reason `util/salaryApprovalSelection.js`
 * is written this way.
 *
 * SELECTABLE IS EXACTLY INITIALIZABLE, and `isRowInitializable` is imported
 * rather than restated: it is already the rule that decides whether the
 * Initialize button is offered on a row. A checkbox drawn under a looser rule
 * would offer a batch whose refusals the person could not see coming.
 *
 * A BLOCKED ROW IS NEVER TICKABLE. Not by clicking it, and not by Select All
 * Ready - which means exactly what it says: the READY rows of what the server
 * returned, never every row and never a row a filter is hiding.
 *
 * IT IS NOT A SECURITY BOUNDARY. `usecase/payrun.js` re-decides every
 * employee's eligibility on every request, from its own reads, and initializes
 * nothing that is not READY whatever this file believed.
 */

/** The employee ids in `rows` that may actually be initialized, in display order. */
function selectableEmployeeIds(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => isRowInitializable(row))
    .map((row) => row.employee_id);
}

/** Tick or untick one row. Ticking twice is still one selection. */
function toggleSelection(selectedIds, employeeId, checked) {
  const current = Array.isArray(selectedIds) ? selectedIds : [];
  if (checked) {
    return current.includes(employeeId) ? current : [...current, employeeId];
  }
  return current.filter((id) => id !== employeeId);
}

/**
 * Drop anything no longer selectable or no longer displayed.
 *
 * A refreshed month or a changed filter can take away a row somebody had
 * ticked - most obviously the row they just initialized - and keeping its id
 * would let "Initialize Selected (3)" send an employee who is not on the
 * screen any more.
 *
 * THE SAME ARRAY BACK WHEN NOTHING WAS DROPPED, because this is called from a
 * `useState` updater inside an effect and `filter` always returns a new array:
 * a fresh reference every time is a render loop, exactly as
 * `util/salaryApprovalSelection.js` records.
 */
function pruneSelection(selectedIds, selectableIds) {
  const selectable = Array.isArray(selectableIds) ? selectableIds : [];
  const current = Array.isArray(selectedIds) ? selectedIds : [];
  const kept = current.filter((id) => selectable.includes(id));
  return kept.length === current.length ? current : kept;
}

/** Select All Ready, or clear it if everything selectable is already ticked. */
function nextSelectAll(selectableIds, selectedIds) {
  const selectable = Array.isArray(selectableIds) ? selectableIds : [];
  return isAllSelected(selectable, selectedIds) ? [] : selectable.slice();
}

function isAllSelected(selectableIds, selectedIds) {
  const selectable = Array.isArray(selectableIds) ? selectableIds : [];
  const selected = Array.isArray(selectedIds) ? selectedIds : [];
  return selectable.length > 0 && selectable.every((id) => selected.includes(id));
}

/**
 * THE SENTENCE SOMEBODY AGREES TO. The count is in the question so nobody
 * initializes more than they meant to, and it says what initializing MEANS -
 * because the consequence (the month stops following its sources) is not
 * obvious from the word.
 */
function confirmationMessage(count) {
  return (
    `Initialize ${count} employee${count === 1 ? "" : "s"} for this payroll month?\n\n` +
    "This takes each employee's payroll snapshot from their current approved salary " +
    "and calculated attendance. After this, later changes to those will not alter the " +
    "month until it is explicitly recalculated."
  );
}

/**
 * WHAT HAPPENED, IN ONE LINE, AND IT NEVER HIDES A REFUSAL.
 *
 * A bulk run is a per-row outcome, so "12 initialized" alone would quietly
 * lose the three that were blocked. Every non-zero count is named.
 */
function outcomeMessage(result) {
  if (!result) return "";
  const parts = [];
  if (result.initialized_count) parts.push(`${result.initialized_count} initialized`);
  if (result.already_initialized_count) {
    parts.push(`${result.already_initialized_count} already initialized`);
  }
  if (result.blocked_count) parts.push(`${result.blocked_count} blocked`);
  if (result.not_in_scope_count) parts.push(`${result.not_in_scope_count} not available to you`);
  return parts.length === 0 ? "Nothing was initialized." : `${parts.join(", ")}.`;
}

/** The blocking reasons on a row, as one readable line. */
function reasonText(row) {
  const reasons = (row && row.blocking_reasons) || [];
  return reasons.map((r) => r.message || r.code).join("; ");
}

module.exports = {
  selectableEmployeeIds,
  toggleSelection,
  pruneSelection,
  nextSelectAll,
  isAllSelected,
  confirmationMessage,
  outcomeMessage,
  reasonText,
};
