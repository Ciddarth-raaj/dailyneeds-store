import API from "../util/api";

const material = {
  getMaterials: () =>
    new Promise(function (resolve, reject) {
      API.get(`/materials?offset=0&limit=1000`)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  createMaterial: (body) =>
    new Promise(function (resolve, reject) {
      API.post(`/materials`, body)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  updateMaterial: (id, body) =>
    new Promise(function (resolve, reject) {
      API.put(`/materials/${id}`, body)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  deleteMaterial: (id) =>
    new Promise(function (resolve, reject) {
      API.delete(`/materials/${id}`)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  getAllMaterialRequests: () =>
    new Promise(function (resolve, reject) {
      API.get(`/material_request`)
        .then(async (res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  createMaterialRequest: (body) =>
    new Promise(function (resolve, reject) {
      API.post(`/material_request`, body)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  getMaterialRequest: (id) =>
    new Promise(function (resolve, reject) {
      API.get(`/material_request/${id}`)
        .then(async (res) => {
          resolve(res);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  updateMaterialRequest: (id, body) =>
    new Promise(function (resolve, reject) {
      API.put(`/material_request/${id}`, body)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
};

export default material;
