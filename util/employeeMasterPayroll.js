/**
 * The Employee Master's Payroll section: which of four states an employee is
 * in, and what may be done about it there.
 *
 * Pure functions, no React, so the rules can be tested without a renderer -
 * the same reason `util/payrollAccess.js` and `util/salaryRevisionForm.js` are
 * CommonJS.
 *
 * THE PRODUCT RULE THIS EXISTS TO HOLD, in one sentence: the Employee Master
 * is where an employee's FIRST salary is entered during onboarding, and it
 * never becomes a second salary-revision screen. Onboarding is the one moment
 * when the person filling in somebody's record is the person who knows what
 * they are being paid, and sending them to a different screen to type one
 * number is how employees end up live with no salary at all. Every LATER change
 * is a revision, and revisions belong to Payroll > Salary Revision & History,
 * where the history, the approval trail and the amendment path already live.
 *
 * SO THE ENTRY FORM APPEARS EXACTLY ONCE PER EMPLOYEE, AND ONLY WHILE THEY
 * HAVE NO SALARY AT ALL. The moment a proposal exists - pending or approved -
 * this section is a display and a signpost, never a form.
 *
 * THE STATE IS READ FROM THE SERVER'S OWN DATA, NEVER FROM THE BROWSER'S CLOCK.
 * `current` is the resolver's answer and `history` is every row; no date here
 * is compared to `new Date()`. That matters most for the fourth state: an
 * approved revision dated ahead of today makes the resolver answer `null`, and
 * a screen that took `null` to mean "no salary" would offer somebody a second
 * opening salary and watch the server refuse it.
 *
 * REJECTED ROWS DO NOT COUNT, exactly as `repository/employee_salary.js`
 * #hasLiveSalary does not count them. If every proposal so far was refused, the
 * employee still has no salary and their next one is still their first - so
 * the opening-salary entry comes back, which is the correct answer and is the
 * backend's rule rather than a second one invented here.
 */

/** The four states, in the order they are decided. Screens key off these. */
const STATE = {
  /** No live row at all (or rejected ones only). Onboarding: entry allowed. */
  NO_SALARY: "NO_SALARY",
  /** A proposal exists and nobody has decided it. Display and wait. */
  PENDING: "PENDING",
  /** An approved revision applies today. The M3 read-only display. */
  CURRENT_APPROVED: "CURRENT_APPROVED",
  /** Approved, but not yet in force. NOT the same as having no salary. */
  FUTURE_APPROVED: "FUTURE_APPROVED",
};

/** Where a later revision is made. The Employee Master only ever links here. */
const REVISION_SCREEN_PATH = "/payroll/salary-revision";

const STATUS = { PENDING: "PENDING", APPROVED: "APPROVED", REJECTED: "REJECTED" };

/** The rows, whatever the caller was handed. A failed read is not a history. */
function rowsOf(history) {
  return Array.isArray(history) ? history.filter(Boolean) : [];
}

/**
 * Does this employee have a salary at all?
 *
 * The backend's `hasLiveSalary` rule, restated against the rows it returns:
 * anything that is not REJECTED counts, including a PENDING first proposal.
 */
function hasLiveSalary(history) {
  return rowsOf(history).some((r) => r.status !== STATUS.REJECTED);
}

/** The one outstanding proposal, if there is one. The database permits only one. */
function pendingProposal(history) {
  return rowsOf(history).find((r) => r.status === STATUS.PENDING) || null;
}

/**
 * The earliest APPROVED row that is not yet in force.
 *
 * Worked out by ELIMINATION rather than by comparing dates to today: a row is
 * "not yet in force" precisely when it is approved and the resolver did not
 * pick it. The resolver is the server's, so this cannot disagree with it -
 * whereas a browser comparing `effective_from` to its own clock can, and does,
 * across a timezone.
 */
