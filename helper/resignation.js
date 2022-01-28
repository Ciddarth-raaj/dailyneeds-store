import API from "../util/api";

const resignation = {
	getResignation: () =>
		new Promise(function (resolve, reject) {
			API.get("/resignation")
				.then(async (res) => {
					resolve(resignation.formatBrand(res.data));
				})
				.catch((err) => {
					reject(err);
				});
		}),
	formatBrand: (data) => {
		const formattedData = [];
		for (const d of data) {
			formattedData.push({
				id: d.resignation_id,
				employee_name: d.employee_name,
                reason_type: d.reason_type,
				reason: d.reason,
				resignation_date: d.resignation_date,
			});
		}

		return formattedData;
	},
	deleteResignation: (resignation_id) => 
	new Promise(function (resolve, reject) {
	API.post("/resignation/resignation_id?resignation_id="+resignation_id)
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
getResignationById: (resignation_id) => 
new Promise(function (resolve, reject) {
API.get("/resignation/get/resignation_id?resignation_id="+resignation_id)
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
    createResignation: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/resignation/create", data)
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
	getResignationByName: (employee_name) => 
		new Promise(function (resolve, reject) {
		API.get("/resignation/employee_name?employee_name=" + employee_name)
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
	updateResignation: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/resignation/update-resignation", data)
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
export default resignation;
