import API from "../util/api";

const priceChecker = {
  /**
   * GET /price-checker — processed products with incorrect selling prices + meta.
   */
  list: () =>
    new Promise((resolve, reject) => {
      API.get("/price-checker")
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve({
              meta: res.data.meta ?? null,
              data: res.data.data ?? [],
            });
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to fetch price checker data"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * POST /price-checker/bulk — queue replace-all upload; returns job_id.
   */
  bulkReplace: (rows) =>
    new Promise((resolve, reject) => {
      API.post("/price-checker/bulk", rows)
        .then((res) => {
          if (res?.data?.code === 202 && res?.data?.job_id) {
            resolve(res.data);
          } else if (res?.data?.code === 400) {
            reject(new Error(res?.data?.msg ?? "Failed to upload price checker data"));
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to start price checker upload"));
          }
        })
        .catch((err) => reject(err));
    }),

  /**
   * GET /price-checker/jobs/:jobId/status — poll upload progress.
   */
  getJobStatus: (jobId) =>
    new Promise((resolve, reject) => {
      if (!jobId) {
        reject(new Error("jobId is required"));
        return;
      }

      API.get(`/price-checker/jobs/${encodeURIComponent(jobId)}/status`)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data);
          } else if (res?.status === 404 || res?.data?.code === 404) {
            resolve(null);
          } else {
            reject(new Error(res?.data?.msg ?? "Failed to fetch upload status"));
          }
        })
        .catch((err) => {
          if (err?.response?.status === 404) {
            resolve(null);
            return;
          }
          reject(err);
        });
    }),
};

export default priceChecker;
