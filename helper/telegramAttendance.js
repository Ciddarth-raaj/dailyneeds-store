import axios from "axios";
import constants from "../constants/api.js";

/**
 * The Telegram Attendance Mini App API, as `routes/telegram_attendance.js`
 * defines it.
 *
 * ============================== ITS OWN AXIOS INSTANCE, ON PURPOSE =========
 *
 * NOT `util/api.js`. That instance carries the dnds.co.in session in
 * `x-access-token` and redirects the whole window to the login screen on the
 * 403s that cost a session. Neither belongs here:
 *
 *   - a Mini App has no dnds.co.in session and must never send one, so the
 *     scoped Telegram token travels in its OWN header, `x-telegram-session`;
 *   - a 401 inside Telegram means "reopen from the message", not "go to a
 *     login page the employee has no account for" - a redirect inside
 *     Telegram's WebView would strand them on a screen they cannot use.
 *
 * ========================================= WHAT THE BROWSER NEVER SENDS ====
 *
 * There is NO employee id in any call below - not a parameter, not a body
 * field, not a path segment. The employee is the one the server resolved
 * from Telegram's signature, and the API refuses a request that names one
 * (Joi rejects unknown keys: a 422). The `?date=` on the Mini App URL is a
 * navigation hint the page uses to preselect a card and is never an identity.
 *
 * THE BOT TOKEN IS NOT HERE AND CANNOT BE. It validates `initData` on the
 * server; nothing in this repository - and no NEXT_PUBLIC_* variable - holds
 * it.
 */
const client = axios.create({
  baseURL: constants.BASE_URL,
  // Every documented answer, including the 401 the session gate returns, is
  // read from the body rather than thrown - the screen decides what to show.
  validateStatus: (status) => status >= 200 && status < 500,
});

let sessionToken = null;

/** Keep the scoped token in memory only. It is short-lived and re-obtainable. */
const setToken = (token) => {
  sessionToken = token || null;
};

const authHeaders = () => (sessionToken ? { "x-telegram-session": sessionToken } : {});

const telegramAttendance = {
  setToken,
  hasToken: () => !!sessionToken,

  /**
   * Exchange Telegram's signed `initData` for the scoped session.
   *
   * `initData` is handed over VERBATIM: it is a signed string and re-encoding
   * or reordering it would break the signature. It is the ONLY field.
   */
  openSession: (initData) =>
    client.post("/telegram/attendance/session", { init_data: initData }).then((res) => {
      if (res.data && Number(res.data.code) === 200) setToken(res.data.token);
      return res.data;
    }),

  /**
   * MY ATTENDANCE: one month of the employee's own calculated days.
   *
   * `month` (`YYYY-MM`) is the ONLY parameter. There is no employee, outlet,
   * store, designation or approval-role field, and the API refuses one.
   */
  getMonth: (month) =>
    client.get("/telegram/attendance/month", { params: { month }, headers: authHeaders() }).then((r) => r.data),

  /** CORRECTIONS: this employee's correction dates. No parameters at all. */
  getMissingDates: () =>
    client.get("/telegram/attendance/missing-dates", { headers: authHeaders() }).then((r) => r.data),

  /** One date, read-only. The date is the only parameter. */
  getDate: (attendance_date) =>
    client
      .get("/telegram/attendance/date", { params: { attendance_date }, headers: authHeaders() })
      .then((r) => r.data),

  /** `{ attendance_date, punch_time, reason }`. Nothing else exists to send. */
  submitRegularization: ({ attendance_date, punch_time, reason }) =>
    client
      .post(
        "/telegram/attendance/regularization",
        { attendance_date, punch_time, reason },
        { headers: authHeaders() }
      )
      .then((r) => r.data),
};

export default telegramAttendance;
