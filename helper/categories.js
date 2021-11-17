import API from "../util/api";

const categories = {
	getCategories: (offset, limit) =>
		new Promise(function (resolve, reject) {
			API.get(`/category?offset=${offset}&limit=${limit}`)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
		getCategoryCount: () =>  
		new Promise(function (resolve, reject) {
			API.get("/category/catcount")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
};
export default categories;
