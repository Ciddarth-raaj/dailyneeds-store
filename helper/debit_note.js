import API from "../util/api";

export const getAllDebitNote = async (filters) => {
  try {
    const response = await API.get(`/debit-note`, { params: filters });
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const updateDebitNote = async (purchase_id, data) => {
  try {
    const response = await API.put(`/debit-note/${purchase_id}`, data);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const updateDebitNoteFlags = async (purchaseId, flags) => {
  try {
    const response = await API.put(`/debit-note/${purchaseId}/flags`, flags);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const getAllDebitNoteFromTally = async (filters) => {
  try {
    const response = await API.get(`/purchase-tally`, { params: filters });
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
