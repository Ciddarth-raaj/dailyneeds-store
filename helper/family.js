import API from "../util/api";

const family = {
	getFamily: () =>
		new Promise(function (resolve, reject) {
			API.get("/family")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	// Prefer this where the employee was picked from a list: the id is
	// permanent, survives a name correction, and tells two employees sharing a
	// name apart - which the name lookup below cannot.
	getFamilyOnEmployeeId: (employee_id) =>
	new Promise(function (resolve, reject) {
	API.get("/family/employee_id?employee_id=" + encodeURIComponent(employee_id))
		.then(async (res) => {
			resolve(res.data);
		})
		.catch((err) => {
			reject(err);
		});
}),
	// Still needed: records whose employee could not be resolved carry no id
	// and are findable only by name.
	getFamilyOnEmployee: (employee_name) => 
	new Promise(function (resolve, reject) {
	API.get("/family/employee_name?employee_name=" + encodeURIComponent(employee_name))
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
