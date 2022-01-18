import API from "../util/api";

const vehicle = {
	getVehicle: () =>
		new Promise(function (resolve, reject) {
			API.get("/vehicle")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	getVehicleDet: (offset, limit) =>
		new Promise(function (resolve, reject) {
			API.get(`/vehicle/vehicledet?offset=${offset}&limit=${limit}`)
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
	createVehicle: (data) =>
	new Promise(function (resolve, reject) {
		API.post("/vehicle/create", data)
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
	getVehicleCount: () =>
		new Promise(function (resolve, reject) {
			API.get("/vehicle/vehiclecount")
				.then(async (res) => {
					resolve(res.data);
				})
				.catch((err) => {
					reject(err);
				});
		}),
		updateVehicle: (data) =>
		new Promise(function (resolve, reject) {
			API.post("/vehicle/update-vehicle", data)
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
		getVehicleById: (vehicle_id) => 
		new Promise(function (resolve, reject) {
		API.get("/vehicle/vehicle_id?vehicle_id="+vehicle_id)
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
export default vehicle;
