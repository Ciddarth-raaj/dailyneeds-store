import API from "../util/api";

const materialcategory = {
  getMaterialCategories: (offset = 0, limit = 10) =>
    new Promise(function (resolve, reject) {
      API.get(`/materials/categories?offset=${offset}&limit=${limit}`)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  getMaterialCategoryById: (id) =>
    new Promise(function (resolve, reject) {
      API.get(`/materials/categories/${id}`)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  updateMaterialCategory: (id, body) =>
    new Promise(function (resolve, reject) {
      API.put(`/materials/categories/${id}`, body)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  deleteMaterialCategory: (id) =>
    new Promise(function (resolve, reject) {
      API.delete(`/materials/categories/${id}`)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  createMaterialCategory: (body) =>
    new Promise(function (resolve, reject) {
      API.post(`/materials/categories`, body)
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
};

export default materialcategory;
