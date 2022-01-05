import API from "../util/api";

const materialtype = {
	getMaterialType: () =>
		new Promise(function (resolve, reject) {
			API.get("/materialtype")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	updateStatus: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/materialtype/update-status", data)
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
    createMaterialType: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/materialtype/create", data)
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
export default materialtype;
