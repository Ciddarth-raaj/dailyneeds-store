import API from "../util/api";

/**
 * The Business Dashboard (`routes/business_dashboard.js` on the server): one
 * read, live from RetailPilot, behind view_sales_dashboard and the dashboard
 * store scope. Refusals arrive as `{ code: 403, msg }`, so callers read `code`.
 */
const BusinessDashboardHelper = {
  getSummary: (params) => API.get("/business-dashboard/summary", { params }).then((res) => res.data),
};

export default BusinessDashboardHelper;
