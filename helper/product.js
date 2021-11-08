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
	getProduct: () =>
		new Promise(function (resolve, reject) {
			API.get("/product?offset=0&limit=10")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getById: (product_id) =>
		new Promise(function (resolve, reject) {
			API.get("/product?offset=0&limit=1&product_id=" + product_id)
				.then(async (res) => {
					resolve(res.data);
					console.log({idhu: res.data});
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
					console.log({ workingah: res.data });
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
