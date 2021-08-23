import API from "../util/api";

const department = {
	getDepartment: () =>
		new Promise(function (resolve, reject) {
			API.get("/department")
				.then(async (res) => {
					resolve(department.formatBrand(res.data));
                    console.log({data: res.data});
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
				status: d.status,
			});
		}

		return formattedData;
	},
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
};
export default department;
