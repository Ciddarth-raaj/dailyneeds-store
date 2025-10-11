import API from "../util/api";

export const createEBConsumption = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.post("/eb-consumption", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateEBConsumption = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.put(`/eb-consumption/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllEBConsumption = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.get("/eb-consumption");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getEBConsumptionById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.get(`/eb-consumption/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
