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
   * GET /hr/work-shift-assignments/options — the ACTIVE work shifts as a
   * dropdown: `{ code, data: [{ work_shift_id, shift_code, shift_name,
   * timing }] }`. Identity and timing only, no configuration, which is why
   * it is open to `employee_create` as well as the shift keys - a store
   * manager chooses a new hire's initial shift from it (M1).
   */
  getShiftOptions: () =>
    new Promise((resolve, reject) => {
      API.get("/hr/work-shift-assignments/options")
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

  /**
   * POST /hr/work-shift-assignments/change — the EFFECTIVE-DATED permanent
   * shift change: `{ employee_id, work_shift_id, effective_from, reason }`.
   *
   * It APPENDS to the employee's dated history and overwrites nothing: dates
   * before `effective_from` keep the shift they had, and dates from it take
   * the new one. The effective date may be in the past, if payroll for the
   * months it would actually move is unlocked; it may NOT be in the future,
   * because nothing in this system would activate it on the day.
   *
   * THREE OUTCOMES, not two:
   *
   *   200  saved, and the affected dates were recalculated
   *   207  SAVED, and the recalculation FAILED - the history is right and
   *        the attendance behind it is stale. `recalculation_range` is the
   *        range to retry. This is not a success and the screen must not
   *        show one.
   *   4xx  nothing was written
   *
   * Its own permission, `edit_shift_assignment_effective_dated`, which the
   * bulk assignment above does NOT imply - so a 403 here is a routine answer
   * and arrives as `{ code: 403, msg }` like every other helper.
   */
  changeAssignment: ({ employee_id, work_shift_id, effective_from, reason }) =>
    new Promise((resolve, reject) => {
      API.post("/hr/work-shift-assignments/change", {
        employee_id,
        work_shift_id,
        effective_from,
        reason,
      })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /hr/work-shift-assignments/recalculate —
   * `{ employee_id, from_date, to_date }`.
   *
   * THE RECOVERY for a 207 from `changeAssignment`, and deliberately NOT
   * `/attendance/calculated/recalculate-bulk`. That endpoint is the general
   * tool - any employee, any outlet, any designation - behind
   * `recalculate_attendance`, a key a shift editor need not hold; retrying
   * through it would have answered 403 to exactly the person entitled to fix
   * the problem, and granting them that key to avoid the 403 would have
   * handed them the general tool.
   *
   * This one needs the SAME two keys as the change it follows, is scoped to
   * an employee the caller may reach, and takes one employee and one range
   * with no parameter that could widen either.
   */
  recalculateAfterChange: ({ employee_id, from_date, to_date }) =>
    new Promise((resolve, reject) => {
      API.post("/hr/work-shift-assignments/recalculate", { employee_id, from_date, to_date })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * GET /hr/work-shift-assignments/history/:id — every dated row for one
   * employee, newest first: `{ effective_from, shift, source, reason,
   * changed_by_name, changed_at, is_current, is_future_dated }`.
   *
   * `is_current` is the RESOLVER's answer for today and NOT the first row: a
   * future-dated change sits at the top of the list and is not current.
   */
  getAssignmentHistory: (employeeId) =>
    new Promise((resolve, reject) => {
      API.get(`/hr/work-shift-assignments/history/${employeeId}`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),
};

export default employeeWorkShift;
