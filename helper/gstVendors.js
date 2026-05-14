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
