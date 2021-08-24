import API from "../util/api";

const shift = {
	get: () =>
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
				status: d.status,
			});
		}

		return formattedData;
	},
};
export default shift;
