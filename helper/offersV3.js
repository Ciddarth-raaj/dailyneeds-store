import API from "../util/api";

/**
 * Offers V3 API – offers_v3 (item_code, item_name, offer_type, value, is_active).
 * Standalone offer model, not linked to product_table / HQ offers.
 */
const offersV3 = {
  /**
   * List all offers.
   * GET /offers-v3
   */
  list: () =>
    new Promise((resolve, reject) => {
      API.get("/offers-v3")
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data ?? []);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to fetch offers"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Get one offer by id.
   * GET /offers-v3/:id
   */
  getById: (id) =>
    new Promise((resolve, reject) => {
      if (id == null || id === "") {
        reject(new Error("id is required"));
        return;
      }
      API.get(`/offers-v3/${id}`)
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
   * POST /offers-v3
   * Body: { item_code, item_name, offer_type, value, is_active? }
   */
  create: (data) =>
    new Promise((resolve, reject) => {
      API.post("/offers-v3", {
        item_code: data.item_code,
        item_name: data.item_name,
        offer_type: data.offer_type,
        value: Number(data.value),
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
   * Bulk insert/update offers (upsert by item_code).
   * POST /offers-v3/bulk
   * Body: [{ item_code, item_name, offer_type, value, is_active? }, ...]
   */
  bulkInsert: (items) =>
    new Promise((resolve, reject) => {
      if (!Array.isArray(items) || items.length === 0) {
        reject(new Error("items must be a non-empty array"));
        return;
      }
      const payload = items.map((row) => ({
        item_code: row.item_code,
        item_name: row.item_name,
        offer_type: row.offer_type,
        value: Number(row.value),
        is_active: row.is_active !== false,
      }));
      API.post("/offers-v3/bulk", payload)
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
   * PUT /offers-v3/:id
   */
  update: (id, data) =>
    new Promise((resolve, reject) => {
      if (id == null || id === "") {
        reject(new Error("id is required"));
        return;
      }
      const body = {};
      if (data.item_code !== undefined) body.item_code = data.item_code;
      if (data.item_name !== undefined) body.item_name = data.item_name;
      if (data.offer_type !== undefined) body.offer_type = data.offer_type;
      if (data.value !== undefined) body.value = Number(data.value);
      if (data.is_active !== undefined) body.is_active = Boolean(data.is_active);
      if (Object.keys(body).length === 0) {
        reject(new Error("At least one field required"));
        return;
      }
      API.put(`/offers-v3/${id}`, body)
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
   * DELETE /offers-v3/:id
   */
  delete: (id) =>
    new Promise((resolve, reject) => {
      if (id == null || id === "") {
        reject(new Error("id is required"));
        return;
      }
      API.delete(`/offers-v3/${id}`)
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
   * DELETE /offers-v3/bulk
   * Body: { ids: [number, ...] }
   */
  bulkDelete: (ids) =>
    new Promise((resolve, reject) => {
      if (!Array.isArray(ids) || ids.length === 0) {
        reject(new Error("ids must be a non-empty array"));
        return;
      }
      API.delete("/offers-v3/bulk", {
        data: { ids: ids.map(Number) },
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

export default offersV3;
