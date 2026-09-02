import API from "../util/api";

const UserIpRestrictionHelper = {
  /** Every active login with its IP allow-list. */
  getAll: () =>
    new Promise(function (resolve, reject) {
      API.get("/user/ip-restrictions")
        .then((res) => {
          resolve(res.data?.data ?? []);
        })
        .catch((err) => {
          reject(err);
        });
    }),

  /**
   * Replace one user's IP policy.
   *
   * `allowOutsideAccess` is the decision — false confines them to
   * `allowedIps`. The list is stored either way, so switching someone back
   * to restricted does not mean retyping the store's addresses.
   */
  update: (userId, allowedIps, allowOutsideAccess) =>
    new Promise(function (resolve, reject) {
      API.post("/user/ip-restrictions", {
        user_id: userId,
        allowed_ips: allowedIps,
        allow_outside_access: allowOutsideAccess,
      })
        .then((res) => {
          if (res.data?.code !== 200) {
            reject(new Error(res.data?.msg || "Could not save IP restriction"));
            return;
          }
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),

  /** The address this browser is reaching the API from. */
  getMyIp: () =>
    new Promise(function (resolve, reject) {
      API.get("/user/my-ip")
        .then((res) => {
          resolve(res.data?.ip ?? "");
        })
        .catch((err) => {
          reject(err);
        });
    }),
};

export default UserIpRestrictionHelper;
