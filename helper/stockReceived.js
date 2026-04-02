import API from "../util/api";

const body = (res) => res?.data;

const stockReceived = {
  /**
   * GET /stock-received/gofrugal-dtl?pending_only=
   * @param {boolean} pendingOnly
   */
  listGofrugalDtl: (pendingOnly = false) =>
    new Promise((resolve, reject) => {
      const q = pendingOnly ? "true" : "false";
      API.get(`/stock-received/gofrugal-dtl?pending_only=${q}`)
        .then((res) => {
          const b = body(res);
          if (b?.code === 200) {
            resolve(Array.isArray(b.data) ? b.data : []);
          } else {
            reject(new Error(b?.msg ?? "Failed to load receiving stock"));
          }
        })
        .catch(reject);
    }),

  /**
   * POST /stock-received/upsert
   */
  upsert: (payload) =>
    new Promise((resolve, reject) => {
      API.post("/stock-received/upsert", payload)
        .then((res) => {
          const b = body(res);
          if (b?.code === 200) {
            resolve(b.data);
          } else {
            reject(new Error(b?.msg ?? "Save failed"));
          }
        })
        .catch(reject);
    }),

  /**
   * DELETE /stock-received/:stock_received_id
   */
  remove: (stockReceivedId) =>
    new Promise((resolve, reject) => {
      API.delete(`/stock-received/${stockReceivedId}`)
        .then((res) => {
          const b = body(res);
          if (b?.code === 200) {
            resolve(b);
          } else {
            reject(new Error(b?.msg ?? "Delete failed"));
          }
        })
        .catch(reject);
    }),
};

export default stockReceived;
