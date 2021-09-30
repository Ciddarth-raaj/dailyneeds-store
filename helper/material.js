import API from "../util/api";

const material = {
	getMaterial: () =>
		new Promise(function (resolve, reject) {
			API.get("/material")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	updateStatus: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/material/update-status", data)
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
    createMaterial: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/material/create", data)
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
	getMaterialById: (material_id) => 
		new Promise(function (resolve, reject) {
		API.get("/material/material_id?material_id= " + material_id)
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
	updateMaterial: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/material/update-material", data)
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
export default material;
