import API from "../util/api";

const outlet = {
	getOutlet: () =>
		new Promise(function (resolve, reject) {
			API.get("/outlet")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getOutletById: (outlet_id) => 
		new Promise(function (resolve, reject) {
		API.get("/outlet/outlet_id?outlet_id="+outlet_id)
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
	getOutletByOutletId: (outlet_id) => 
	new Promise(function (resolve, reject) {
	API.get("/outlet/id?outlet_id= " + outlet_id)
		.then(async (res) => {
			// console.log({res: res})
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
    updateStatus: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/outlet/update-status", data)
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
	updateOutlet: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/outlet/update-outlet", data)
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
	createOutlet: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/outlet/create", data)
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
export default outlet;
