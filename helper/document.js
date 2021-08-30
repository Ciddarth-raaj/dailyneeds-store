import API from "../util/api";

const document = {
	getDocType: () =>
		new Promise(function (resolve, reject) {
			API.get("/document")
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
				id: d.id,
				value: d.name,
				status: d.status,
			});
		}

		return formattedData;
	},
};
export default document;
