import API from "../util/api";

/**
 * Payrun Initialization - the browser's side of `/payrun`.
 *
 * FOUR CALLS, MATCHING THE FOUR ENDPOINTS EXACTLY. Nothing here invents a
 * route, and nothing here calculates anything: every figure the Payrun screen
 * shows - the gross, the status, the blocking reasons, the counts - comes from
 * the server, because a second implementation of the eligibility rules in a
 * browser is a second answer, and the two would disagree the first time one
 * of them was updated.
 *
 * THERE IS NO SINGLE-EMPLOYEE INITIALIZE CALL, and that is the backend's shape
 * rather than a convenience here: "Initialize" on one row posts a list of one,
 * so the single and the bulk case cannot end up applying different rules.
 *
 * REFUSALS ARE ROUTINE AND ARRIVE AS DATA. `util/api.js` resolves anything
 * under 429, so a 403 (`{ code: 403, msg }`) and a validation refusal
 * (`{ code: 422, msg }`) come back to the caller instead of rejecting - see
 * `util/handle403.js`, which keeps the session alive through an authorisation
 * refusal. `util/salaryApiError.js` turns those bodies into something to show.
 * Only a genuine transport failure rejects.
 */
const payrun = {
  /**
   * GET /payrun/month - the whole month in one read.
   *
   * ONE REQUEST FOR SIX HUNDRED EMPLOYEES. The obvious alternative - list the
   * employees, then ask per employee whether they are ready - is six hundred
   * requests to draw one table, and it would put the eligibility rules in the
   * browser to boot.
   *
   * THE FILTERS GO TO THE SERVER, so rows that do not match are never read out
   * of the database, let alone sent.
   */
  getMonth: (params) =>
    new Promise((resolve, reject) => {
      API.get("/payrun/month", { params })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /payrun/initialize - take the snapshots.
   *
   * THE BODY SAYS WHO AND WHICH MONTH, AND NOTHING ELSE. There is deliberately
   * no way to send a gross, a salary id or an attendance reference from here:
   * the server reads every stored value from its own tables, and its schema
   * refuses a body that so much as names one.
   */
  initialize: ({ year, month, employee_ids }) =>
    new Promise((resolve, reject) => {
      API.post("/payrun/initialize", { year, month, employee_ids })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /payrun/pay-type - this month's BANK <-> CASH, for one employee.
   *
   * IT CANNOT REACH THE EMPLOYEE MASTER. This endpoint writes one payrun row;
   * `new_employee.payment_type` is changed on the Employee Master, under its
   * own permission, and next month's payrun defaults from it again.
   */
  setPayType: ({ year, month, employee_id, pay_type }) =>
    new Promise((resolve, reject) => {
      API.post("/payrun/pay-type", { year, month, employee_id, pay_type })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** GET /payrun/pay-type/history - who changed it, from what, and when. */
  getPayTypeHistory: (params) =>
    new Promise((resolve, reject) => {
      API.get("/payrun/pay-type/history", { params })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * CLOSE ATTENDANCE FOR PAYROLL - accept the attendance as it stands.
   *
   * `employee_ids` for a selection, or `all_pending` for everybody the SERVER
   * finds pending - never both, which the server refuses rather than resolving.
   *
   * THE BODY CANNOT SAY WHO CLOSED IT and cannot name an attendance request:
   * the approver is the authenticated session, and this action decides no
   * regularization and no OT. The server's schema refuses a body that tries.
   */
  closeAttendance: ({ year, month, employee_ids, all_pending }) =>
    API.post("/payrun/attendance/close", {
      year,
      month,
      ...(all_pending ? { all_pending: true } : { employee_ids }),
    }).then((res) => res.data),

  /** The append-only close history for one employee's month. */
  getAttendanceCloseHistory: (params) =>
    API.get("/payrun/attendance/close/history", { params }).then((res) => res.data),
};

export default payrun;
