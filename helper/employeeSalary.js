import API from "../util/api";

/**
 * The Employee Master's salary calls — READ THE RECORD, AND ENTER THE FIRST ONE.
 *
 * M3 exposed exactly one of M2's endpoints here: the current-salary resolver.
 * That was right for a card that only displayed pay, and wrong for onboarding,
 * which is the one moment an employee has no salary at all and the person
 * entering the rest of their record is the person who knows what it should be.
 * So this helper now covers the FIRST salary and nothing beyond it.
 *
 * FOUR CALLS, AND THE LINE BETWEEN THEM AND THE REST IS THE WHOLE POINT:
 *
 *   current    the latest APPROVED revision effective today
 *   history    every revision, which is what says whether this employee's next
 *              proposal would be an opening salary at all
 *   preview    the server's calculation, saving nothing
 *   create     the opening proposal, which lands PENDING
 *
 * WHAT IS ABSENT IS DELIBERATE AND IS THE PRODUCT RULE. There is no amend, no
 * approve and no reject here, and there is no bulk upload. Once an employee has
 * a salary history, the Employee Master stops being a place where pay changes:
 * every later revision goes through Payroll > Salary Revision & History, which
 * has its own helper (`helper/payrollSalary.js`). A second place to REVISE a
 * salary is a second answer to what somebody is paid; a single place to enter
 * the FIRST one is just onboarding.
 *
 * NOTHING HERE CALCULATES ANYTHING. The browser sends a gross and — for a
 * manual override — four component amounts, and receives every other figure.
 * The opening effective date is not sent at all: it is the later of the opening
 * floor and the date of joining, the server resolves it, and this screen
 * displays the answer.
 *
 * A `null` current_salary is a real answer and means nothing has been approved
 * yet. It does NOT mean zero, and it does not mean there is no salary history —
 * a pending proposal and an approved one dated in the future are both invisible
 * to the resolver, which is exactly why `getHistory` is read beside it.
 *
 * The routes are guarded by `view_employees` with `view_salary` or
 * `add_salary`, so a refusal is a routine answer and arrives as
 * `{ code: 403, msg }` like every other helper in this repo rather than as a
 * rejected promise - see `util/handle403.js`, which keeps the session alive.
 */
const employeeSalary = {
  /**
   * GET /hr/salary/employee/:id/current — the current effective approved
   * salary, as `{ employee_id, as_of, current_salary }`.
   *
   * `asOf` is optional and is not sent at all when absent, so the server
   * applies its own "today" rather than one derived from a browser clock.
   */
  getCurrentSalary: (employeeId, asOf) =>
    new Promise((resolve, reject) => {
      const config = asOf ? { params: { as_of: asOf } } : undefined;
      API.get(`/hr/salary/employee/${employeeId}/current`, config)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * GET /hr/salary/employee/:id/history — every revision, newest first.
   *
   * READ FOR ONE REASON: to know which of the four payroll states this employee
   * is in. The resolver cannot answer that on its own - it reports `null` for
   * somebody with a pending first proposal and for somebody with nothing at
   * all, and those two states want opposite things on screen.
   */
  getHistory: (employeeId) =>
    new Promise((resolve, reject) => {
      API.get(`/hr/salary/employee/${employeeId}/history`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/salary/preview/:id — the server's calculation, saving nothing.
   *
   * The ONLY way this screen learns a breakup, a contribution, a CTC or the
   * opening effective date. The create path runs the same function on the same
   * inputs, so what is previewed is what gets stored.
   */
  preview: (employeeId, body) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/salary/preview/${employeeId}`, body)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/salary/employee/:id — the opening proposal. Always lands PENDING.
   *
   * The server decides whether this is an OPENING_SALARY or a REVISION and,
   * for an opening, decides the effective date too. Neither is this screen's
   * to choose, so neither is asserted here: no `effective_from` is sent, and
   * the screen only offers this at all when the employee has no salary
   * history. If somebody raised a proposal in the meantime, the server refuses
   * this one and says so.
   */
  createOpeningSalary: (employeeId, body) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/salary/employee/${employeeId}`, body)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),
};

export default employeeSalary;
