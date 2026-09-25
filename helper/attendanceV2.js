import API from "../util/api";

/**
 * Attendance v2 - calculated attendance, as `routes/attendance_calculation.js`
 * and `routes/attendance_regularization.js` define it.
 *
 * TWO READ PATHS, ONE SHAPE.
 *
 *   My Attendance        GET /attendance/me                no permission key
 *                        the caller's own days. The backend takes the
 *                        employee from the session token and REFUSES an
 *                        employee_id parameter, so nothing here sends one.
 *   Employee Attendance  GET /attendance/calculated         view_calculated_attendance
 *                        any employee, for HR/Admin.
 *
 * Both resolve `{ code: 200, days: [...] }` and both are read-only: neither
 * stores nor recalculates anything.
 *
 *   Regularize           POST /attendance/me/regularization  self only
 *                        the missing punch time and a reason. Existing
 *                        punches are not sent and cannot be: the body has no
 *                        field for one.
 *   Request OT           POST /attendance/me/ot-request       self only
 *                        a date and a reason. The OT minutes are the
 *                        engine's and are not sent: the body has no field
 *                        for them, and the backend refuses one.
 *   Edit Shift           POST /attendance/calculated/date-shift
 *                        edit_attendance_date_shift; one employee, one date,
 *                        one shift. The options for its dropdown come from
 *                        the sibling GET.
 *
 * Refusals arrive as `{ code: 403, msg }` like every other helper; the
 * screens read `code` rather than assuming success.
 */
const call = (method, url, config) =>
  new Promise((resolve, reject) => {
    API[method](url, config)
      .then((res) => resolve(res.data))
      .catch(reject);
  });

const attendanceV2 = {
  /** `{ from_date, to_date }` only. Never an employee id. */
  getMyAttendance: ({ from_date, to_date }) =>
    call("get", "/attendance/me", { params: { from_date, to_date } }),

  getEmployeeAttendance: ({ employee_id, from_date, to_date }) =>
    call("get", "/attendance/calculated", { params: { employee_id, from_date, to_date } }),

  /** `{ attendance_date, punch_time, reason }`. */
  raiseMyRegularization: (body) =>
    new Promise((resolve, reject) => {
      API.post("/attendance/me/regularization", body)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** `{ attendance_date, reason }`. Never minutes, never an employee id. */
  raiseMyOtRequest: ({ attendance_date, reason }) =>
    new Promise((resolve, reject) => {
      API.post("/attendance/me/ot-request", { attendance_date, reason })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /* ---------------------------------------------- the approval screens */

  /**
   * `{ request_type, status, filters }` - ONE type per call, which is what
   * the unified approval centre's Attendance | OT | Shift selector chooses.
   *
   * The filters NARROW what the caller may already see and can never widen
   * it: the outlets a user has rights to are resolved on the server from
   * their own branch scope, and an outlet asked for outside it simply
   * matches nothing. Nothing here sends an employee id the caller could use
   * to reach somebody they are not entitled to see.
   */
  getApprovals: ({
    request_type,
    status = "PENDING",
    limit = 200,
    offset = 0,
    outlet_ids = null,
    employee_id = null,
    designation_id = null,
  }) =>
    call("get", "/attendance/approvals", {
      params: {
        request_type,
        status,
        limit,
        offset,
        ...(outlet_ids && outlet_ids.length > 0 ? { outlet_ids: outlet_ids.join(",") } : {}),
        ...(employee_id ? { employee_id } : {}),
        ...(designation_id ? { designation_id } : {}),
      },
    }),

  /**
   * "Pending with me", counted on the server - under the SAME filters the
   * table is showing, so the number is a count of what the reader can see.
   */
  getApprovalCount: (request_type, filters = {}) =>
    call("get", "/attendance/approvals/count", {
      params: {
        request_type,
        ...(filters.outlet_ids && filters.outlet_ids.length > 0 ? { outlet_ids: filters.outlet_ids.join(",") } : {}),
        ...(filters.employee_id ? { employee_id: filters.employee_id } : {}),
        ...(filters.designation_id ? { designation_id: filters.designation_id } : {}),
      },
    }),

  /* ------------------------------------- the one-day shift change request */

  /**
   * The shifts I MAY ask for on a date: active, running that weekday, and
   * LONGER than my own. The server re-derives every one of those conditions
   * when the request is submitted, so this dropdown is a convenience and not
   * the rule.
   */
  getMyShiftChangeOptions: (attendance_date) =>
    call("get", "/attendance/me/shift-change/options", { params: { attendance_date } }),

  /**
   * `{ attendance_date, work_shift_id, reason }`. Self only: the employee is
   * the session's, and the body has no field that could name anybody else.
   * It RAISES a request - nothing is changed until the last required
   * approval.
   */
  raiseMyShiftChange: ({ attendance_date, work_shift_id, reason }) =>
    new Promise((resolve, reject) => {
      API.post("/attendance/me/shift-change", { attendance_date, work_shift_id, reason })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** Decide the current stage. Takes NO minutes: an approver cannot change OT. */
  decideApproval: (request_id, { decision, remarks }) =>
    new Promise((resolve, reject) => {
      API.post(`/attendance/regularization/${request_id}/decision`, { decision, remarks: remarks || "" })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * ADMINISTRATORS ONLY: VOID an Attendance or OT request's decision - the
   * request becomes CANCELLED and the employee may raise a fresh one. The
   * reason and nothing else: the type, the employee, the decision, the stage
   * and the minutes are read from the stored request, and the server checks
   * the account itself.
   */
  revokeApproval: (request_id, { reason }) =>
    new Promise((resolve, reject) => {
      API.post(`/attendance/approvals/${request_id}/revoke`, { reason })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /* ---------------------------------------------- bulk recalculation */

  /** `{ from_date, to_date, employee_id?, store_id?, designation_id? }` - only the filters set. */
  recalculateBulk: (body) =>
    new Promise((resolve, reject) => {
      API.post("/attendance/calculated/recalculate-bulk", body)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  getRecalculationRuns: (limit = 20) =>
    call("get", "/attendance/calculated/recalculate-runs", { params: { limit } }),

  /** One run, for polling a propagation a Work Shift save queued. */
  getRecalculationRun: (runId) =>
    call("get", `/attendance/calculated/recalculate-runs/${runId}`, {}),

  /** Put a failed run - or one that finished with errors - back in the queue. */
  retryRecalculationRun: (runId) =>
    new Promise((resolve, reject) => {
      API.post("/attendance/calculated/recalculate-runs/retry", { run_id: runId })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  getDateShiftOptions: () => call("get", "/attendance/calculated/date-shift/options", {}),

  /** `{ employee_id, attendance_date, work_shift_id }`. */
  setDateShift: (body) =>
    new Promise((resolve, reject) => {
      API.post("/attendance/calculated/date-shift", body)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),
};

export default attendanceV2;
