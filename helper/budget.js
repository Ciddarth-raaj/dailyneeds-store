import API from "../util/api";

const budget = {
	getBudget: (offset, limit, store_id) =>
		new Promise(function (resolve, reject) {
			API.get(`/budget/id?offset=${offset}&limit=${limit}&store_id=${store_id}`)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	createBudget: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/budget/create", data)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getBudgetById: (budget_id) =>
		new Promise(function (resolve, reject) {
			API.get("/budget/budget_id?budget_id="+budget_id)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getBudgetStoreId: (store_id) =>
		new Promise(function (resolve, reject) {
			API.get("/budget/storedet?store_id=" + store_id)
				.then(async (res) => {
					// console.log({res: res.data})
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getBudgetStore: (store_id) =>
		new Promise(function (resolve, reject) {
			API.get("/budget/store_id?store_id=" + store_id)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		})
};
export default budget;
