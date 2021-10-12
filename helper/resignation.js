import API from "../util/api";

const resignation = {
	getResignation: () =>
		new Promise(function (resolve, reject) {
			API.get("/resignation")
				.then(async (res) => {
                    console.log(res);
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
				reason: d.reason,
				resignation_date: d.resignation_date,
			});
		}

		return formattedData;
	},
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
	getResignationById: (resignation_id) => 
		new Promise(function (resolve, reject) {
		API.get("/resignation/resignation_id?resignation_id= " + resignation_id)
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
