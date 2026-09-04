import API from "../util/api";

function unwrap(promise, fallbackMsg) {
  return promise
    .then((res) => {
      if (res?.data?.code === 200) return res.data;
      const err = new Error(res?.data?.msg ?? fallbackMsg);
      err.response = res;
      throw err;
    })
    .catch((err) => {
      throw err;
    });
}

/**
 * Offers V3 API — item-level and batch-specific offers, both linked to
 * product_table via item_code (product_id). See offers_v3_item,
 * offers_v3_batch, offers_v3_batch_stock, offers_v3_untagged_batches.
 */
const offersV3 = {
  items: {
    list: (status) =>
      unwrap(API.get("/offers-v3/items", { params: status ? { status } : {} }), "Failed to fetch offers").then(
        (d) => d.data ?? []
      ),
    getById: (id) => unwrap(API.get(`/offers-v3/items/${id}`), "Failed to fetch offer").then((d) => d.data),
    create: (data) =>
      unwrap(
        API.post("/offers-v3/items", {
          item_code: Number(data.item_code),
          offer_type: data.offer_type,
          value: Number(data.value),
          threshold_qty: Number(data.threshold_qty),
        }),
        "Failed to create offer"
      ),
    update: (id, data) => {
      const body = {};
      if (data.offer_type !== undefined) body.offer_type = data.offer_type;
      if (data.value !== undefined) body.value = Number(data.value);
      if (data.threshold_qty !== undefined) body.threshold_qty = Number(data.threshold_qty);
      if (data.status !== undefined) body.status = data.status;
      return unwrap(API.put(`/offers-v3/items/${id}`, body), "Failed to update offer");
    },
  },

  batches: {
    list: (filters = {}) =>
      unwrap(API.get("/offers-v3/batches", { params: filters }), "Failed to fetch batch offers").then(
        (d) => d.data ?? []
      ),
    getById: (id) => unwrap(API.get(`/offers-v3/batches/${id}`), "Failed to fetch batch offer").then((d) => d.data),

    /** The batches on file for an item across the given outlets, to pick rather than type. */
    available: (item_code, outlet_ids) =>
      unwrap(
        API.get("/offers-v3/available-batches", {
          params: { item_code, outlet_ids: (outlet_ids ?? []).join(",") },
        }),
        "Failed to fetch batches for this item"
      ).then((d) => d.data ?? []),

    /** The same batch offer across several outlets; reports each outlet's outcome. */
    createForOutlets: (data) =>
      unwrap(
        API.post("/offers-v3/batches/bulk", {
          item_code: Number(data.item_code),
          outlet_ids: (data.outlet_ids ?? []).map(Number),
          batch_no: data.batch_no,
          offer_type: data.offer_type,
          value: Number(data.value),
        }),
        "Failed to create batch offers"
      ),
    create: (data) =>
      unwrap(
        API.post("/offers-v3/batches", {
          item_code: Number(data.item_code),
          outlet_id: Number(data.outlet_id),
          batch_no: data.batch_no,
          offer_type: data.offer_type,
          value: Number(data.value),
        }),
        "Failed to create batch offer"
      ),
    update: (id, data) => {
      const body = {};
      if (data.offer_type !== undefined) body.offer_type = data.offer_type;
      if (data.value !== undefined) body.value = Number(data.value);
      if (data.status !== undefined) body.status = data.status;
      return unwrap(API.put(`/offers-v3/batches/${id}`, body), "Failed to update batch offer");
    },
    end: (id) => unwrap(API.post(`/offers-v3/batches/${id}/end`, {}), "Failed to end batch offer"),
  },

  stockUpload: (rows) =>
    unwrap(
      API.post(
        "/offers-v3/stock-upload",
        rows.map((r) => ({
          item_code: r.item_code,
          outlet: r.outlet,
          batch_no: r.batch_no,
          stock_qty: r.stock_qty,
        }))
      ),
      "Failed to upload stock"
    ),

  /**
   * Price Checker-style export (Item Code, Outlet, Batch No, MRP, Selling
   * Price). The frontend column mapping must always source mrp/selling_price
   * from Old_MRP/Old_Selling_Price — a fixed rule, not auto-detected.
   */
  priceUpload: (rows) =>
    unwrap(
      API.post(
        "/offers-v3/price-upload",
        rows.map((r) => ({
          item_code: r.item_code,
          outlet: r.outlet,
          batch_no: r.batch_no,
          mrp: r.mrp,
          selling_price: r.selling_price,
          landing_cost: r.landing_cost,
        }))
      ),
      "Failed to upload price data"
    ),

  untaggedBatches: {
    list: () => unwrap(API.get("/offers-v3/untagged-batches"), "Failed to fetch untagged batches").then((d) => d.data ?? []),
    dismiss: (id) => unwrap(API.post(`/offers-v3/untagged-batches/${id}/dismiss`, {}), "Failed to dismiss"),
    dismissAll: () => unwrap(API.post("/offers-v3/untagged-batches/dismiss-all", {}), "Failed to dismiss all"),
  },

  lowStockWarnings: {
    list: () => unwrap(API.get("/offers-v3/low-stock-warnings"), "Failed to fetch low-stock warnings").then((d) => d.data ?? []),
    dismiss: (id) => unwrap(API.post(`/offers-v3/low-stock-warnings/${id}/dismiss`, {}), "Failed to dismiss"),
  },

  mismatches: () => unwrap(API.get("/offers-v3/mismatches"), "Failed to fetch mismatches").then((d) => d.data ?? []),

  /**
   * GET /offers-v3/items-by-product?product_id= — grouped batches for one
   * item from the latest Price Upload. Same shape as
   * priceChecker.getItemsByProduct, used by the GRN Price Checker modal.
   */
  getItemsByProduct: (productId) =>
    new Promise((resolve, reject) => {
      if (productId == null || productId === "") {
        reject(new Error("product_id is required"));
        return;
      }

      API.get("/offers-v3/items-by-product", { params: { product_id: productId } })
        .then((res) => {
          const data = res?.data ?? res;
          if (data?.code === 200) {
            resolve(data);
            return;
          }
          reject(new Error(data?.msg ?? "Failed to fetch price upload items"));
        })
        .catch((err) => reject(err));
    }),

  /**
   * GET /offers-v3/items-by-product/outlet-breakdown?product_id=&mrp=&selling_price=
   * Outlet/batch-level breakdown of one merged (mrp, selling_price) row from
   * getItemsByProduct — drill-down for the GRN Price Checker modal.
   */
  getOutletStockBreakdown: (productId, mrp, sellingPrice) =>
    new Promise((resolve, reject) => {
      if (productId == null || productId === "" || mrp == null || sellingPrice == null) {
        reject(new Error("product_id, mrp and selling_price are required"));
        return;
      }

      API.get("/offers-v3/items-by-product/outlet-breakdown", {
        params: { product_id: productId, mrp, selling_price: sellingPrice },
      })
        .then((res) => {
          const data = res?.data ?? res;
          if (data?.code === 200) {
            resolve(data);
            return;
          }
          reject(new Error(data?.msg ?? "Failed to fetch outlet stock breakdown"));
        })
        .catch((err) => reject(err));
    }),

  uploadMeta: () => unwrap(API.get("/offers-v3/upload-meta"), "Failed to fetch upload meta").then((d) => d.data ?? {}),

  import: (rows) => unwrap(API.post("/offers-v3/import", rows), "Failed to import offers"),
};

export default offersV3;
