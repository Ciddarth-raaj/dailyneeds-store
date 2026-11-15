import API from "../util/api";

/**
 * Warehouse Flow (`routes/warehouse_flow.js` on the server), shown on the
 * Business Dashboard: behind view_sales_dashboard and the dashboard store
 * scope. Refusals arrive as `{ code, msg }`, so callers read `code`.
 */
const WarehouseFlowHelper = {
  getFlow: (params) => API.get("/warehouse-flow/flow", { params }).then((res) => res.data),
  getGatePass: (slug) => API.get(`/warehouse-flow/gate-pass/${encodeURIComponent(slug)}`).then((res) => res.data),
};

export default WarehouseFlowHelper;
