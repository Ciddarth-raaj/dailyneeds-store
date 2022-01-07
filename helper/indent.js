import API from "../util/api";

const indent = {
	getIndent: (offset, limit) =>
		new Promise(function (resolve, reject) {
			API.get(`/indent?offset=${offset}&limit=${limit}`)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
		getDespatchIndent: (offset, limit, delivery_status) =>
		new Promise(function (resolve, reject) {
			API.get(`/indent/despatch?offset=${offset}&limit=${limit}&delivery_status=${delivery_status}`)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getIndentCount: () =>
		new Promise(function (resolve, reject) {
			API.get("/indent/indentcount")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	createIndent: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/indent/create", data)
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
export default indent;
