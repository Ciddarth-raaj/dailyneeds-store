import API from "../util/api";

const salary = {
	getSalary: () =>
		new Promise(function (resolve, reject) {
			API.get("/salary")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	updateStatus: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/salary/update-status", data)
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
	updatePaidStatus: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/salary/update-paidstatus", data)
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
    createSalary: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/salary/create", data)
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
	getSalaryById: (payment_id) => 
		new Promise(function (resolve, reject) {
		API.get("/salary/payment_id?payment_id= " + payment_id)
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
	getSalaryOnStore: (store_name) => 
	new Promise(function (resolve, reject) {
	API.get("/salary/store_name?store_name= " + store_name)
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
	updateSalary: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/salary/update-salary", data)
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
export default salary;
