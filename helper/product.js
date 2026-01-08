import API from "../util/api";

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
  getProduct: (limit, offset) =>
    new Promise(function (resolve, reject) {
      API.get(`/product?limit=${limit}&offset=${offset}`)
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
};
export default product;
