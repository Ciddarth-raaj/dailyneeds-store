import API from "../util/api";

/**
 * STO Check API – sto_check records (file qty per dn_ref_no and product_id).
 * @see docs/sto-check-api.md
 */
const stoCheck = {
  /**
   * List all sto_check records.
   * GET /sto-check
   */
  list: () =>
    new Promise((resolve, reject) => {
      API.get("/sto-check")
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data ?? []);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to fetch STO check list"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * List by dn_ref_no.
   * GET /sto-check/by-ref/:dn_ref_no
   */
  listByRef: (dnRefNo) =>
    new Promise((resolve, reject) => {
      if (dnRefNo == null || dnRefNo === "") {
        reject(new Error("dn_ref_no is required"));
        return;
      }
      API.get(`/sto-check/by-ref/${dnRefNo}`)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data ?? []);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to fetch by ref"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Create / update (replace) one ref's items.
   * PUT /sto-check
   * Body: { dn_ref_no: number, items: [{ product_id, file_qty? }] }
   */
  createOrReplace: (dnRefNo, items) =>
    new Promise((resolve, reject) => {
      if (dnRefNo == null || dnRefNo === "") {
        reject(new Error("dn_ref_no is required"));
        return;
      }
      API.put("/sto-check", {
        dn_ref_no: Number(dnRefNo),
        items: Array.isArray(items) ? items : [],
      })
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to save STO check"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Bulk replace: replace items for multiple refs.
   * POST /sto-check/bulk
   * Body: [{ dn_ref_no: number, items: [{ product_id, file_qty? }] }, ...]
   * Response: { code: 200, results: [{ dn_ref_no, code, inserted }, ...] }
   */
  bulkReplace: (payloads) =>
    new Promise((resolve, reject) => {
      if (!Array.isArray(payloads)) {
        reject(new Error("payloads must be an array"));
        return;
      }

      API.post("/sto-check/bulk", payloads)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to bulk save STO check"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Delete all rows for a dn_ref_no.
   * DELETE /sto-check/:dn_ref_no
   */
  deleteByRef: (dnRefNo) =>
    new Promise((resolve, reject) => {
      if (dnRefNo == null || dnRefNo === "") {
        reject(new Error("dn_ref_no is required"));
        return;
      }
      API.delete(`/sto-check/${dnRefNo}`)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to delete"));
          }
        })
        .catch((err) => reject(err));
    }),
};

export default stoCheck;
