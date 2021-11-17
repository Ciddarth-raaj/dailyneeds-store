import API from "../util/api";

const brands = {
    getBrands: (offset, limit) =>
        new Promise(function (resolve, reject) {
            API.get(`/brand?offset=${offset}&limit=${limit}`)
                .then(async (res) => {
                    resolve(res.data);
                })
                .catch((err) => {
                    reject(err);
                });
        }),
    getBrandsCount: () =>
        new Promise(function (resolve, reject) {
            API.get("/brand/brandcount")
                .then(async (res) => {
                    resolve(res.data);
                })
                .catch((err) => {
                    reject(err);
                });
        }),
};
export default brands;
