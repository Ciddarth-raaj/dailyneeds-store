import API from "../util/api";

/**
 * Product Distributors API — Gofrugal master + main-DB buyer mapping.
 * @see dailyneeds-store-backend/docs/product_distributor_changes.md
 * Base path: /product-distributors
 * GET responses include buyer_id, buyer_name. POST body upserts mapping only.
 */

export const getProductDistributors = () => {
  return API.get("/product-distributors").then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch distributors");
  });
};

export const getProductDistributorByCode = (code) => {
  return API.get(
    `/product-distributors/${encodeURIComponent(code)}`
  ).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data.data;
    if (data?.code === 404) return null;
    throw new Error(data?.msg || "Failed to fetch distributor");
  });
};

/** Upsert buyer mapping: { MDM_DIST_CODE, buyer_id?: number|null } */
export const upsertProductDistributorMapping = (body) => {
  return API.post("/product-distributors", body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to save buyer assignment");
  });
};

/** @deprecated Use upsertProductDistributorMapping — POST only assigns buyer; does not create ERP rows */
export const createProductDistributor = upsertProductDistributorMapping;

export const updateProductDistributor = (code, body) => {
  return API.put(
    `/product-distributors/${encodeURIComponent(code)}`,
    body
  ).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to update distributor");
  });
};

export const deleteProductDistributor = (code) => {
  return API.delete(
    `/product-distributors/${encodeURIComponent(code)}`
  ).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to delete distributor");
  });
};
