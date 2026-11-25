import API from "../util/api";

/**
 * PO Tracker (`routes/po_tracker.js` on the server), live from RetailPilot:
 * behind view_po_tracker; adding a follow-up needs add_po_followup. Refusals arrive as `{ code, msg }`.
 */
const PoTrackerHelper = {
  list: (params) => API.get("/po-tracker", { params }).then((res) => res.data),
  followups: (slug) => API.get(`/po-tracker/${encodeURIComponent(slug)}/followups`).then((res) => res.data),
  sendSummaryToMe: () => API.post("/po-tracker/daily-summary/send-me").then((res) => res.data),
  addFollowup: (slug, body) => API.post(`/po-tracker/${encodeURIComponent(slug)}/followups`, body).then((res) => res.data),
};

export default PoTrackerHelper;
