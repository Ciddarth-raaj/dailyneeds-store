import API from "../util/api";

/**
 * Product Distributors API - see backend docs PURCHASE_RETURN_AND_PRODUCT_DISTRIBUTORS_APIS.md
 * Base path: /product-distributors
 * Data: medishopdb_MED_DISTRIBUTOR_MAST (MDM_DIST_CODE, MDM_DIST_NAME, MDM_SHORT_NAME)
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

export const createProductDistributor = (body) => {
  return API.post("/product-distributors", body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to create distributor");
  });
};

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
