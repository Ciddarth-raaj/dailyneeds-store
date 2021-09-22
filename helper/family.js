import API from "../util/api";

const family = {
	getFamily: () =>
		new Promise(function (resolve, reject) {
            console.log("jesus");
			API.get("/family")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
    getFamilyById: (family_id) => 
		new Promise(function (resolve, reject) {
		API.get("/family/family_id?family_id= " + family_id)
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
	updateFamily: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/family/update-family", data)
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
    createFamily: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/family/create", data)
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
export default family;
