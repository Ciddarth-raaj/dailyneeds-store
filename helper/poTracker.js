import API from "../util/api";

/**
 * PO Tracker (`routes/po_tracker.js` on the server), live from RetailPilot:
 * behind view_purchase_order. Refusals arrive as `{ code, msg }`.
 */
const PoTrackerHelper = {
  list: (params) => API.get("/po-tracker", { params }).then((res) => res.data),
};

export default PoTrackerHelper;
