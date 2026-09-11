import API from "../util/api";

/**
 * M3 — the ONE salary read the Employee Master makes.
 *
 * `routes/employee_salary.js` (M2) defines six endpoints: preview, create,
 * current, history, amend, approve and reject. THIS HELPER EXPOSES EXACTLY ONE
 * OF THEM, and that is the whole of the Employee Master's relationship with
 * pay: it reads the currently effective approved salary and can do nothing
 * else. Salary is entered, revised and approved from Payroll's own screens,
 * which are later modules; a create or approve call sitting unused in this
 * file would be the first half of building them here by accident.
 *
 * THE RESOLVER IS THE SOURCE OF TRUTH. `/current` answers with the latest
 * APPROVED revision effective on or before `as_of` (today by default) — never
 * a pending one, never a rejected one, and never a future-dated one before its
 * date arrives. Nothing in the frontend re-derives that, and nothing reads the
 * legacy `new_employee.salary` column, which the Employee Master no longer
 * writes or shows at all.
 *
 * A `null` current_salary is a real answer and means nothing has been approved
 * yet. It does NOT mean zero.
 *
 * The route is guarded by `view_employees` AND `view_salary`, so a refusal is
 * a routine answer and arrives as `{ code: 403, msg }` like every other helper
 * in this repo rather than as a rejected promise - see `util/handle403.js`,
 * which keeps the session alive through it.
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
};

export default employeeSalary;
