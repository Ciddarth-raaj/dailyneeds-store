import API from "../util/api";

const designation = {
	getDesignation: () =>
		new Promise(function (resolve, reject) {
			API.get("/designation")
				.then(async (res) => {
					resolve(designation.formatBrand(res.data));
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
				id: d.designation_id,
				value: d.designation_name,
				status: d.status,
			});
		}

		return formattedData;
	},
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
};
export default designation;
