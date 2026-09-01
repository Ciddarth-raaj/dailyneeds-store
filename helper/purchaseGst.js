import API from "../util/api";

/**
 * GST tally purchases (`gst_tally_purchase` / `gst_tally_purchase_internal`).
 * @see dailyneeds-store-backend/docs/purchase-gst-api.md
 */

export const getAllPurchaseGst = async (filters) => {
  try {
    const response = await API.get("/purchase-gst", { params: filters });
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const getPurchaseGstById = async (gstTallyPurchaseId) => {
  try {
    const response = await API.get(
      `/purchase-gst/${encodeURIComponent(String(gstTallyPurchaseId))}`
    );
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

/** Remove a purchase Tally no longer has. Tally-sourced rows only. */
export const deletePurchaseGst = async (gstTallyPurchaseId) => {
  try {
    const response = await API.delete(
      `/purchase-gst/${encodeURIComponent(String(gstTallyPurchaseId))}`
    );
    return response.data;
  } catch (err) {
    const body = err?.response?.data;
    if (body) return body;
    throw err;
  }
};
