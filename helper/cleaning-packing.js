import API from "../util/api";

const cleaningPacking = {
  getAll: (filters = {}) =>
    new Promise(function (resolve, reject) {
      const queryParams = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        queryParams.append(key, filters[key]);
      });

      const url = `/cleaning-packing${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;

      API.get(url)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to fetch cleaning packing list");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),
  sync: () =>
    new Promise(function (resolve, reject) {
      const url = `/cleaning-packing/sync`;

      API.post(url)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to sync");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),
};

export default cleaningPacking;
