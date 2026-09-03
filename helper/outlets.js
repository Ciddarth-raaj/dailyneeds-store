import API from "../util/api";

const outlet = {
  getOutlet: () =>
    new Promise(function (resolve, reject) {
      API.get("/outlet")
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
  getOutletById: (outlet_id) =>
    new Promise(function (resolve, reject) {
      API.get("/outlet/outlet_id?outlet_id=" + outlet_id)
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
  getOutletByOutletId: (outlet_id) =>
    new Promise(function (resolve, reject) {
      API.get("/outlet/id?outlet_id=" + outlet_id)
        .then(async (res) => {
          // console.log({res: res})
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
      API.post("/outlet/update-status", data)
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
  updateOutlet: (data) =>
    new Promise(function (resolve, reject) {
      API.post("/outlet/update-outlet", data)
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
  createOutlet: (data) =>
    new Promise(function (resolve, reject) {
      API.post("/outlet/create", data)
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

  // ---- Branch IP rule -----------------------------------------------------
  // Served by its own permission-gated endpoints, separate from the outlet
  // form: the rule deciding where a branch's staff may sign in from must not
  // be settable by anyone who can reach /update-outlet.

  /** Every branch with its IP rule and active employee count. */
  getIpRestrictions: () =>
    new Promise(function (resolve, reject) {
      API.get("/outlet/ip-restrictions")
        .then((res) => {
          resolve(res.data?.data ?? []);
        })
        .catch((err) => {
          reject(err);
        });
    }),

  /** One branch's IP rule, or null when the branch does not exist. */
  getIpRestriction: (outlet_id) =>
    new Promise(function (resolve, reject) {
      API.get("/outlet/ip-restriction?outlet_id=" + outlet_id)
        .then((res) => {
          resolve(res.data?.code === 200 ? res.data.data : null);
        })
        .catch((err) => {
          reject(err);
        });
    }),

  /**
   * Replace one branch's IP rule.
   *
   * `enabled` is the decision — true confines every employee of the branch
   * to `allowedIps`. The list is stored either way, so turning the rule off
   * for a while does not mean retyping the addresses later.
   */
  updateIpRestriction: (outlet_id, allowedIps, enabled) =>
    new Promise(function (resolve, reject) {
      API.post("/outlet/ip-restriction", {
        outlet_id,
        allowed_ips: allowedIps,
        ip_restriction_enabled: enabled,
      })
        .then((res) => {
          if (res.data?.code !== 200) {
            reject(new Error(res.data?.msg || "Could not save the branch IP rule"));
            return;
          }
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
};
export default outlet;
