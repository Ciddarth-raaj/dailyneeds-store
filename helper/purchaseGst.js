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
