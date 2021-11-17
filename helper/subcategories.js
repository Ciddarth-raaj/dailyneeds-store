import API from "../util/api";

const subcategories = {
	getSubCategories: (offset, limit) =>
		new Promise(function (resolve, reject) {
			API.get(`/subcategory?offset=${offset}&limit=${limit}`)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getSubCategoryCount: () =>  
		new Promise(function (resolve, reject) {
			API.get("/subcategory/subcatcount")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
};
export default subcategories;
