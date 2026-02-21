import API from "../util/api";

/**
 * Product Image Log API - see backend docs/product-image-log-api.md
 */

/**
 * Get all log entries with optional filters.
 * @param {Object} params - { product_id, created_by, date_from, date_to, limit, offset }
 * @returns {Promise<{ data: Array }>}
 */
export function getProductImageLogs(params = {}) {
  const search = new URLSearchParams();
  if (params.product_id != null) search.set("product_id", params.product_id);
  if (params.created_by != null) search.set("created_by", params.created_by);
  if (params.date_from) search.set("date_from", params.date_from);
  if (params.date_to) search.set("date_to", params.date_to);
  if (params.limit != null) search.set("limit", params.limit);
  if (params.offset != null) search.set("offset", params.offset);
  const qs = search.toString();
  return API.get(`/product-image-log${qs ? `?${qs}` : ""}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to fetch product image logs");
  });
}

/**
 * Get a single log entry by ID.
 * @param {number} id - product_image_log_id
 */
export function getProductImageLogById(id) {
  return API.get(`/product-image-log/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    if (res.data?.code === 404) return null;
    throw new Error(res.data?.msg || "Failed to fetch product image log");
  });
}
