import constants from "../constants/api.js";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: constants.BASE_URL,
  validateStatus: function (status) {
    return status >= 200 && status < 429;
  },
  transformResponse: [
    (res) => {
      try {
        if (res === null) {
          throw Error("Res is Null");
        }
        if (res === "") return res;
        res = JSON.parse(res);

        if (res.code === 403 && window.location.pathname !== "/login") {
          // Stage 0A: a session confined to the change-password screen is
          // not a stale session either. Send it there, not to login.
          if (res.error === "PASSWORD_CHANGE_REQUIRED") {
            if (window.location.pathname !== "/change-password") {
              window.location.href = "/change-password?required=1";
            }
            return res;
          }
          // A refused employee-only action for a system account is a real
          // answer, not a session problem; let the caller show it.
          if (res.error === "EMPLOYEE_REQUIRED") {
            return res;
          }
          // An IP block is not a stale session — send the reason along so the
          // login screen can explain it instead of showing a blank form.
          if (res.error === "IP_NOT_ALLOWED") {
            const ip = res.ip ? `&ip=${encodeURIComponent(res.ip)}` : "";
            window.location.href = `/login?blocked=ip${ip}`;
          } else {
            window.location.href = "/login";
          }
        }

        return res;
      } catch (err) {
        console.log(err);
        throw Error(res);
      }
    },
  ],
});

axiosInstance.updateToken = (token) => {
  axiosInstance.defaults.headers.common["x-access-token"] = token;
  // localStorage.setItem("accessToken", token);
};

export default axiosInstance;
