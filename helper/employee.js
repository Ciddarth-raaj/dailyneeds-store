import API from "../util/api";

const employee = {
    register: (data) =>
        new Promise(function (resolve, reject) {
            API.post("/employee", data)
                .then(async (res) => {
                    if (res.status === 200) {
                        resolve(res.data);
                    } else {
                        reject(res.data.msg);
                    }
                })
                .catch((err) => {
                    reject(err);
                });
        }),

};
export default employee;