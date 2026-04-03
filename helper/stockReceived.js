import API from "../util/api";

const body = (res) => res?.data;

const stockReceived = {
  /**
   * GET /stock-received/gofrugal-dtl?pending_only=&days_buffer=
   * @param {boolean} pendingOnly
   * @param {number} [daysBuffer] default 0, max 3650
   * @returns {Promise<{ data: Array, meta: object }>}
   */
  listGofrugalDtl: (pendingOnly = false, daysBuffer = 0) =>
    new Promise((resolve, reject) => {
      const q = pendingOnly ? "true" : "false";
      const d = Math.min(3650, Math.max(0, Math.floor(Number(daysBuffer) || 0)));
      API.get(
        `/stock-received/gofrugal-dtl?pending_only=${q}&days_buffer=${d}`
      )
        .then((res) => {
          const b = body(res);
          if (b?.code === 200) {
            resolve({
              data: Array.isArray(b.data) ? b.data : [],
              meta: b.meta && typeof b.meta === "object" ? b.meta : {},
            });
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
