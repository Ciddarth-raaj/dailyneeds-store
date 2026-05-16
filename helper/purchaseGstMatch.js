import API from "../util/api";

/**
 * @see dailyneeds-store-backend/docs/purchase-gst-match-api.md
 */

export const getAllPurchaseGstMatches = async (filters) => {
  try {
    const response = await API.get("/purchase-gst-match", { params: filters });
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const upsertPurchaseGstMatch = async (body) => {
  try {
    const response = await API.post("/purchase-gst-match", body);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const deletePurchaseGstMatch = async (gstPurchaseMatchId) => {
  try {
    const response = await API.delete(
      `/purchase-gst-match/${encodeURIComponent(String(gstPurchaseMatchId))}`
    );
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