function futureApproved(history, current) {
  const currentId = current && current.salary_id !== undefined ? current.salary_id : null;
  const approved = rowsOf(history)
    .filter((r) => r.status === STATUS.APPROVED)
    .filter((r) => currentId === null || Number(r.salary_id) !== Number(currentId))
    .sort((a, b) => String(a.effective_from).localeCompare(String(b.effective_from)));
  return approved[0] || null;
}

/**
 * Which state this employee is in, and the rows that say so.
 *
 * THE ORDER IS THE POINT.
 *
 *   no live row          -> NO_SALARY, whatever the resolver said
 *   a pending proposal   -> PENDING, even when an approved salary also applies
 *                          today: the next thing that happens to this person's
 *                          pay is that somebody decides that proposal, and no
 *                          second one may be raised until they do
 *   a current approved   -> CURRENT_APPROVED
 *   otherwise            -> FUTURE_APPROVED
 *
 * `current` is returned untouched beside the state, because the read-only
 * display shows it whenever it exists - including under a pending banner. The
 * state decides what may be DONE; `current` decides what is SHOWN.
 */
function resolvePayrollState(history, current) {
  const pending = pendingProposal(history);
  const live = hasLiveSalary(history);

  let state;
  if (!live) state = STATE.NO_SALARY;
  else if (pending) state = STATE.PENDING;
  else if (current) state = STATE.CURRENT_APPROVED;
  else state = STATE.FUTURE_APPROVED;

  return {
    state,
    pending,
    current: current || null,
    future: state === STATE.FUTURE_APPROVED ? futureApproved(history, current) : null,
    hasLiveSalary: live,
  };
}

/**
 * May the opening-salary entry be shown?
 *
 * THREE CONDITIONS, ALL OF THEM. The employee must have no salary at all;
 * the actor must be able to SEE salary (`view_employees` + `view_salary`),
 * because entering one without the preview, the breakup or the statutory
 * answer would be typing a number into the dark; and the actor must be able to
 * CREATE one (`add_salary`), which is what the server demands of the request.
 *
 * `approve_salary_revision` IS DELIBERATELY NOT PART OF THIS. Proposing a
 * salary and agreeing to it are two decisions, and requiring the approver's key
 * to enter an opening salary would either put onboarding in the hands of
 * approvers or hand approval to everybody who onboards.
 */
function canEnterOpeningSalary(state, access = {}) {
  return state === STATE.NO_SALARY && access.canView === true && access.canAdd === true;
}

/**
 * May the manual component breakup be offered?
 *
 * Its own key on top of whichever the action already needed, matching
 * `overrideGuard` on the router: moving Basic moves the PF wage, and therefore
 * what gets filed, so it is a second decision granted to far fewer people.
 */
function canOverrideOpeningComponents(access = {}) {
  return access.canOverride === true;
}

/**
 * Should this section point at Payroll > Salary Revision & History?
 *
 * A LINK, NEVER A FORM. This is the whole of the Employee Master's involvement
 * with a salary that already exists, in all three of the states where one does:
 *
 *   PENDING           with `edit_salary`, to amend the outstanding proposal.
 *                     Without it there is nothing to do but wait, so no link
 *                     is offered - a signpost to a screen that will not let
 *                     you act is worse than none.
 *   CURRENT_APPROVED  to propose the next revision.
 *   FUTURE_APPROVED   likewise, and the state is named so nobody reads the
 *                     resolver's `null` as "no salary".
 *
 * It is gated on being able to open that screen at all (`view_salary`), so the
 * link never leads to a 403.
 */
function showRevisionLink(state, access = {}) {
  if (access.canView !== true) return false;
  if (state === STATE.PENDING) return access.canEdit === true;
  return state === STATE.CURRENT_APPROVED || state === STATE.FUTURE_APPROVED;
}

module.exports = {
  STATE,
  STATUS,
  REVISION_SCREEN_PATH,
  hasLiveSalary,
  pendingProposal,
  futureApproved,
  resolvePayrollState,
  canEnterOpeningSalary,
  canOverrideOpeningComponents,
  showRevisionLink,
};
