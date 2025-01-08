import API from "../util/api";

const EbookHelper = {
  createEbook: (params) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await API.post("/accounts-ebook", params);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  },

  bulkCreateEbook: (params) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await API.post("/accounts-ebook/bulk", params);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  },

  updateEbook: (id, params) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await API.put(`/accounts-ebook/${id}`, params);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  },

  deleteEbook: (id) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await API.delete(`/accounts-ebook/${id}`);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  },

  getAllEbooks: (filters = {}) => {
    return new Promise(async (resolve, reject) => {
      try {
        const queryParams = new URLSearchParams();
        if (filters.store_id) queryParams.append("store_id", filters.store_id);
        if (filters.from_date)
          queryParams.append("from_date", filters.from_date);
        if (filters.to_date) queryParams.append("to_date", filters.to_date);

        const url = `/accounts-ebook${
          queryParams.toString() ? `?${queryParams.toString()}` : ""
        }`;
        const response = await API.get(url);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  },

  getEbookById: (id) => {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await API.get(`/accounts-ebook/${id}`);
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    });
  },
};

export default EbookHelper;
