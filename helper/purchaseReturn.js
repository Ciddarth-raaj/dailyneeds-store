import API from "../util/api";

/**
 * Purchase Return API - see backend docs PURCHASE_RETURN_APIS.md
 * Base path: /purchase-return
 */

export const getPurchaseReturns = () => {
  return API.get("/purchase-return").then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch purchase returns");
  });
};

/**
 * Get purchase returns for a distributor (open only). See PURCHASE_ACKNOWLEDGEMENT_APIS.md.
 * @param {string} distributorId - MDM_DIST_CODE / mprh_dist_code
 * @param {string} purchaseAcknowledgementId - Purchase acknowledgement ID
 */
export const getPurchaseReturnsByDistributor = (distributorId, purchaseAcknowledgementId) => {
  return API.get(
    `/purchase-return/by-distributor/${encodeURIComponent(distributorId)}?purchase_acknowledgement_id=${purchaseAcknowledgementId != null ? encodeURIComponent(purchaseAcknowledgementId) : ""}`
  ).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch purchase returns by distributor");
  });
};

export const getPurchaseReturnById = (mprh_pr_no) => {
  return API.get(`/purchase-return/${encodeURIComponent(mprh_pr_no)}`).then(
    (res) => {
      const data = res?.data ?? res;
      if (data?.code === 200) return data.data;
      if (data?.code === 404) return null;
      throw new Error(data?.msg || "Failed to fetch purchase return");
    }
  );
};

/**
 * Create purchase_return_extra for a given mprh_pr_no.
 * Distributor comes from header (mprh_dist_code); extra table has no distributor_id.
 * @param {Object} body - { mprh_pr_no, no_of_boxes?, status?, created_by? }
 */
export const createPurchaseReturnExtra = (body) => {
  return API.post("/purchase-return/extra", body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to create purchase return extra");
  });
};

/**
 * Update purchase_return_extra for a given mprh_pr_no.
 * @param {string} mprh_pr_no
 * @param {Object} body - { no_of_boxes?, status?, purchase_acknowledgement_id? }
 */
export const updatePurchaseReturnExtra = (mprh_pr_no, body) => {
  return API.put(
    `/purchase-return/extra/${encodeURIComponent(mprh_pr_no)}`,
    body
  ).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to update purchase return extra");
  });
};
