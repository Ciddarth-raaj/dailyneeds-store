import API from "../util/api";

export const getAllAccounts = (filters = {}) => {
  return new Promise(async function (resolve, reject) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.store_id) queryParams.append("store_id", filters.store_id);
      if (filters.from_date) queryParams.append("from_date", filters.from_date);
      if (filters.to_date) queryParams.append("to_date", filters.to_date);

      const url = `/accounts${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const data = await API.get(url);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAccountById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.get(`/accounts/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createAccount = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.post("/accounts", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateAccount = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.put(`/accounts/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteAccount = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.delete(`/accounts/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
