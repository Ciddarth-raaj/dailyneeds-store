import API from "../util/api";

const materialsize = {
	getMaterialSize: () =>
		new Promise(function (resolve, reject) {
			API.get("/materialsize")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	updateStatus: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/materialsize/update-status", data)
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
    createMaterialSize: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/materialsize/create", data)
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
export default materialsize;
