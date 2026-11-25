import API from "../util/api";

/**
 * Purchases accepted as never appearing in GSTR-2A (zero-tax suppliers).
 */

export const getAllPurchaseGstNo2a = async (filters) => {
  try {
    const response = await API.get("/purchase-gst-no-2a", { params: filters });
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const acceptPurchaseGstNo2a = async (body) => {
  try {
    const response = await API.post("/purchase-gst-no-2a", body);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const deletePurchaseGstNo2a = async (gstTallyPurchaseId) => {
  try {
    const response = await API.delete(
      `/purchase-gst-no-2a/${encodeURIComponent(String(gstTallyPurchaseId))}`
    );
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
