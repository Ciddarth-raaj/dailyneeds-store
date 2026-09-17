const { canViewSalary } = require("./payrollAccess");

/**
 * Payrun Initialization - who may reach the screen and each action on it.
 *
 * ONE RULE PER DECISION, MIRRORING THE BACKEND EXACTLY. Every function here
 * answers the same question the matching `requireAll(...)` on
 * `routes/payrun.js` answers, as a conjunction and never as an either-or. A
 * weaker rule here would not open anything - it would produce a screen that
 * renders and then 403s, which is worse than one that says plainly it is not
 * for you.
 *
 * NOT A SECURITY BOUNDARY. What comes out of here decides what to draw. The
 * server re-checks the caller's real permissions on every request, re-decides
 * every employee's eligibility from its own reads, and refuses whatever any
 * screen believed.
 *
 * `canViewSalary` IS IMPORTED RATHER THAN RESTATED, because the Payrun screen
 * shows an approved monthly gross per employee and that is the same disclosure
 * `util/payrollAccess.js` already governs. Two copies of that rule is one copy
 * that gets relaxed.
 *
 * CommonJS, so the rules can be unit-tested with `node --test` without a
 * bundler, exactly as `util/payrollAccess.js` is.
 */

const has = (permissions, key) =>
  Array.isArray(permissions) &&
  permissions.some((p) => (p && p.permission_key ? p.permission_key : p) === key);

/** `user_type = 2` bypasses the permission table on the server; honoured here. */
const isAdminUser = (isAdmin) => isAdmin === true;

/**
 * OPEN THE PAYRUN SCREEN AND READ A MONTH.
 *
 * THREE KEYS, ALL OF THEM, matching `GET /payrun/month` exactly:
 * `view_employees`, `view_payroll` and `view_salary`. The third is not
 * decoration - the table has an Approved Monthly Gross column, which is salary
 * disclosure across the whole company, and it must not become reachable
 * through a payroll key somebody was granted to look at headcounts.
 */
function canOpenPayrun({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "view_payroll") && canViewSalary({ permissions, isAdmin });
}

/**
 * INITIALIZE A MONTH - individually or in bulk, and they are ONE decision.
 *
 * `requireAll(VIEW_EMPLOYEES, PROCESS_PAYROLL)`. Initializing one employee and
 * initializing forty are the same authority exercised at different speeds; a
 * separate bulk permission would be a second place to grant the same thing,
 * and the one people forget.
 */
function canInitializePayrun({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "view_employees") && has(permissions, "process_payroll");
}

/**
 * CHANGE ONE MONTH'S PAY TYPE.
 *
 * `requireAll(VIEW_EMPLOYEES, CHANGE_PAYRUN_PAY_TYPE)`, and it is deliberately
 * NOT implied by the initialize permission: freezing what somebody is owed and
 * deciding how the money reaches them are different decisions, and somebody may
 * hold either without the other.
 */
function canChangePayrunPayType({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "view_employees") && has(permissions, "change_payrun_pay_type");
}

/**
 * MAY THIS ROW BE INITIALIZED AT ALL?
 *
 * THE SERVER'S ANSWER, NOT A SECOND OPINION. `status` is what
 * `utils/payrun_eligibility.js` decided from the employee's real salary,
 * attendance and statutory setup; recomputing any of that here would be a
 * second set of payroll rules in a browser, and the two would disagree.
 *
 * A BLOCKED ROW CAN NEVER BE TICKED, which is the rule the whole selection is
 * built on - see `util/payrunSelection.js`.
 */
function isRowInitializable(row) {
  return Boolean(row && row.status === "READY" && row.initialized !== true);
}

/** Is the Payrun reachable at all? Decides whether the menu entry is drawn. */
function canSeePayrunMenu(actor) {
  return canOpenPayrun(actor);
}

module.exports = {
  canOpenPayrun,
  canInitializePayrun,
  canChangePayrunPayType,
  isRowInitializable,
  canSeePayrunMenu,
};
