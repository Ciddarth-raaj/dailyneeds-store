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
};

export default UserHelper;
