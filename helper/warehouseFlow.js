import API from "../util/api";

/**
 * Warehouse Flow (`routes/warehouse_flow.js` on the server), shown on the
 * Business Dashboard: behind view_sales_dashboard and the dashboard store
 * scope. Refusals arrive as `{ code, msg }`, so callers read `code`.
 */
const WarehouseFlowHelper = {
  getFlow: (params) => API.get("/warehouse-flow/flow", { params }).then((res) => res.data),
  getInspection: (slug) => API.get(`/warehouse-flow/inspection/${encodeURIComponent(slug)}`).then((res) => res.data),
  /**
   * The end-of-day PDF as it stands now (administrators). Read as a blob with
   * transformResponse off - the shared instance would parse it as JSON - and
   * an error that arrives as JSON is read back out and thrown.
   */
  getEodReportPdf: async () => {
    const res = await API.request({
      method: "GET",
      url: "/warehouse-flow/eod-report.pdf",
      responseType: "blob",
      transformResponse: [(data) => data],
    });
    const blob = res.data;
    if (!blob || (blob.type && String(blob.type).includes("json")) || res.status >= 400) {
      let msg = "Could not make the PDF";
      try {
        const body = JSON.parse(await blob.text());
        msg = body.msg || body.message || msg;
      } catch (e) {
        // not JSON - keep the plain message
      }
      throw new Error(msg);
    }
    return blob;
  },
  /** Send the end-of-day PDF to the Purchase Telegram group now (administrators). */
  sendEodReport: () => API.post("/warehouse-flow/eod-report/send").then((res) => res.data),
  getGatePass: (slug) => API.get(`/warehouse-flow/gate-pass/${encodeURIComponent(slug)}`).then((res) => res.data),
};

export default WarehouseFlowHelper;
