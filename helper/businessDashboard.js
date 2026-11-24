import API from "../util/api";

/**
 * The Business Dashboard (`routes/business_dashboard.js` on the server): one
 * read, live from RetailPilot, behind view_sales_dashboard and the dashboard
 * store scope. Refusals arrive as `{ code: 403, msg }`, so callers read `code`.
 */
const BusinessDashboardHelper = {
  getSummary: (params) => API.get("/business-dashboard/summary", { params }).then((res) => res.data),
  getPurchaseReturns: (params) => API.get("/business-dashboard/purchase-returns", { params }).then((res) => res.data),
  /** The 9:15 am Open returns PDF as it stands now (administrators), as a blob; a JSON error is thrown. */
  getOpenReturnsPdf: async () => {
    const res = await API.request({
      method: "GET",
      url: "/business-dashboard/open-returns/report.pdf",
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
  /** Send the Open returns PDF to the Purchase Telegram group now (administrators). */
  sendOpenReturns: () => API.post("/business-dashboard/open-returns/send").then((res) => res.data),
};

export default BusinessDashboardHelper;
