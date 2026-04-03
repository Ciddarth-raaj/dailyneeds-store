import API from "../util/api";

/**
 * Product Offers API – product_offers (mrp, selling_price, opening_stock, is_active per product_id).
 * @see dailyneeds-store-backend/docs/product-offers-api.md
 */
const productOffers = {
  /**
   * List all offers.
   * GET /product-offers
   */
  list: () =>
    new Promise((resolve, reject) => {
      API.get("/product-offers")
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data ?? []);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to fetch product offers"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Get one offer by product_id.
   * GET /product-offers/:product_id
   */
  getByProductId: (productId) =>
    new Promise((resolve, reject) => {
      if (productId == null || productId === "") {
        reject(new Error("product_id is required"));
        return;
      }
      API.get(`/product-offers/${productId}`)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to fetch offer"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Create a single offer.
   * POST /product-offers
   * Body: { product_id, mrp?, selling_price?, opening_stock?, is_active? }
   */
  create: (data) =>
    new Promise((resolve, reject) => {
      API.post("/product-offers", {
        product_id: Number(data.product_id),
        mrp: data.mrp != null ? Number(data.mrp) : null,
        selling_price: data.selling_price != null ? Number(data.selling_price) : null,
        opening_stock:
          data.opening_stock != null && data.opening_stock !== ""
            ? Number(data.opening_stock)
            : 0,
        is_active: data.is_active !== false,
      })
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to create offer"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Bulk insert/update offers.
   * POST /product-offers/bulk
   * Body: [{ product_id, mrp?, selling_price?, opening_stock?, is_active? }, ...]
   */
  bulkInsert: (items) =>
    new Promise((resolve, reject) => {
      if (!Array.isArray(items) || items.length === 0) {
        reject(new Error("items must be a non-empty array"));
        return;
      }
      const payload = items.map((row) => ({
        product_id: Number(row.product_id),
        mrp: row.mrp != null ? Number(row.mrp) : null,
        selling_price: row.selling_price != null ? Number(row.selling_price) : null,
        opening_stock:
          row.opening_stock != null && row.opening_stock !== ""
            ? Number(row.opening_stock)
            : 0,
        is_active: row.is_active !== false,
      }));
      API.post("/product-offers/bulk", payload)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to bulk insert offers"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Update offer (partial).
   * PUT /product-offers/:product_id
   */
  update: (productId, data) =>
    new Promise((resolve, reject) => {
      if (productId == null || productId === "") {
        reject(new Error("product_id is required"));
        return;
      }
      const body = {};
      if (data.mrp !== undefined) body.mrp = Number(data.mrp);
      if (data.selling_price !== undefined) body.selling_price = Number(data.selling_price);
      if (data.opening_stock !== undefined) {
        body.opening_stock =
          data.opening_stock === "" || data.opening_stock == null
            ? null
            : Number(data.opening_stock);
      }
      if (data.is_active !== undefined) body.is_active = Boolean(data.is_active);
      if (Object.keys(body).length === 0) {
        reject(new Error("At least one field required"));
        return;
      }
      API.put(`/product-offers/${productId}`, body)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to update offer"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Delete one offer.
   * DELETE /product-offers/:product_id
   */
  delete: (productId) =>
    new Promise((resolve, reject) => {
      if (productId == null || productId === "") {
        reject(new Error("product_id is required"));
        return;
      }
      API.delete(`/product-offers/${productId}`)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to delete offer"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Bulk delete.
   * DELETE /product-offers/bulk
   * Body: { product_ids: [number, ...] }
   */
  bulkDelete: (productIds) =>
    new Promise((resolve, reject) => {
      if (!Array.isArray(productIds) || productIds.length === 0) {
        reject(new Error("product_ids must be a non-empty array"));
        return;
      }
      API.delete("/product-offers/bulk", {
        data: { product_ids: productIds.map(Number) },
      })
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to bulk delete"));
          }
        })
        .catch((err) => reject(err));
    }),
};

export default productOffers;
