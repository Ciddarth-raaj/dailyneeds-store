import API from "../util/api";

const login = {
    login: (username, password) =>
        new Promise(function (resolve, reject) {
            API.post(`/user/login?username=${username}&password=${password}`)
                .then(async (res) => {
                    resolve(res.data);
                })
                .catch((err) => {
                    reject(err);
                });
        }),
};
export default login;
