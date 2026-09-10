import API from "../util/api";

/**
 * The /employee-work-shift API surface, as `routes/employee_work_shift.js`
 * actually defines it.
 *
 * THIS IS NOT `helper/shift.js` AND NOT `helper/workShift.js`.
 *
 *   helper/shift.js      the legacy `shift_master` behind /shift, which the
 *                        live system and `new_employee.shift_id` still use.
 *                        Untouched by this phase.
 *   helper/workShift.js  maintaining work shift DEFINITIONS behind
 *                        /work-shift.
 *   this file            mapping employees onto those definitions. It reads
 *                        and writes `new_employee.default_work_shift_id` and
 *                        nothing else.
 *
 * Permissions on the server: `view_employees` for the employee list,
 * `view_shift` for the dropdown, `employee_edit` for the write.
 *
 * Every method resolves `res.data` like the other helpers in this repo, which
 * means a caller can receive `{ code: 403, msg }` instead of the happy shape.
 * That is deliberate — see `util/apiList.js` — and the screen unwraps it
 * rather than assuming success.
 */
const employeeWorkShift = {
  /**
   * GET /employee-work-shift/employees — the assignment list: `{ code, data }`.
   *
   * Filtering is server-side. `params` should already have its blanks removed
   * by `filtersToQuery`: the backend validates with `Joi.number()`, which
   * refuses an empty string, so sending `store_id=""` would 422 the first load.
   */
  getEmployees: (params = {}) =>
    new Promise((resolve, reject) => {
      API.get("/employee-work-shift/employees", { params })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * GET /employee-work-shift/work-shifts — ACTIVE work shifts only, for the
   * dropdown: `{ code, data }`.
   *
   * The filtering is the server's, not a `.filter` here: the write rejects an
   * inactive shift too, so a stale dropdown cannot produce an assignment the
   * backend would have refused.
   */
  getActiveWorkShifts: () =>
    new Promise((resolve, reject) => {
      API.get("/employee-work-shift/work-shifts")
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /employee-work-shift/bulk-assign — `{ employee_ids, work_shift_id }`.
   *
   * All-or-nothing on the server: if any selected employee cannot be assigned,
   * nobody is, and the response carries `rejected_employee_ids`.
   *
   * THERE IS NO UNASSIGN, here or on the server. An assignment is changed by
   * assigning a different active work shift; there is no call that clears one.
   */
  bulkAssign: (employeeIds, workShiftId) =>
    new Promise((resolve, reject) => {
      API.post("/employee-work-shift/bulk-assign", {
        employee_ids: employeeIds,
        work_shift_id: workShiftId,
      })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),
};

export default employeeWorkShift;
