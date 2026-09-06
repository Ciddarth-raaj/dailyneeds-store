import API from "../util/api";

const UserHelper = {
  /**
   * Change the signed-in user's own password.
   *
   * The account is taken from the token server-side — there is nothing here
   * to aim at another user. A wrong current password comes back as a
   * rejection carrying the server's wording, so the caller can show the
   * reason rather than a generic failure.
   */
  changePassword: (currentPassword, newPassword) =>
    new Promise(function (resolve, reject) {
      API.post("/user/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      })
        .then((res) => {
          if (res.data?.code !== 200) {
            reject(new Error(res.data?.msg || "Could not change password"));
            return;
          }
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),

  /** Redeem a setup/reset token (Stage 0A / B5). No session is needed. */
  setupPassword: (token, newPassword) =>
    new Promise(function (resolve, reject) {
      API.post("/user/setup-password", { token, new_password: newPassword })
        .then((res) => {
          if (res.data?.code !== 200) {
            reject(new Error(res.data?.msg || "Could not set password"));
            return;
          }
          resolve(res.data);
        })
        .catch((err) => reject(err));
    }),

  /**
   * Server-side logout (Stage 0A / C5). Best effort: the client clears its
   * own storage whether or not this reaches the server.
   */
  logout: () =>
    new Promise(function (resolve) {
      API.post("/user/logout")
        .then(() => resolve(true))
        .catch(() => resolve(false));
    }),
};

export default UserHelper;
