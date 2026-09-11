import API from "../util/api";

const designation = {
  getDesignation: () =>
    new Promise(function (resolve, reject) {
      API.get("/designation")
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  /**
   * `{ designation_id, designation_name }` for a dropdown, behind no
   * permission. `getDesignation` above stays on the `view_designation`-gated
   * route and keeps the full record; this is for callers that only render a
   * picker - see `GET /designation/directory` on the backend.
   */
  getDesignationDirectory: () =>
    new Promise(function (resolve, reject) {
      API.get("/designation/directory")
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  formatBrand: (data) => {
    const formattedData = [];
    for (const d of data) {
      formattedData.push({
        id: d.designation_id,
        value: d.designation_name,
        status: d.status,
      });
    }

    return formattedData;
  },
  getDesignationByBudget: () =>
    new Promise(function (resolve, reject) {
      API.get("/designation/budget")
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  getDesignationCount: () =>
    new Promise(function (resolve, reject) {
      API.get("/designation/count")
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  getPermissionById: () =>
    new Promise(function (resolve, reject) {
      const Token = localStorage.getItem("Token");
      API.get("/designation/permissions", {
        headers: {
          "x-access-token": Token,
        },
      })
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg);
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),
  updateStatus: (data) =>
    new Promise(function (resolve, reject) {
      API.post("/designation/update-status", data)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg);
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),
  createDesignation: (data) =>
    new Promise(function (resolve, reject) {
      API.post("/designation/create", data)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg);
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  getDesignationById: (designation_id) =>
    new Promise(function (resolve, reject) {
      API.get("/designation/designation_id?designation_id= " + designation_id)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg);
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),
  updateDesignation: (data) =>
    new Promise(function (resolve, reject) {
      API.post("/designation/update-designation", data)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg);
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),
};
export default designation;
