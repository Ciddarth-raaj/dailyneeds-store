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
