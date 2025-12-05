import API from "../util/api";

export const getAllEBMaster = (params = {}) => {
  const { offset = 0, limit = 10000000 } = params;
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.get(
        `/eb-master-list?offset=${offset}&limit=${limit}`
      );
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getEBMasterById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.get(`/eb-master-list/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createEBMaster = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.post("/eb-master-list", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateEBMaster = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.put(`/eb-master-list/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteEBMaster = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.delete(`/eb-master-list/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

