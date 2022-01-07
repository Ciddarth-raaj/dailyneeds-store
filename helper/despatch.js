import API from "../util/api";

const despatch = {
	createDespatch: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/despatch/create", data)
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
	getDespatch: () =>
		new Promise(function (resolve, reject) {
			API.get("/despatch")
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
export default despatch;
