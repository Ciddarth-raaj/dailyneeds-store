import API from "../util/api";

const product = {
	updateProduct: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/product/updatedata", data)
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
	getProduct: (offset, limit) =>
		new Promise(function (resolve, reject) {
			API.get(`/product?offset=${offset}&limit=${limit}`)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getProductCount: () =>
		new Promise(function (resolve, reject) {
			API.get("/product/prodcount")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getProductById: (product_id) =>
		new Promise(function (resolve, reject) {
			API.get("/product/product_id?product_id=" + product_id)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
		getFilteredProduct: (name, offset, limit) =>
		new Promise(function (resolve, reject) {
			API.get(`/product/filter?filter=${name}&offset=${offset}&limit=${limit}`)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	updateProductDetails: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/product/updatedata", data)
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
		})
};
export default product;
