import API from "../util/api";

export const getAllAccounts = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.get("/accounts");
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
