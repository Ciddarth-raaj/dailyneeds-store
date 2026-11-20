import API from "../util/api";

/**
 * Warehouse Daily Reports (`routes/wh_daily_reports.js` on the server):
 * the Daily Uploads page (status, upload, remove) needs upload_wh_daily_reports,
 * the Analysis page (analysis, rows) view_wh_daily_reports. Refusals arrive as `{ code, msg }`.
 */
const WhDailyReportsHelper = {
  status: (params) => API.get("/wh-daily-reports/status", { params }).then((res) => res.data),
  analysis: (params) => API.get("/wh-daily-reports/analysis", { params }).then((res) => res.data),
  rows: (params) => API.get("/wh-daily-reports/rows", { params }).then((res) => res.data),
  upload: (body) => API.post("/wh-daily-reports/upload", body).then((res) => res.data),
  /** The five reports for from..to, from RetailPilot's pick & pack jobs (replacing what was there). */
  pull: (body) => API.post("/wh-daily-reports/pull", body).then((res) => res.data),
  remove: (uploadId) => API.delete(`/wh-daily-reports/uploads/${encodeURIComponent(uploadId)}`).then((res) => res.data),
};

export default WhDailyReportsHelper;
