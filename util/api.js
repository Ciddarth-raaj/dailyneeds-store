import constants from "../constants/api.js";
import axios from "axios";
import classify403 from "./handle403";

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

        // Which 403s cost the session and which are ordinary answers is one
        // decision, kept in util/handle403.js so it can be unit-tested.
        const { href } = classify403(res, window.location.pathname);
        if (href) {
          window.location.href = href;
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
