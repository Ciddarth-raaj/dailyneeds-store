import API from "../util/api";

export const getAllPurchases = async (filters) => {
  try {
    const response = await API.get(`/purchase`, { params: filters });
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const updatePurchase = async (purchase_id, data) => {
  try {
    const response = await API.put(`/purchase/${purchase_id}`, data);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const updatePurchaseFlags = async (purchaseId, flags) => {
  try {
    console.log("CIDD", { purchaseId, flags });
    const response = await API.put(`/purchase/${purchaseId}/flags`, flags);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const getAllPurchasesFromTally = async (filters) => {
  try {
    const response = await API.get(`/purchase-tally`, { params: filters });
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
