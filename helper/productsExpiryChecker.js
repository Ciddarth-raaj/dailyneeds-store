import API from "../util/api";

/**
 * Products Expiry Checker API - see backend products_expiry_checker_api.md
 * Base path: /products-expiry-checker
 */

export const getProductsExpiryCheckers = () => {
  return API.get("/products-expiry-checker").then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch products expiry checkers");
  });
};

export const getProductsExpiryCheckerById = (id) => {
  return API.get(`/products-expiry-checker/${id}`).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data.data;
    if (data?.code === 404) return null;
    throw new Error(data?.msg || "Failed to fetch products expiry checker");
  });
};

export const createProductsExpiryChecker = (body) => {
  return API.post("/products-expiry-checker", body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to create products expiry checker");
  });
};

export const updateProductsExpiryChecker = (id, body) => {
  return API.put(`/products-expiry-checker/${id}`, body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to update products expiry checker");
  });
};

export const deleteProductsExpiryChecker = (id) => {
  return API.delete(`/products-expiry-checker/${id}`).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to delete products expiry checker");
  });
};

/**
 * Upsert one item (insert or update by checker id + branch id).
 * POST /products-expiry-checker/items
 * Body: { products_expiry_checker_id, branch_id, qty, is_verified? }
 */
export const createOrUpdateExpiryCheckerItem = (body) => {
  return API.post("/products-expiry-checker/items", body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to save expiry checker item");
  });
};
