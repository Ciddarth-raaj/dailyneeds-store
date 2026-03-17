import API from "../util/api";

const stockTransferOut = {
  /**
   * Get all stock transfers (list).
   * GET /stock-transfer-out
   * @returns {Promise<Array>} Array of transfers (header + items each)
   */
  getStockTransfers: ({ is_checked }) =>
    new Promise((resolve, reject) => {
      const params = {};
      if (is_checked != null) {
        params.is_checked = is_checked;
      }
      API.get("/stock-transfer-out", { params })
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data ?? []);
          } else {
            reject(res?.data?.msg ?? "Failed to fetch stock transfers");
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Get one stock transfer by Dn_no.
   * GET /stock-transfer-out/:Dn_no
   * @param {number|string} dnNo - Transfer primary key
   * @returns {Promise<Object>} Single transfer (header + items)
   */
  getStockTransferByDnNo: (dnNo) =>
    new Promise((resolve, reject) => {
      if (dnNo == null || dnNo === "") {
        reject(new Error("Dn_no is required"));
        return;
      }
      API.get(`/stock-transfer-out/${dnNo}`)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data);
          } else {
            reject(res?.data?.msg ?? "Failed to fetch stock transfer");
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * Get stock transfers by reference number Dn_Ref_no.
   * GET /stock-transfer-out/by-ref/:Dn_Ref_no
   * @param {number|string} dnRefNo - Reference number
   * @returns {Promise<Array>} Array of transfers (header + items each)
   */
  getStockTransferByRefId: (dnRefNo) =>
    new Promise((resolve, reject) => {
      if (dnRefNo == null || dnRefNo === "") {
        reject(new Error("Dn_Ref_no is required"));
        return;
      }
      API.get(`/stock-transfer-out/by-ref/${dnRefNo}`)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data.data ?? []);
          } else {
            reject(res?.data?.msg ?? "Failed to fetch stock transfers by ref");
          }
        })
        .catch((err) => reject(err));
    }),
};

export default stockTransferOut;
