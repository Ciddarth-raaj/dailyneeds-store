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
