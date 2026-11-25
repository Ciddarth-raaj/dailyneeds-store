import API from "../util/api";

/**
 * Master → Company Details - the browser's side of /company. Every call is
 * behind `manage_company_details` on the server.
 *
 * Refusals (403, 404, 422) come back as data - `{ code, msg, errors }` - for
 * the screen to show; nothing here decides anything.
 */
const CompanyHelper = {
  /** Every company, and whether payslips can be published from them. */
  list: () => API.get("/company").then((res) => res.data),

  create: (body) => API.post("/company", body).then((res) => res.data),

  update: (companyId, body) => API.put(`/company/${companyId}`, body).then((res) => res.data),

  /** Make this THE payslip company; every other company stops being active. */
  setPayslipCompany: (companyId) => API.post(`/company/${companyId}/payslip`, {}).then((res) => res.data),
};

export default CompanyHelper;
