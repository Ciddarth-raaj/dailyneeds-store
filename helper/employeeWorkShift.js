import API from "../util/api";

/**
 * The Employee Shift Assignment API, as `routes/employee_work_shift.js`
 * defines it.
 *
 * THIS IS THE NEW MAPPING. It reads and writes
 * `new_employee.default_work_shift_id` and nothing else. The legacy
 * `shift_id` / `shift_code` pair behind /shift is untouched, and there is no
 * call here that could reach it.
 *
 * The endpoints live at /hr, with the other employee writes, because what a
 * bulk assignment changes is an employee record. The shifts themselves are
 * still created and edited at /work-shift (`helper/workShift.js`).
 *
 * Both are guarded by TWO permissions at once on the server -
 * `view_employees` + `view_shift_assignments` to read, and `employee_edit`
 * plus `assign_employee_shift` (one employee) or `bulk_assign_employee_shift`
 * (more than one) to assign - so a refusal is a routine answer here, and
 * arrives as
 * `{ code: 403, msg }` like every other helper in this repo rather than as a
 * rejected promise. The screen unwraps it; see `util/apiList.js`.
 */
const employeeWorkShift = {
  /**
   * GET /hr/work-shift-assignments — the assignment list, filtered on the
   * SERVER. Filters: `store_ids`, `department_ids`, `designation_ids`
   * (comma lists), `search`, `assignment_status` (ALL/ASSIGNED/UNASSIGNED)
   * and `employment_status` (ACTIVE/INACTIVE/ALL, ACTIVE by default).
   *
   * Resolves `{ code, data: [...] }`.
   */
  getAssignments: (params = {}) =>
    new Promise((resolve, reject) => {
      API.get("/hr/work-shift-assignments", { params })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * GET /hr/work-shift-assignments/employee/:id — ONE employee's current work
   * shift, for the employee profile.
   *
   * Read-only, and the same permission pair as the list. The profile shows
   * which shift somebody is on; changing it belongs to the assignment screen.
   *
   * Resolves `{ code, data: { assigned, work_shift_id, shift_code,
   * shift_name, shift_active, timing, timings } }`, or a `{ code, msg }`
   * refusal like every other helper here.
   */
  getEmployeeAssignment: (employeeId) =>
    new Promise((resolve, reject) => {
      API.get(`/hr/work-shift-assignments/employee/${employeeId}`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/work-shift-assignments/bulk — `{ employee_ids, work_shift_id }`.
   *
   * All or nothing. An unknown employee id or an inactive work shift refuses
   * the whole request; nothing partial is ever written, so a failure leaves
   * the selection exactly as it was and it can be retried.
   */
  assignWorkShift: (employeeIds, workShiftId) =>
    new Promise((resolve, reject) => {
      API.post("/hr/work-shift-assignments/bulk", {
        employee_ids: employeeIds,
        work_shift_id: workShiftId,
      })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),
};

export default employeeWorkShift;
