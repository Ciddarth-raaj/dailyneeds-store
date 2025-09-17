import API from "../util/api";

const returnItem = {
  // Create repack item
  createRepackItem: (data) =>
    new Promise(function (resolve, reject) {
      API.post("/repack-item/create", data)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to create repack item");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Get repack item by ID
  getRepackItemById: (repackItemId) =>
    new Promise(function (resolve, reject) {
      API.get(`/repack-item/${repackItemId}`)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to fetch repack item");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Get all repack items with optional filters
  getAllRepackItems: (filters = {}) =>
    new Promise(function (resolve, reject) {
      const queryParams = new URLSearchParams();
      if (filters.offset) queryParams.append("offset", filters.offset);
      if (filters.limit) queryParams.append("limit", filters.limit);
      if (filters.item_id) queryParams.append("item_id", filters.item_id);

      const url = `/repack-item/all${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      
      API.get(url)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to fetch repack items");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Update repack item
  updateRepackItem: (repackItemId, data) =>
    new Promise(function (resolve, reject) {
      API.put(`/repack-item/${repackItemId}`, data)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to update repack item");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Delete repack item
  deleteRepackItem: (repackItemId) =>
    new Promise(function (resolve, reject) {
      API.delete(`/repack-item/${repackItemId}`)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to delete repack item");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),
};

export default returnItem;
