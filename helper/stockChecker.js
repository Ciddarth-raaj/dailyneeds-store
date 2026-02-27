import API from "../util/api";

/**
 * Stock Checker API - see backend STOCK_CHECKER_API.md
 * Base path: /stock-checker
 */

export const getStockCheckers = () => {
  return API.get("/stock-checker").then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch stock checkers");
  });
};

export const getStockCheckerById = (id) => {
  return API.get(`/stock-checker/${id}`).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data.data;
    if (data?.code === 404) return null;
    throw new Error(data?.msg || "Failed to fetch stock checker");
  });
};

export const createStockChecker = (body) => {
  return API.post("/stock-checker", body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to create stock checker");
  });
};

export const updateStockChecker = (id, body) => {
  return API.put(`/stock-checker/${id}`, body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to update stock checker");
  });
};

export const deleteStockChecker = (id) => {
  return API.delete(`/stock-checker/${id}`).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to delete stock checker");
  });
};

/**
 * Create or update a stock checker item (upsert).
 * POST /stock-checker/items
 * Body: { stock_checker_id, branch_id, physical_stock, system_stock }
 */
export const createOrUpdateStockCheckerItem = (body) => {
  return API.post("/stock-checker/items", body).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to save stock checker item");
  });
};
