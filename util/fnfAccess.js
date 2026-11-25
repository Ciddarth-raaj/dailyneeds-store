/**
 * F&F SETTLEMENT, EXIT INTERVIEW AND REHIRE - who may reach each screen and
 * action, and the small presentation rules those screens share.
 *
 * ONE RULE PER DECISION, MIRRORING `routes/employee_exit.js` EXACTLY, as
 * `util/payrunAccess.js` mirrors `routes/payrun.js`. NOT A SECURITY BOUNDARY:
 * the server re-checks every request.
 *
 * CommonJS, so it can be unit-tested with `node --test`.
 */

const has = (permissions, key) =>
  Array.isArray(permissions) && permissions.some((p) => (p && p.permission_key ? p.permission_key : p) === key);
const all = (permissions, keys) => keys.every((k) => has(permissions, k));

/** The F&F list carries net pay: view_employees + view_salary + view_fnf_settlement. */
function canViewFnf({ permissions = [], isAdmin = false } = {}) {
  return isAdmin === true || all(permissions, ["view_employees", "view_salary", "view_fnf_settlement"]);
}

/**
 * ACCOUNTS: confirm that the F&F was actually paid, or reopen that
 * confirmation - view_employees + confirm_fnf_payment. Publishing the
 * statement is not payment; running payroll does not grant this.
 */
function canConfirmFnfPayment({ permissions = [], isAdmin = false } = {}) {
  return isAdmin === true || all(permissions, ["view_employees", "confirm_fnf_payment"]);
}

/** CONFIDENTIAL: the interview and the rehire assessment. */
function canViewExitInterview({ permissions = [], isAdmin = false } = {}) {
  return isAdmin === true || all(permissions, ["view_employees", "view_exit_interview"]);
}

function canManageExitInterview({ permissions = [], isAdmin = false } = {}) {
  return isAdmin === true || all(permissions, ["view_employees", "manage_exit_interview"]);
}

function canOverrideRehire({ permissions = [], isAdmin = false } = {}) {
  return isAdmin === true || all(permissions, ["view_employees", "override_rehire_eligibility"]);
}

/** The stage badge's colour. */
const STAGE_COLOR = {
  NOT_IN_PAYROLL: "gray",
  IN_PAYROLL: "blue",
  APPROVED: "purple",
  PUBLISHED: "orange",
  SETTLED: "green",
};

const REHIRE_COLOR = { YES: "green", NO: "red", CONDITIONAL: "orange" };
const REHIRE_LABEL = { YES: "Fit for rehire", NO: "Not fit for rehire", CONDITIONAL: "Conditional" };

/** What a row may do next, given its stage and the caller's rights. */
function rowActions(row, actor) {
  const accounts = canConfirmFnfPayment(actor);
  const stage = row && row.stage;
  // The server refuses while any OT is undecided / unpaid; so does the screen.
  const blocked = Boolean(row && (row.outstanding_ot || Number(row.open_ot_requests || 0) > 0));
  return {
    settle: accounts && stage === "PUBLISHED" && !blocked,
    reopen: accounts && stage === "SETTLED",
    exitInterview: canViewExitInterview(actor),
  };
}

/** "₹1,500.00" or "Recoverable ₹969.00" for a negative F&F net pay. */
function netLabel(netPay) {
  if (netPay === null || netPay === undefined) return "—";
  const n = Number(netPay);
  const text = Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return n < 0 ? `Recoverable ₹${text}` : `₹${text}`;
}

module.exports = {
  canViewFnf,
  canConfirmFnfPayment,
  canViewExitInterview,
  canManageExitInterview,
  canOverrideRehire,
  STAGE_COLOR,
  REHIRE_COLOR,
  REHIRE_LABEL,
  rowActions,
  netLabel,
};
