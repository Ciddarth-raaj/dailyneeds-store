/**
 * M4 — who may reach each Payroll screen and each action on it.
 *
 * ONE RULE PER DECISION, IN ONE PLACE, MIRRORING THE BACKEND EXACTLY. Every
 * function here answers the same question the matching `requireAll(...)` on
 * `routes/employee_salary.js` answers, as a conjunction and never as an
 * either-or. A weaker rule here would not open anything - it would produce a
 * screen that renders and then 403s, which is worse than a screen that says
 * plainly it is not for you.
 *
 * NOT A SECURITY BOUNDARY, AND THE APPROVAL SCREEN IS THE REASON THAT SENTENCE
 * MATTERS HERE. `canApprove` decides whether to draw a button;
 * `usecase/employee_salary.js` decides whether an approval happens, re-checks
 * the permission on every request, and refuses a self-approval whatever any
 * screen believed. If the two ever disagree, the server is right.
 *
 * PERMISSIONS ARE PER DESIGNATION. There is no per-user override anywhere in
 * this system and M4 adds none: every function below reads the permission rows
 * the session was issued and the administrator bypass, and nothing else -
 * never a user id, never a list of exempted people.
 *
 * CommonJS, so the rules can be unit-tested with `node --test` without a
 * bundler, exactly as `util/hrProfile.js` is.
 */

/** A permission row list, whether it holds objects or bare keys. */
const has = (permissions, key) =>
  Array.isArray(permissions) &&
  permissions.some((p) => (p && p.permission_key ? p.permission_key : p) === key);

/** `user_type = 2` bypasses the permission table on the server; honoured here. */
const isAdminUser = (isAdmin) => isAdmin === true;

/**
 * See a salary structure and its history.
 *
 * `requireAll(VIEW_EMPLOYEES, VIEW_SALARY)` - the pair the history, current
 * and preview endpoints all demand.
 */
function canViewSalary({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "view_employees") && has(permissions, "view_salary");
}

/**
 * Propose a new opening salary or revision.
 *
 * `requireAll(VIEW_EMPLOYEES, ADD_SALARY)`. Note that `view_salary` is NOT
 * part of this on the server, but the SCREEN needs it anyway - see
 * `canOpenRevisionScreen` - because entering a salary without being able to
 * see the preview, the current figure or the history would be typing a number
 * into the dark.
 */
function canAddSalary({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "view_employees") && has(permissions, "add_salary");
}

/** Amend a PENDING proposal. `requireAll(VIEW_EMPLOYEES, EDIT_SALARY)`. */
function canEditPendingSalary({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "view_employees") && has(permissions, "edit_salary");
}

/**
 * Depart from the automatic component breakup.
 *
 * A THIRD KEY ON TOP OF WHATEVER THE ACTION ALREADY NEEDED, matching
 * `overrideGuard` on the router: any request carrying `manual_components` also
 * demands `manual_salary_component_override`. Entering a salary is an everyday
 * HR act; moving Basic changes the PF wage and therefore what is filed, so it
 * is a second decision granted to far fewer people.
 */
function canOverrideComponents({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "manual_salary_component_override");
}

/** Approve or reject. `requireAll(VIEW_EMPLOYEES, APPROVE_SALARY_REVISION)`. */
function canApproveSalaryRevision({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "view_employees") && has(permissions, "approve_salary_revision");
}

/**
 * Open Salary Revision & History at all.
 *
 * READING IS THE FLOOR. The screen's first act is to read an employee's
 * current salary and their history, so `view_salary` is what opens it; whether
 * the form appears is `canAddSalary` and whether a pending proposal can be
 * amended is `canEditPendingSalary`. Somebody with only `view_salary` gets the
 * screen read-only, which is a useful thing to have rather than a refusal.
 */
function canOpenRevisionScreen(actor) {
  return canViewSalary(actor);
}

/**
 * Open Salary Approval.
 *
 * THREE KEYS, ALL OF THEM, matching `GET /hr/salary/pending` exactly:
 * `view_employees`, `view_salary` and `approve_salary_revision`. The queue
 * lists every outstanding pay proposal in the company, which is a different
 * disclosure from one employee's structure that somebody opened deliberately -
 * so it takes the approver's key as well as the reader's.
 */
function canOpenApprovalScreen(actor) {
  return canViewSalary(actor) && canApproveSalaryRevision(actor);
}

/**
 * May this actor approve THIS proposal?
 *
 * Two things, and the second is the server's answer rather than this screen's
 * guess: the permission, and `own_proposal`, which
 * `usecase/employee_salary.js#getPendingQueue` sets by comparing employee
 * identity against employee identity and already honours the administrator
 * exception.
 *
 * WHY THE FLAG IS TRUSTED AND NOT RECOMPUTED. The browser holds a session, not
 * a reliable answer to "is this employee id me" in every account shape, and a
 * rule computed twice is a rule that can disagree with itself. The server
 * refuses the approval regardless; this only decides whether to offer it.
 */
function canApproveProposal(actor, proposal) {
  if (!canApproveSalaryRevision(actor)) return false;
  return !(proposal && proposal.own_proposal === true);
}

/**
 * May this actor REJECT this proposal?
 *
 * YES, EVEN THEIR OWN. Only self-APPROVAL is blocked: refusing your own
 * proposal withdraws it, which is a normal thing to need to do and which the
 * server allows. Hiding the reject button on your own row would leave a
 * mistaken proposal stuck in everybody's queue with nobody able to clear it.
 */
function canRejectProposal(actor) {
  return canApproveSalaryRevision(actor);
}

/**
 * M5 — open Bulk Salary Upload.
 *
 * THREE KEYS, ALL OF THEM, matching what the two `/hr/salary/bulk` endpoints
 * demand exactly: `view_employees`, `view_salary` and `add_salary`. Reading is
 * not enough - the screen's whole purpose is to create proposals, and a
 * read-only version of it would be a file picker that leads nowhere.
 *
 * `add_salary` AND NOT A BULK KEY OF ITS OWN. Uploading a hundred proposals
 * and typing a hundred proposals are the same authority exercised at different
 * speeds; a `bulk_salary_upload` permission would be a second place to grant
 * the same thing, and the one people forget.
 *
 * `approve_salary_revision` is NOT part of this and would not help: every row
 * a bulk upload creates lands PENDING and is decided on Salary Approval.
 */
function canOpenBulkSalaryUpload(actor) {
  return canViewSalary(actor) && canAddSalary(actor);
}

/** Is any Payroll screen reachable at all? Decides the menu section. */
function canSeePayrollMenu(actor) {
  return (
    canOpenRevisionScreen(actor) ||
    canOpenApprovalScreen(actor) ||
    canOpenBulkSalaryUpload(actor)
  );
}

module.exports = {
  canViewSalary,
  canAddSalary,
  canEditPendingSalary,
  canOverrideComponents,
  canApproveSalaryRevision,
  canOpenRevisionScreen,
  canOpenApprovalScreen,
  canOpenBulkSalaryUpload,
  canApproveProposal,
  canRejectProposal,
  canSeePayrollMenu,
};
