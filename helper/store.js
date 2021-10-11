import API from "../util/api";

const store = {
	getStore: () =>
		new Promise(function (resolve, reject) {
			API.get("/store")
				.then(async (res) => {
					resolve(store.formatBrand(res.data));
				})
				.catch((err) => {
					reject(err);
				});
		}),
	formatBrand: (data) => {
		const formattedData = [];
		for (const d of data) {
			formattedData.push({
				id: d.store_id,
				value: d.store_name,
				status: d.status,
			});
		}

		return formattedData;
	},
	getStoreById: (store_id) =>
	new Promise(function (resolve, reject) {
		API.get("/store/store_id?store_id=" + store_id)
			.then(async (res) => {
				resolve(res.data);
			})
			.catch((err) => {
				reject(err);
			});
	}),
};
export default store;
