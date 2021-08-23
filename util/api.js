import constants from "../constants/api.js";
import axios from "axios";

const custom = axios.create({
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
        return res;
      } catch (err) {
        console.log(err);
        throw Error(res);
      }
    },
  ],
});

custom.updateToken = (token) => {
  custom.defaults.headers.common["x-access-token"] = token;
  // localStorage.setItem("accessToken", token);
};

export default custom;