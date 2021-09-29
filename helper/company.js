import API from "../util/api";

const company = {
	updateStatus: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/company/update-status", data)
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
    createCompany: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/company", data)
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
	getCompanyById: (company_id) => 
		new Promise(function (resolve, reject) {
		API.get("/company/company_id?company_id=" + company_id)
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
export default company;
