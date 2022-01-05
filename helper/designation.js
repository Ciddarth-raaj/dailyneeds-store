import API from "../util/api";

const designation = {
	getDesignation: () =>
		new Promise(function (resolve, reject) {
			API.get("/designation")
				.then(async (res) => {
					resolve(designation.formatBrand(res.data));
				})
				.catch((err) => {
					reject(err);
				});
		}),
	formatBrand: (data) => {
		const formattedData = [];
		for (const d of data) {
			formattedData.push({
				id: d.designation_id,
				value: d.designation_name,
				status: d.status,
			});
		}

		return formattedData;
	},
	getPermissionById: () =>
	new Promise(function (resolve, reject) {
		const Token = localStorage.getItem('Token');
		API.get("/designation/permissions", {
			headers: {
				"x-access-token": Token,
			},
		})
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
	updateStatus: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/designation/update-status", data)
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
	createDesignation: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/designation/create", data)
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

	getDesignationById: (designation_id) => 
		new Promise(function (resolve, reject) {
		API.get("/designation/designation_id?designation_id= " + designation_id)
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
	updateDesignation: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/designation/update-designation", data)
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
export default designation;
