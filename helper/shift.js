import API from "../util/api";

const shift = {
	getShift: () =>
		new Promise(function (resolve, reject) {
			API.get("/shift")
				.then(async (res) => {
					resolve(shift.formatBrand(res.data));
				})
				.catch((err) => {
					reject(err);
				});
		}),
	formatBrand: (data) => {
		const formattedData = [];
		for (const d of data) {
			formattedData.push({
				id: d.shift_id,
				value: d.shift_name,
				start_time: d.shift_in_time,
				end_time: d.shift_out_time, 
				status: d.status,
			});
		}

		return formattedData;
	},
	createShift: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/shift/create", data)
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
export default shift;
