import API from "../util/api";

const materialtype = {
	getMaterialType: (offset, limit) =>
		new Promise(function (resolve, reject) {
			API.get(`/materialtype?offset=${offset}&limit=${limit}`)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getMaterialTypeById: (type_id) => 
	new Promise(function (resolve, reject) {
	API.get("/materialtype/type_id?type_id="+type_id)
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
updatePackMaterialType: (data) =>
new Promise(function (resolve, reject) {
	API.post("/materialtype/update-materialtype", data)
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
	getMaterialTypeCount: () =>
		new Promise(function (resolve, reject) {
			API.get("/materialtype/typecount")
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
