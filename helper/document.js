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
	getAllDocuments: () =>
	new Promise(function (resolve, reject) {
		API.get("/document/all")
			.then(async (res) => {
				resolve(res.data);
			})
			.catch((err) => {
				reject(err);
			});
	}),
	approveDocument: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/document/update-document", data)
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
	getDocumentById: (document_id) =>
	new Promise(function (resolve, reject) {
		API.get("/document/document_id?document_id=" + document_id)
			.then(async (res) => {
				resolve(res.data);
			})
			.catch((err) => {
				reject(err);
			});
	}),
	getAdhaar: () =>
		new Promise(function (resolve, reject) {
			API.get("/document/adhaar")
				.then(async (res) => {
					resolve(document.format(res.data));
				})
				.catch((err) => {
					reject(err);
				});
		}),
	format: (data) => {
			const formattedData = [];
			for (const d of data) {
				formattedData.push({
					employee_id: d.employee_id,
					card_type: d.card_type,
					card_name: d.card_name,
					card_number: d.card_no,
					employee_name: d.employee_name
				});
			}
	
			return formattedData;
		},
};
export default document;
