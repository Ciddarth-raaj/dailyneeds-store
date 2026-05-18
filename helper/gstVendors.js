import API from "../util/api";

/**
 * GST vendors API.
 * @see dailyneeds-store-backend/docs/gst-vendors-get-all.md
 */
export const getGstVendors = () => {
  return API.get("/gst/vendors").then((res) => {
    const body = res?.data ?? res;
    if (body?.code === 200) return body;
    throw new Error(body?.msg || "Failed to fetch GST vendors");
  });
};

/**
 * All rows from `vendor_filing_date` (see backend `GET /gst/vendor-filing-dates`).
 * @see dailyneeds-store-backend/docs/gst-api-endpoints.md
 */
export const getVendorFilingDates = () => {
  return API.get("/gst/vendor-filing-dates").then((res) => {
    const body = res?.data ?? res;
    if (body?.code === 200) return body;
    throw new Error(body?.msg || "Failed to fetch vendor filing dates");
  });
};

/** Latest row from `gst_fetch_log` (most recent GSTR sync). */
export const getLatestGstFetchLog = () => {
  return API.get("/gst/fetch-log/latest").then((res) => {
    const body = res?.data ?? res;
    if (body?.code === 200) return body;
    throw new Error(body?.msg || "Failed to fetch latest GST sync time");
  });
};

/**
 * Pull GSTR-2A B2B from Sandbox for a return period (persists filing dates when successful).
 * @see dailyneeds-store-backend/docs/gst-api-endpoints.md
 */
export function syncGstr2aB2b(year, month) {
  const y = String(year).trim();
  const m = String(month).trim().padStart(2, "0");
  return API.get(`/gst/gstr-2a/b2b/${y}/${m}`, {
    validateStatus: () => true,
  }).then((res) => {
    const body = res?.data ?? res;
    const status = res.status;
    if (status === 428) {
      throw new Error(
        body?.msg ||
          "GST portal session needs OTP. Open any GST page and complete verification first."
      );
    }
    if (status !== 200) {
      throw new Error(body?.msg || `Sync failed (HTTP ${status})`);
    }
    if (body?.code !== 200) {
      throw new Error(body?.msg || "Sync failed");
    }
    return body;
  });
}
