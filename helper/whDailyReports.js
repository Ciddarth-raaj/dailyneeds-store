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
  /** RetailPilot user ids with what they did and where, their employee, and the employees to choose from. */
  staff: () => API.get("/wh-daily-reports/staff").then((res) => res.data),
  /** Map (employee_id) or unmap (null) one RetailPilot user id. */
  mapStaff: (rpUserId, body) => API.put(`/wh-daily-reports/staff/${encodeURIComponent(rpUserId)}`, body).then((res) => res.data),
  /** NLC from RetailPilot on rows from..to that have none. */
  fillNlc: (body) => API.post("/wh-daily-reports/fill-nlc", body).then((res) => res.data),
  /** Warehouse Health (`routes/warehouse_health.js`): the day's dashboard (default yesterday). view_warehouse_health */
  health: (params) => API.get("/warehouse-health", { params }).then((res) => res.data),
  /** Yesterday's Warehouse Health summary to my own Telegram. */
  sendHealthToMe: () => API.post("/warehouse-health/summary/send-me").then((res) => res.data),
  remove: (uploadId) => API.delete(`/wh-daily-reports/uploads/${encodeURIComponent(uploadId)}`).then((res) => res.data),
};

export default WhDailyReportsHelper;
