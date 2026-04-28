import API from "../util/api";
import constants from "../constants/api";

const product = {
  // Create or update product
  createProduct: (data) =>
    new Promise(function (resolve, reject) {
      API.post("/product/create", data)
        .then(async (res) => {
          if (
            res.status === 200 ||
            res.data.code === 200 ||
            res.data.code === 101
          ) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to create product");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Get all products (limited - first 30)
  getAll: () =>
    new Promise(function (resolve, reject) {
      API.get(`/product/all`)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to fetch products");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Get products with pagination
  getProduct: (limit, offset, fetchNonOnline = false) =>
    new Promise(function (resolve, reject) {
      API.get(`/product?limit=${limit}&offset=${offset}&fetchAll=${fetchNonOnline}`)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to fetch products");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Get product count
  getProductCount: () =>
    new Promise(function (resolve, reject) {
      API.get("/product/prodcount")
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to fetch product count");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Get product by ID
  getProductById: (product_id) =>
    new Promise(function (resolve, reject) {
      API.get(`/product/product_id?product_id=${product_id}`)
        .then(async (res) => {
          if (res.status === 200) {
            // API returns array with single product
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to fetch product");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Filter products by search term
  getFilteredProduct: (filter, limit, offset) =>
    new Promise(function (resolve, reject) {
      API.get(
        `/product/filter?filter=${encodeURIComponent(
          filter
        )}&limit=${limit}&offset=${offset}`
      )
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to filter products");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Update product details and/or images
  updateProductDetails: (data) =>
    new Promise(function (resolve, reject) {
      API.post("/product/updatedata", data)
        .then(async (res) => {
          if (res.status === 200 || res.data.code === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to update product");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Alias for backward compatibility
  updateProduct: (data) =>
    new Promise(function (resolve, reject) {
      API.post("/product/updatedata", data)
        .then(async (res) => {
          if (res.status === 200 || res.data.code === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to update product");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Trigger product sync (Delium/GoFrugal)
  sync: () =>
    new Promise(function (resolve, reject) {
      API.post("/product/sync")
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data);
          } else {
            reject(res?.data?.msg || "Product sync failed");
          }
        })
        .catch((err) => reject(err));
    }),

  // Start product images bulk ZIP job.
  startImagesDownload: () =>
    new Promise((resolve, reject) => {
      API.post("/product/images/download/start")
        .then((res) => {
          if (res?.data?.code === 202 || res?.data?.code === 200) {
            resolve(res.data?.progress ?? null);
          } else {
            reject(new Error(res?.data?.message ?? "Failed to start download"));
          }
        })
        .catch((err) => reject(err));
    }),

  // Poll status by job id.
  getImagesDownloadStatus: (jobId) =>
    new Promise((resolve, reject) => {
      API.get(`/product/images/download/status?jobId=${encodeURIComponent(jobId)}`)
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve(res.data?.progress ?? null);
          } else {
            const err = new Error(
              res?.data?.message ?? res?.data?.msg ?? "Failed to fetch status"
            );
            err.status = res?.status;
            err.code = res?.data?.code;
            reject(err);
          }
        })
        .catch((err) => {
          const mapped = new Error(
            err?.message ?? "Failed to fetch status"
          );
          mapped.status = err?.response?.status;
          mapped.code = err?.response?.data?.code;
          reject(mapped);
        });
    }),

  // Get active image download job for current user/session.
  getActiveImagesDownloadJob: () =>
    new Promise((resolve, reject) => {
      API.get("/product/images/download/active-job")
        .then((res) => {
          if (res?.data?.code === 200) {
            resolve({
              has_active_job: Boolean(res.data?.has_active_job),
              job_id: res.data?.job_id ?? null,
              progress: res.data?.progress ?? null,
            });
          } else {
            reject(
              new Error(res?.data?.message ?? "Failed to fetch active job")
            );
          }
        })
        .catch((err) => reject(err));
    }),

  // Request cancellation for active image download job.
  cancelImagesDownload: (jobId) =>
    new Promise((resolve, reject) => {
      if (!jobId) {
        reject(new Error("jobId is required"));
        return;
      }
      API.post("/product/images/download/cancel", { jobId })
        .then((res) => {
          if (res?.data?.code === 202 || res?.data?.code === 200) {
            resolve(res.data?.progress ?? null);
          } else {
            reject(new Error(res?.data?.message ?? "Failed to cancel job"));
          }
        })
        .catch((err) => reject(err));
    }),

  // Download ZIP with auth header from localStorage token.
  // If backend provides relative download_url, resolve against API base URL.
  downloadImagesZipFile: async (jobId, downloadUrl) => {
    if (!jobId) throw new Error("jobId is required");
    const token =
      typeof window !== "undefined" ? localStorage.getItem("Token") : null;
    const fallbackUrl = `${constants.BASE_URL}product/images/download/file?jobId=${encodeURIComponent(
      jobId
    )}`;
    const baseUrl = API?.defaults?.baseURL || constants.BASE_URL;
    const url = downloadUrl
      ? new URL(downloadUrl, baseUrl).toString()
      : fallbackUrl;
    const res = await fetch(url, {
      method: "GET",
      headers: token ? { "x-access-token": token } : {},
    });
    if (!res.ok) {
      throw new Error("Download file is not ready yet");
    }
    const blob = await res.blob();
    const fileUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = `product-images-${jobId}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(fileUrl);
  },
};
export default product;
