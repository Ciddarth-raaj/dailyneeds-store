import API from "../util/api";

/**
 * The Payroll Dashboard, as `routes/payroll_dashboard.js` defines it. Three
 * reads, all GET, all behind view_employees + view_payroll + view_salary and
 * the employee branch scope. Nothing here writes.
 *
 *   getMonths     the 12 months of a financial year, with progress
 *   getSummary    every panel for one month and one set of filters
 *   getEmployees  the employees behind one number, a page at a time - fetched
 *                 only when a drill-down is opened
 *
 * Refusals arrive as `{ code: 403, msg }` (the axios instance resolves < 429),
 * so callers read `code`.
 */
const data = (p) => p.then((res) => res.data);

const PayrollDashboardHelper = {
  getMonths: (params) => data(API.get("/payroll/dashboard/months", { params })),
  getSummary: (params) => data(API.get("/payroll/dashboard/summary", { params })),
  getEmployees: (params) => data(API.get("/payroll/dashboard/employees", { params })),
};

export default PayrollDashboardHelper;
