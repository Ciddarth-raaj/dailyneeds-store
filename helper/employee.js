import API from "../util/api";

const employee = {
    getEmployee: () =>
		new Promise(function (resolve, reject) {
			API.get("/employee/employees")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
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
        })
};
export default employee;