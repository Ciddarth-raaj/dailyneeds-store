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

  /** Whether this user can receive a reset code, and whether the bot is set up. */
  getTelegramLink: () =>
    new Promise(function (resolve, reject) {
      API.get("/user/telegram-link")
        .then((res) => {
          if (res.data?.code !== 200) {
            reject(new Error(res.data?.msg || "Could not read Telegram status"));
            return;
          }
          resolve({
            linked: res.data.linked === true,
            telegramUsername: res.data.telegram_username ?? null,
            linkedAt: res.data.linked_at ?? null,
            botConfigured: res.data.bot_configured === true,
          });
        })
        .catch((err) => reject(err));
    }),

  /**
   * A one-time `t.me` deep link. Opening it in Telegram is what completes
   * the link — the server only trusts a chat the bot itself heard from.
   */
  startTelegramLink: () =>
    new Promise(function (resolve, reject) {
      API.post("/user/telegram-link")
        .then((res) => {
          if (res.data?.code !== 200) {
            reject(new Error(res.data?.msg || "Could not start linking"));
            return;
          }
          resolve(res.data);
        })
        .catch((err) => reject(err));
    }),

  unlinkTelegram: () =>
    new Promise(function (resolve, reject) {
      API.delete("/user/telegram-link")
        .then((res) => {
          if (res.data?.code !== 200) {
            reject(new Error(res.data?.msg || "Could not unlink"));
            return;
          }
          resolve(res.data);
        })
        .catch((err) => reject(err));
    }),

  /**
   * Ask for a reset code.
   *
   * Resolves the same way whether or not the account exists or has Telegram
   * linked — the server will not say, so neither can this.
   */
  forgotPassword: (username) =>
    new Promise(function (resolve, reject) {
      API.post("/user/forgot-password", { username })
        .then((res) => resolve(res.data))
        .catch((err) => reject(err));
    }),

  /** Set a new password using a code delivered over Telegram. */
  resetPassword: (username, code, newPassword) =>
    new Promise(function (resolve, reject) {
      API.post("/user/reset-password", {
        username,
        code,
        new_password: newPassword,
      })
        .then((res) => {
          if (res.data?.code !== 200) {
            reject(new Error(res.data?.msg || "Could not reset password"));
            return;
          }
          resolve(res.data);
        })
        .catch((err) => reject(err));
    }),
};

export default UserHelper;
