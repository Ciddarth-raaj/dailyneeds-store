import API from "../util/api";

/**
 * Payrun Calculation & Review - the browser's side of /payrun/calculation.
 *
 * ELEVEN CALLS, MATCHING THE ELEVEN ENDPOINTS EXACTLY. Nothing here invents a route
 * and nothing here decides anything: every figure on the review screen - the
 * daily rate, the OT price, the PF and ESI, the net pay - and every status,
 * blocker and reason is the server's answer, because a second implementation
 * of a payroll formula in a browser is a second answer, and the two would
 * disagree the first time one of them was updated. This is the same rule
 * `helper/payrun.js` and `helper/payrunAdjustments.js` state about their own
 * stages, and it matters most here: this screen shows what somebody is about
 * to be paid.
 *
 * CALCULATE AND RECALCULATE ARE TWO CALLS BECAUSE THEY ARE TWO INTENTIONS.
 * One computes the months nobody has computed; the other refreshes one that a
 * source has moved under. They reach one implementation on the server, so they
 * cannot drift apart - but a single call with a flag would mean a screen
 * deciding which of the two somebody meant.
 *
 * A BULK ACTION SENDS `all_eligible` / `all_ready` AND NO LIST, deliberately.
 * Who is eligible and who is ready is re-decided by the server at the moment
 * of the request; a browser sending the ids it believes qualify would be
 * acting on a month that may be minutes old - an OT approval could have landed
 * since, or a colleague could have approved somebody.
 *
 * NOTHING HERE SENDS A FIGURE. There is no amount, no rate, no net pay and no
 * hash in any body below; the endpoints' schemas refuse one.
 *
 * REFUSALS ARE ROUTINE AND ARRIVE AS DATA - see `helper/payrun.js`.
 */
const PayrunCalculationHelper = {
  /** GET the month: the initialized population, their statuses, the counts. */
  getMonth: (params) =>
    API.get("/payrun/calculation/month", { params }).then((res) => res.data),

  /** GET one employee's full breakup - salary, OT, adjustments, statutory, final. */
  getEmployee: (params) =>
    API.get("/payrun/calculation/employee", { params }).then((res) => res.data),

  /**
   * Calculate. `employee_ids` for a selection, or `all_eligible` for everybody
   * who has no calculation yet - never both, which the server refuses rather
   * than resolving.
   */
  calculate: ({ year, month, employee_ids, all_eligible }) =>
    API.post("/payrun/calculation/calculate", {
      year,
      month,
      ...(all_eligible ? { all_eligible: true } : { employee_ids }),
    }).then((res) => res.data),

  /**
   * Recalculate - the explicit act a RECALCULATION_REQUIRED row is waiting
   * for. Nothing recalculates anybody because a source moved; a person does.
   */
  recalculate: ({ year, month, employee_ids, all_eligible }) =>
    API.post("/payrun/calculation/recalculate", {
      year,
      month,
      ...(all_eligible ? { all_eligible: true } : { employee_ids }),
    }).then((res) => res.data),

  /**
   * APPROVE & LOCK.
   *
   * THE BODY CANNOT SAY WHO APPROVED, and it cannot say what they approved
   * either: the server takes the approver from the authenticated session and
   * records the approval against the calculation it holds, refusing it if that
   * calculation has moved since this screen read it.
   */
  approve: ({ year, month, employee_ids, all_ready, mode }) =>
    API.post("/payrun/calculation/approve", {
      year,
      month,
      ...(all_ready ? { all_ready: true } : { employee_ids }),
      ...(mode ? { mode } : {}),
    }).then((res) => res.data),

  /**
   * UNLOCK / PUBLISH / UNPUBLISH - explicit ids, a mode, and a reason (required
   * by the server for unlock and unpublish). The server re-decides every
   * employee and returns one result each; who acted is its own identity.
   */
  unlock: ({ year, month, employee_ids, reason, remark, mode }) =>
    API.post("/payrun/calculation/unlock", { year, month, employee_ids, reason, ...(remark ? { remark } : {}), mode }).then(
      (res) => res.data
    ),
  publish: ({ year, month, employee_ids, reason, remark, mode }) =>
    API.post("/payrun/calculation/publish", {
      year,
      month,
      employee_ids,
      ...(reason ? { reason } : {}),
      ...(remark ? { remark } : {}),
      mode,
    }).then((res) => res.data),
  unpublish: ({ year, month, employee_ids, reason, remark, mode }) =>
    API.post("/payrun/calculation/unpublish", { year, month, employee_ids, reason, ...(remark ? { remark } : {}), mode }).then(
      (res) => res.data
    ),

  /**
   * RESET CALCULATION - return employees to Not Calculated for this month.
   *
   * ALWAYS AN EXPLICIT LIST, never a select-all flag: a reset discards
   * reviewed figures and is done to the people somebody chose. The reason is
   * required, the remark is required for OTHER, and `mode` says whether it was
   * one row's action or a selection's. Who reset is the server's identity.
   */
  reset: ({ year, month, employee_ids, reason, remark, mode }) =>
    API.post("/payrun/calculation/reset", {
      year,
      month,
      employee_ids,
      reason,
      ...(remark ? { remark } : {}),
      mode,
    }).then((res) => res.data),

  /**
   * PROCESS ATTENDANCE - the attendance engine's own month persist, run for
   * the listed employees where the server's readiness says it would clear a
   * blocker. Explicit ids only; the server re-decides every one.
   */
  processAttendance: ({ year, month, employee_ids }) =>
    API.post("/payrun/calculation/process-attendance", {
      year,
      month,
      employee_ids,
    }).then((res) => res.data),

  /**
   * PUBLISH ALL APPROVED PAYSLIPS. The month only: who is approved is decided
   * on the server, inside the caller's branch scope.
   */
  publishAll: ({ year, month }) =>
    API.post("/payrun/calculation/publish-all", { year, month }).then((res) => res.data),

  /**
   * RETRY NOTIFICATION - send the "payslip available" Telegram message again.
   * Ids only: the Telegram destination is the server's to resolve. Never
   * republishes.
   */
  retryNotification: ({ year, month, employee_ids }) =>
    API.post("/payrun/calculation/retry-notification", { year, month, employee_ids }).then((res) => res.data),

  /** VIEW PAYSLIP (admin): the frozen snapshot, its versions and its notification attempts. */
  getPayslip: (params) =>
    API.get("/payrun/calculation/payslip", { params }).then((res) => res.data),

  /** GET one employee's calculation and approval history for the month. */
  getHistory: (params) =>
    API.get("/payrun/calculation/history", { params }).then((res) => res.data),
};

export default PayrunCalculationHelper;
