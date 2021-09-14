import API from "../util/api";

const document = {
	getDocType: (employee_id) =>
		new Promise(function (resolve, reject) {
			API.get("/document/employee_id?employee_id=" + employee_id)
				.then(async (res) => {
					resolve(document.formatBrand(res.data));
				})
				.catch((err) => {
					reject(err);
				});
		}),
	formatBrand: (data) => {
		const formattedData = [];
		for (const d of data) {
			formattedData.push({
				card_type: d.card_type,
				card_name: d.card_name,
				card_number: d.card_no,
				file: d.file,
			});
		}

		return formattedData;
	},
};
export default document;
