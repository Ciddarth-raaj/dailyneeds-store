import API from "../util/api";

const login = {
  /**
   * Sign in. Credentials travel in the POST body — never in the URL, where
   * proxies and access logs would keep them (Stage 0A / A7).
   */
  login: (username, password) =>
    new Promise(function (resolve, reject) {
      API.post("/user/login", { username, password })
        .then(async (res) => {
          resolve(res.data);
        })
        .catch((err) => {
          reject(err);
        });
    }),
};
export default login;
