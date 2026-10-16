import API from "../util/api";

/**
 * FULL & FINAL SETTLEMENT, EXIT INTERVIEW AND REHIRE - the browser's side of
 * /payrun/fnf and /hr/exit. One call per endpoint; nothing here decides
 * anything. Every figure (net pay, F&F totals) and every stage is the
 * server's answer - the F&F month itself is calculated by the ordinary payrun.
 *
 * NOTHING HERE SENDS A FIGURE THE SERVER COMPUTES. F&F items carry the
 * amounts HR enters; Settle carries the payment facts (mode, reference,
 * date) - never a net amount, which the server freezes from the published
 * statement itself.
 *
 * REFUSALS ARRIVE AS DATA: `{ code: 403 | 404 | 409 | 422, msg }`.
 */
const data = (res) => res.data;

const EmployeeExitHelper = {
  /* ---------------------------------------------------------- F&F */
  getMonth: (params) => API.get("/payrun/fnf/month", { params }).then(data),
  getItems: (params) => API.get("/payrun/fnf/items", { params }).then(data),
  saveItems: ({ year, month, employee_id, items }) =>
    API.post("/payrun/fnf/items", { year, month, employee_id, items }).then(data),
  settle: ({ year, month, employee_id, payment_mode, payment_reference, paid_on }) =>
    API.post("/payrun/fnf/settle", { year, month, employee_id, payment_mode, payment_reference, paid_on }).then(data),
  reopen: ({ year, month, employee_id, reason }) =>
    API.post("/payrun/fnf/reopen", { year, month, employee_id, reason }).then(data),

  /* --------------------------------- exit interview / rehire (HR only) */
  getEmployeeExits: (employeeId) => API.get(`/hr/exit/employee/${employeeId}`).then(data),
  getExitDetail: (employeeId, caseId) => API.get(`/hr/exit/employee/${employeeId}/case/${caseId}`).then(data),
  getRehireStatus: (employeeId) => API.get(`/hr/exit/employee/${employeeId}/rehire-status`).then(data),
  saveInterview: (employeeId, body) => API.post(`/hr/exit/employee/${employeeId}/interview`, body).then(data),
  assessRehire: (employeeId, body) => API.post(`/hr/exit/employee/${employeeId}/rehire`, body).then(data),
};

export default EmployeeExitHelper;
