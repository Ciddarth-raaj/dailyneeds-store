import API from "../util/api";

const image = {
	getImageById: (product_id) => 
		new Promise(function (resolve, reject) {
		API.get("/image/product_id?product_id= " + product_id)
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
export default image;
