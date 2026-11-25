import API from "../util/api";

const UserIpRestrictionHelper = {
  /** Every active login with its policy and its branch's rule. */
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
   * `ipPolicy` is the decision: "branch" (follow their branch's rule),
   * "custom" (their own list, unioned with the branch's) or "unrestricted".
   * The list is stored under every policy, so moving someone back to
   * "custom" does not mean retyping their addresses.
   */
  update: (userId, allowedIps, ipPolicy) =>
    new Promise(function (resolve, reject) {
      API.post("/user/ip-restrictions", {
        user_id: userId,
        allowed_ips: allowedIps,
        ip_policy: ipPolicy,
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

  /**
   * The address this browser is reaching the API from, plus whether that
   * address is believable.
   *
   * Behind a reverse proxy that does not forward the client IP, every
   * request looks like it came from localhost, so the caller needs the
   * flags to warn instead of presenting a wrong address as fact.
   */
  getMyIp: () =>
    new Promise(function (resolve, reject) {
      API.get("/user/my-ip")
        .then((res) => {
          resolve({
            ip: res.data?.ip ?? "",
            isLoopback: res.data?.is_loopback === true,
            isPrivate: res.data?.is_private === true,
            hasForwardedHeader: res.data?.has_forwarded_header === true,
          });
        })
        .catch((err) => {
          reject(err);
        });
    }),
};

export default UserIpRestrictionHelper;
