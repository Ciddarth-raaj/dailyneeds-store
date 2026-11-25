import API from "../util/api";

/**
 * Transfers (`routes/transfers.js` on the server), live from RetailPilot:
 * behind view_sales_dashboard and the dashboard store scope. Refusals arrive
 * as `{ code, msg }`, so callers read `code`.
 */
const TransfersHelper = {
  list: (params) => API.get("/transfers", { params }).then((res) => res.data),
  get: (slug) => API.get(`/transfers/${encodeURIComponent(slug)}`).then((res) => res.data),
};

export default TransfersHelper;
