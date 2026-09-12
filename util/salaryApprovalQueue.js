const { formatMoney, formatEffectiveFrom, presentCurrentSalary } = require("./salaryView");
const { SOURCE_LABEL, auditTrail } = require("./salaryHistoryView");

/**
 * M4 — how the Salary Approval queue reads a pending proposal.
 *
 * Pure functions, no React, so what an approver is shown before they decide
 * can be tested without a renderer.
 *
 * THE DIFFERENCE IS THE SERVER'S FIGURE. `GET /hr/salary/pending` returns
 * `difference: { amount, percentage }` already worked out, and this module
 * formats it. It deliberately does NOT subtract the two grosses itself: the
 * rule in this system is that pay figures are the server's answer, and a
 * screen doing its own arithmetic on pay is a screen that can quietly disagree
 * with the record it is about to approve.
 *
 * `null` IS A REAL ANSWER AND IS SAID AS ONE. An opening salary has no
 * previous figure to differ from, so there is no difference to show - not a
 * dash implying zero, and certainly not "+100%".
 *
 * THIS SCREEN CANNOT EDIT ANYTHING, and nothing here helps it: there is no
 * form body, no component input, no amend path. If a proposal is wrong the
 * approver rejects it with a reason and the salary-entry user corrects it on
 * Salary Revision & History. An approver who could also edit would be able to
 * rewrite a figure and agree to it in the same visit, which is the four-eyes
 * rule defeated from the other end.
 */

/** A signed amount: "+₹5,000.00", "-₹2,000.00", "No change". */
function formatDifferenceAmount(amount) {
  if (amount === null || amount === undefined) return null;
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return "No change";
  const money = formatMoney(Math.abs(n));
  return money === null ? null : `${n > 0 ? "+" : "−"}${money}`;
}

/** "+25%" / "−10%" / null when the server could not express one. */
function formatDifferencePercentage(percentage) {
  if (percentage === null || percentage === undefined) return null;
  const n = Number(percentage);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return null;
  // Trailing zeroes dropped: 25 reads better than 25.00, and 11.11 keeps both.
  const text = String(Math.round(Math.abs(n) * 100) / 100);
  return `${n > 0 ? "+" : "−"}${text}%`;
}

/** Green for a rise, red for a cut, grey for neither - and nothing for none. */
function differenceTone(amount) {
  if (amount === null || amount === undefined) return "gray.600";
  const n = Number(amount);
  if (!Number.isFinite(n) || n === 0) return "gray.600";
  return n > 0 ? "green.600" : "red.600";
}

/**
 * One queue row.
 *
 * Everything an approver needs to decide WITHOUT opening the detail panel:
 * who, where, from what, to what, by how much, from when, and why.
 */
function presentQueueRow(item) {
  if (!item) return null;

  const current = item.current_salary || null;
  const difference = item.difference || null;

  return {
    salary_id: item.salary_id,
    employee_id: item.employee_id,
    employee_name: item.employee_name || null,
    outlet_name: item.outlet_name || null,
    designation_name: item.designation_name || null,

    // "From what" is null for an opening salary, and the screen says so rather
    // than printing ₹0.00 - nothing approved and a salary of nothing are
    // different facts.
    current_monthly_gross: current ? formatMoney(current.monthly_gross) : null,
    current_effective_from: current ? formatEffectiveFrom(current.effective_from) : null,
    is_opening: !current,

    proposed_monthly_gross: formatMoney(item.monthly_gross),
    effective_from: formatEffectiveFrom(item.effective_from),
    effective_from_raw: item.effective_from || null,

    difference: difference
      ? {
          amount: formatDifferenceAmount(difference.amount),
          percentage: formatDifferencePercentage(difference.percentage),
          tone: differenceTone(difference.amount),
        }
      : null,

    source: item.source || null,
    source_label: SOURCE_LABEL[item.source] || item.source || null,
    revision_reason: item.revision_reason || null,
    manual_override: item.manual_override === true || Number(item.manual_override) === 1,
    override_reason: item.override_reason || null,

    created_by_name: item.created_by_name || null,
    created_by: item.created_by ?? null,
    audit: auditTrail(item),

    /*
     * THE SERVER'S OWN ANSWER about whether this is the approver's own
     * proposal. Not derived here from a user id the browser happens to hold -
     * `usecase/employee_salary.js` compares employee identity against employee
     * identity, honours the administrator exception, and is the thing that
     * actually refuses the approval. This flag only lets the screen say so
     * before somebody clicks.
     */
    own_proposal: item.own_proposal === true,
  };
}

/**
 * The full proposed structure, for the detail panel.
 *
 * The SAME presenter the Employee Master's Payroll card and the Salary History
 * table use, so an unresolved contribution reads as "Pending" with its reason
 * in all three places rather than as a zero in one of them.
 */
function presentQueueDetail(item) {
  if (!item) return null;
  return {
    proposed: presentCurrentSalary(item),
    // The comparison an approver is actually making. Null when there is
    // nothing to compare against.
    current: item.current_salary
      ? {
          monthly_gross: formatMoney(item.current_salary.monthly_gross),
          effective_from: formatEffectiveFrom(item.current_salary.effective_from),
        }
      : null,
  };
}

/** The whole queue, in the order the server sent it - soonest effective first. */
function presentQueue(items) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => presentQueueRow(item));
}

/**
 * The outlets present in a queue, for the outlet filter.
 *
 * Built from the rows themselves rather than from the outlet master: the
 * filter exists to narrow THIS list, and offering thirty outlets with no
 * pending proposal between them is a menu of empty answers.
 */
function outletsInQueue(items) {
  const seen = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (!item || item.store_id === null || item.store_id === undefined) continue;
    if (!seen.has(String(item.store_id))) {
      seen.set(String(item.store_id), {
        store_id: item.store_id,
        outlet_name: item.outlet_name || `Outlet ${item.store_id}`,
      });
    }
  }
  return [...seen.values()].sort((a, b) =>
    String(a.outlet_name).localeCompare(String(b.outlet_name))
  );
}

module.exports = {
  formatDifferenceAmount,
  formatDifferencePercentage,
  differenceTone,
  presentQueueRow,
  presentQueueDetail,
  presentQueue,
  outletsInQueue,
};
