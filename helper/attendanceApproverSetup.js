import API from "../util/api";

/**
 * Attendance Approver Setup - `routes/attendance_approver_setup.js`.
 *
 * Every call is behind `manage_attendance_approvers` on the server, reads
 * included. Ids go in; ids plus resolved names come out. No call sends or
 * receives a name as data, and none carries a payroll or salary field.
 *
 * Refusals arrive as `{ code: 403, msg }` like every other helper; the
 * screen reads `code` rather than assuming success.
 */
const call = (method, url, config) =>
  new Promise((resolve, reject) => {
    API[method](url, config)
      .then((res) => resolve(res.data))
      .catch(reject);
  });

const attendanceApproverSetup = {
  /** `{ department_id?, store_id?, designation_id?, employee_id?, search?, limit?, offset? }` - only the filters set. */
  list: (params) => call("get", "/attendance/approver-setup", { params }),

  /** One employee's setup, with the employee named for the edit dialog. */
  get: (employee_id) => call("get", `/attendance/approver-setup/${employee_id}`, {}),

  /** Active employees for new assignments; `include_inactive` for the Replace flow's current-approver search. */
  options: ({ include_inactive = false, search = "" } = {}) =>
    call("get", "/attendance/approver-setup/options", { params: { include_inactive: include_inactive ? 1 : 0, search } }),

  /** Everybody currently an approver somewhere, active or resigned. */
  currentApprovers: () => call("get", "/attendance/approver-setup/current-approvers", {}),

  audit: (params) => call("get", "/attendance/approver-setup/audit", { params }),

  /** SET one employee: `{ first_level_approver_employee_id, second_level_approver_employee_id, final_approver_employee_id }`. */
  save: (employee_id, body) => call("put", `/attendance/approver-setup/${employee_id}`, body),

  /** BULK_SET: `{ employee_ids, first_level_approver_employee_id, second_level_approver_employee_id, final_approver_employee_id }`. */
  bulkSet: (body) => call("post", "/attendance/approver-setup/bulk", body),

  /** REPLACE: `{ current_approver_employee_id, approval_level, new_approver_employee_id, preview }`. */
  replace: (body) => call("post", "/attendance/approver-setup/replace", body),
};

export default attendanceApproverSetup;
