const { canApproveProposal } = require("./payrollAccess");

/**
 * Which proposals a bulk approval may be made of, and what ticking them means.
 *
 * Pure functions, no React, so the one rule that decides what is selectable can
 * be tested without a renderer — the same reason `util/salaryApprovalQueue.js`
 * is written this way.
 *
 * SELECTABLE IS EXACTLY APPROVABLE. `canApproveProposal` is imported rather
 * than restated: it is already the rule that decides whether the Approve button
 * is offered on a card — the approver's permission, and the server's
 * `own_proposal` flag, which honours the administrator exception. A checkbox
 * that appeared under a looser rule would offer a batch the server would
 * refuse in full, and the row that caused it would be the one nobody could see
 * was ineligible.
 *
 * IT IS NOT A SECURITY BOUNDARY. `usecase/employee_salary.js` re-checks every
 * id on every request, refuses a self-approval whatever this file believed, and
 * approves nothing at all if one record in the selection fails. This only
 * decides what to draw.
 *
 * "CURRENTLY DISPLAYED" IS THE ROWS THE SERVER RETURNED. The queue's filters
 * are applied by `GET /hr/salary/pending`, so the displayed list IS the
 * filtered list and Select All has nothing to narrow: it ticks the eligible
 * rows of what came back, and never a row a filter is hiding.
 */

/** The ids in `items` that this actor may actually approve, in display order. */
function selectableSalaryIds(items, actor) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && canApproveProposal(actor, item))
    .map((item) => item.salary_id);
}

/** Tick or untick one proposal. Ticking twice is still one selection. */
function toggleSelection(selectedIds, salaryId, checked) {
  const current = Array.isArray(selectedIds) ? selectedIds : [];
  if (checked) {
    return current.includes(salaryId) ? current : [...current, salaryId];
  }
  return current.filter((id) => id !== salaryId);
}

/**
 * Drop anything no longer eligible or no longer displayed.
 *
 * A refreshed queue or a changed filter can take away a row somebody had
 * ticked; keeping its id would let "Approve Selected (3)" send an id that is
 * not on the screen any more.
 */
function pruneSelection(selectedIds, eligibleIds) {
  const eligible = Array.isArray(eligibleIds) ? eligibleIds : [];
  const current = Array.isArray(selectedIds) ? selectedIds : [];
  const kept = current.filter((id) => eligible.includes(id));
  /*
   * THE SAME ARRAY BACK WHEN NOTHING WAS DROPPED, AND THAT IS NOT A
   * MICRO-OPTIMISATION.
   *
   * This is called from a `useState` updater in an effect. `filter` always
   * allocates, so returning the fresh array unconditionally made every run a
   * genuine state change by `Object.is`, React re-rendered, the effect ran
   * again — and the Salary Approval screen span at full CPU. Returning the
   * identical reference is what lets React bail out, and it is the pure
   * function's job rather than the caller's because every caller would
   * otherwise have to remember.
   */
  return kept.length === current.length ? current : kept;
}

/** True only when there IS something eligible and all of it is ticked. */
function isAllSelected(eligibleIds, selectedIds) {
  const eligible = Array.isArray(eligibleIds) ? eligibleIds : [];
  const selected = Array.isArray(selectedIds) ? selectedIds : [];
  return eligible.length > 0 && eligible.every((id) => selected.includes(id));
}

/** Select All is a toggle: everything eligible, or nothing. */
function nextSelectAll(eligibleIds, selectedIds) {
  return isAllSelected(eligibleIds, selectedIds) ? [] : [...(eligibleIds || [])];
}

/** The one question asked before a batch is submitted; the count is in it. */
function confirmationMessage(count) {
  return (
    `Approve ${count} salary revision${count === 1 ? "" : "s"}? ` +
    "Each becomes current on its own effective date. This cannot be undone."
  );
}

/** The sentence shown after a successful batch. */
function successMessage(count) {
  return `${count} salary revisions approved successfully.`;
}

module.exports = {
  selectableSalaryIds,
  toggleSelection,
  pruneSelection,
  isAllSelected,
  nextSelectAll,
  confirmationMessage,
  successMessage,
};
