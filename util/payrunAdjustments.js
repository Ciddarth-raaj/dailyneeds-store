/**
 * Payrun Adjustments V1 - the browser's pure parts.
 *
 * SEPARATED SO THEY CAN BE TESTED WITHOUT A BROWSER, an axios instance or a
 * React tree. This repository has no frontend test runner and adding one for
 * this feature would be a larger change than the feature; `node --test` runs a
 * dependency-free CommonJS module directly, exactly as `util/payrunAccess.js`
 * and `util/payrunSelection.js` are run.
 *
 * WHAT IS **NOT** HERE, AND DELIBERATELY: there is no component list, no
 * addition/deduction classification, no net-pay arithmetic and no state
 * derivation. Every one of those is the server's answer, arriving on the row,
 * and a copy of any of them here would be a second declaration of what V1 is -
 * which is the exact failure `util/payrunAccess.js` records about eligibility.
 *
 * WHAT **IS** here is selection and presentation: which rows a tick may apply
 * to, what the buttons say, and what a confirm dialog warns about. Those are
 * browser concerns with no server counterpart.
 */

const STATE = {
  HAS_ADJUSTMENT: "HAS_ADJUSTMENT",
  NO_ADJUSTMENT_CONFIRMED: "NO_ADJUSTMENT_CONFIRMED",
  NO_ADJUSTMENT_PENDING_CONFIRMATION: "NO_ADJUSTMENT_PENDING_CONFIRMATION",
};

/**
 * MAY THIS ROW BE TICKED FOR A BULK "NO ADJUSTMENT" CONFIRMATION?
 *
 * ONLY A PENDING ROW, AND THE SERVER'S OWN VERDICT DECIDES IT. An employee who
 * has an adjustment cannot be confirmed as having none - the server refuses it
 * per row inside the transaction - so offering the tick would be offering a
 * button that always fails. An already-confirmed employee has nothing to
 * confirm.
 *
 * NOTE WHAT THIS DOES NOT DO: it does not look at the AMOUNTS to decide. The
 * state is the server's answer about this employee's month, and re-deriving it
 * from the numbers on screen would be a second copy of the state machine.
 */
function isConfirmable(row) {
  return Boolean(row && row.adjustment_state === STATE.NO_ADJUSTMENT_PENDING_CONFIRMATION);
}

/** The ids a "select all pending" may cover: the rows on screen that qualify. */
function confirmableEmployeeIds(rows) {
  return (rows || []).filter(isConfirmable).map((row) => row.employee_id);
}

function toggleSelection(selected, employeeId, checked) {
  const next = (selected || []).filter((id) => id !== employeeId);
  if (checked) next.push(employeeId);
  return next;
}

/** A selection never outlives the rows it was made on. */
function pruneSelection(selected, selectable) {
  return (selected || []).filter((id) => (selectable || []).includes(id));
}

function isAllSelected(selectable, selected) {
  return (
    (selectable || []).length > 0 &&
    (selectable || []).every((id) => (selected || []).includes(id))
  );
}

function nextSelectAll(selectable, selected) {
  return isAllSelected(selectable, selected) ? [] : [...(selectable || [])];
}

/**
 * THE CONFIRMATION DIALOG'S WORDS.
 *
 * IT SAYS WHAT IS BEING ASSERTED, not merely how many rows. "Confirm 84
 * employees?" invites a click; "you are recording that these 84 people have no
 * adjustment this month, and your name is stored against it" is the sentence
 * somebody should read before signing off eighty-four people's pay.
 */
function confirmNoAdjustmentMessage(count) {
  if (count === 1) {
    return (
      "Confirm that this employee has NO adjustment for this month?\n\n" +
      "This is recorded against your name and can be undone by entering an adjustment for them."
    );
  }
  return (
    `Confirm that these ${count} employees have NO adjustment for this month?\n\n` +
    "This is recorded against your name for each of them, and can be undone by entering an " +
    "adjustment for an employee."
  );
}

/**
 * Whether the Save Adjustments button may be pressed.
 *
 * MIRRORS - NEVER REPLACES - THE SERVER'S GATE. The server refuses the whole
 * file if anything still fails revalidation at confirm time, so this is about
 * showing an honest button rather than about enforcement. `can_confirm` is the
 * server's own answer, and this falls back to recomputing it only when an
 * older response did not carry one.
 */
function canSaveImport(preview) {
  if (!preview) return false;
  if (typeof preview.can_confirm === "boolean") return preview.can_confirm;
  return preview.invalid_rows === 0 && (preview.with_adjustments || 0) > 0;
}

/**
 * WHAT TO TELL SOMEBODY AFTER A SAVE, and it is deliberately not just a count.
 *
 * "200 rows saved" on a month with 23 people still pending is true and
 * useless: the stage is not finished, and the next thing that happens is
 * somebody tries to finalize and cannot understand why. So the pending count
 * travels with the success message.
 */
function saveOutcomeMessage(result) {
  const written = Number(result?.employees_written || 0);
  const pending = Number(result?.pending_confirmation_after_save || 0);
  const employees = `${written} employee${written === 1 ? "" : "s"}`;
  if (pending > 0) {
    return (
      `Adjustments saved for ${employees}. ${pending} employee${pending === 1 ? " is" : "s are"} ` +
      `still awaiting a No Adjustment confirmation — importing blanks does not confirm anybody.`
    );
  }
  return `Adjustments saved for ${employees}. Nothing is awaiting confirmation.`;
}

/** The three preview tabs, with their counts, in the order somebody works. */
function previewTabs(preview) {
  return [
    { key: "WITH_ADJUSTMENTS", label: "With Adjustments", count: Number(preview?.with_adjustments || 0) },
    {
      key: "NO_ADJUSTMENT",
      label: "No Adjustment",
      count: Number(preview?.no_adjustment_pending_confirmation || 0),
    },
    { key: "INVALID", label: "Invalid Rows", count: Number(preview?.invalid_rows || 0) },
  ];
}

/** The rows behind one preview tab. `outcome` is the server's per-row verdict. */
function rowsForTab(preview, tab) {
  const rows = (preview && preview.rows) || [];
  if (tab === "WITH_ADJUSTMENTS") return rows.filter((r) => r.outcome === "WITH_ADJUSTMENT");
  if (tab === "NO_ADJUSTMENT") return rows.filter((r) => r.outcome === "NO_ADJUSTMENT_PENDING");
  return rows.filter((r) => r.outcome === "INVALID");
}

/**
 * THE MONTH'S PROGRESS, FOR THE HEADER.
 *
 * READ STRAIGHT OFF THE SERVER'S SUMMARY AND NEVER RECOUNTED FROM `rows`. The
 * summary counts the whole month while the rows may be a filtered view of it,
 * and a "0 pending" that only means "none matching this filter" is the single
 * most dangerous number this screen could show.
 */
function progressOf(summary) {
  const initialized = Number(summary?.initialized_count || 0);
  const completed = Number(summary?.completed_count || 0);
  const pending = Number(summary?.pending_adjustment_confirmation_count || 0);
  return {
    initialized,
    completed,
    pending,
    percent: initialized === 0 ? 0 : Math.round((completed / initialized) * 100),
    isComplete: initialized > 0 && pending === 0,
  };
}

module.exports = {
  STATE,
  isConfirmable,
  confirmableEmployeeIds,
  toggleSelection,
  pruneSelection,
  isAllSelected,
  nextSelectAll,
  confirmNoAdjustmentMessage,
  canSaveImport,
  saveOutcomeMessage,
  previewTabs,
  rowsForTab,
  progressOf,
};
