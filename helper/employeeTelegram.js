import API from "../util/api";

/**
 * The employee Telegram API, as `routes/employee_telegram.js` defines it.
 *
 * Three calls, and nothing invented. Each resolves `res.data` like every other
 * helper here, so a caller can receive `{ code: 403, msg }` instead of the
 * happy shape - see `util/apiList.js` for why that is deliberate.
 *
 * WHAT THE LINK IS. `generateTelegramLink` returns a ONE-TIME CREDENTIAL. It
 * is handed to the caller and never written down here: no module-level
 * variable, no storage, no log. The component that receives it keeps it in
 * React state for as long as the QR is on screen and lets it go.
 */
const employeeTelegram = {
  /**
   * GET /hr/employee/:id/telegram — `view_employees` + branch scope.
   *
   * Returns `{ status, connected, mobile_verified, telegram_username,
   * connected_at }` and nothing else - no Telegram user id, no chat id, no
   * mobile number.
   */
  getStatus: (employeeId) =>
    new Promise((resolve, reject) => {
      API.get(`/hr/employee/${employeeId}/telegram`)
        .then((res) => resolve(res.data))
        .catch((err) => reject(err));
    }),

  /**
   * POST /hr/employee/:id/telegram/link-token — `employee_create` OR
   * `employee_edit`, plus branch scope.
   *
   * THE BODY IS EMPTY AND MUST STAY EMPTY. The server refuses a body that
   * names anything at all: which employee this is for is decided by the path
   * and the caller's branch scope, never by the browser.
   *
   * Returns `{ link, expires_in_minutes, expires_at }`. Generating a fresh
   * link invalidates the previous one SERVER-SIDE; there is no frontend
   * invalidation to perform and none is attempted.
   */
  generateLink: (employeeId) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/telegram/link-token`, {})
        .then((res) => resolve(res.data))
        .catch((err) => reject(err));
    }),

  /**
   * POST /hr/employee/:id/telegram/disconnect — same key as the link.
   *
   * ONLY the explicit Disconnect action calls this. Reconnecting does NOT:
   * the backend replaces an identity atomically only once the new Telegram
   * account has verified, so disconnecting first would throw away a working
   * connection for a verification that might never happen.
   */
  disconnect: (employeeId) =>
    new Promise((resolve, reject) => {
      API.post(`/hr/employee/${employeeId}/telegram/disconnect`, {})
        .then((res) => resolve(res.data))
        .catch((err) => reject(err));
    }),
};

export default employeeTelegram;
