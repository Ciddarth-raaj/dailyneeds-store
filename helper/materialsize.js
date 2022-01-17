import API from "../util/api";

const materialsize = {
	getMaterialSize: (offset, limit) =>
		new Promise(function (resolve, reject) {
			API.get(`/materialsize?offset=${offset}&limit=${limit}`)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getMaterialSizeById: (size_id) =>
		new Promise(function (resolve, reject) {
			API.get("/materialsize/size_id?size_id=" + size_id)
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
	getMaterialSizeCount: () =>
		new Promise(function (resolve, reject) {
			API.get("/materialsize/sizecount")
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
	updatePackMaterialSize: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/materialsize/update-materialsize", data)
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
