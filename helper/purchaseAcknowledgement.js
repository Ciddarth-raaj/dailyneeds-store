import API from "../util/api";

/**
 * Purchase Acknowledgement API - see backend docs PURCHASE_ACKNOWLEDGEMENT_APIS.md
 * Base path: /purchase-acknowledgement
 */

export const getPurchaseAcknowledgements = () => {
  return API.get("/purchase-acknowledgement").then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch purchase acknowledgements");
  });
};

export const getPurchaseAcknowledgementById = (id) => {
  return API.get(
    `/purchase-acknowledgement/${encodeURIComponent(id)}`
  ).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data.data;
    if (data?.code === 404) return null;
    throw new Error(data?.msg || "Failed to fetch purchase acknowledgement");
  });
};

export const createPurchaseAcknowledgement = (body) => {
  return API.post("/purchase-acknowledgement", body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to create purchase acknowledgement");
  });
};

export const updatePurchaseAcknowledgement = (id, body) => {
  return API.put(
    `/purchase-acknowledgement/${encodeURIComponent(id)}`,
    body
  ).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to update purchase acknowledgement");
  });
};

export const deletePurchaseAcknowledgement = (id) => {
  return API.delete(
    `/purchase-acknowledgement/${encodeURIComponent(id)}`
  ).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to delete purchase acknowledgement");
  });
};
