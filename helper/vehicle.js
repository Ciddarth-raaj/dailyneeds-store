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
};
export default vehicle;
