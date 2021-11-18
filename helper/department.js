import API from "../util/api";

const department = {
	getDepartment: () =>
		new Promise(function (resolve, reject) {
			API.get("/department")
				.then(async (res) => {
					resolve(department.formatBrand(res.data));
				})
				.catch((err) => {
					reject(err);
				});
		}),
	formatBrand: (data) => {
		const formattedData = [];
		for (const d of data) {
			formattedData.push({
				id: d.department_id,
				value: d.department_name,
				image_url: d.image_url,
				status: d.status,
			});
		}

		return formattedData;
	},
	updateStatus: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/department/update-status", data)
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
	uploadDepartmentImage: (data) => 
	new Promise(function (resolve, reject) {
		API.post("/department/imageupload", data)
			.then(async (res) => {
				resolve(res.data);
			})
			.catch((err) => {
				reject(err);
			});
	}),
    createDepartment: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/department/create", data)
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
	getDepartmentById: (department_id) => 
		new Promise(function (resolve, reject) {
		API.get("/department/department_id?department_id= " + department_id)
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
	updateDepartment: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/department/update-department", data)
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
export default department;
