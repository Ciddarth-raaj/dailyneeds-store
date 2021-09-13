import API from "../util/api";

const employee = {
    getEmployee: () =>
        new Promise(function (resolve, reject) {
            API.get("/employee/employees")
                .then(async (res) => {
                    resolve(res.data);
                })
                .catch((err) => {
                    reject(err);
                });
        }),
    getHeadCount: () =>
        new Promise(function (resolve, reject) {
            API.get("/employee/headcount")
                .then(async (res) => {
                    resolve(res.data);
                })
                .catch((err) => {
                    reject(err);
                });
        }),
    getResignedEmp: () =>
        new Promise(function (resolve, reject) {
            API.get("/employee/resignedemp")
                .then(async (res) => {
                    resolve(res.data);
                })
                .catch((err) => {
                    reject(err);
                });
        }),
    getNewJoiner: () =>
        new Promise(function (resolve, reject) {
            API.get("/employee/newjoiner")
                .then(async (res) => {
                    resolve(res.data);
                })
                .catch((err) => {
                    reject(err);
                });
        }),
    getEmployeeByID: (employee_id) =>
        new Promise(function (resolve, reject) {
            API.get("/employee/employee_id?employee_id=" + employee_id)
                .then(async (res) => {
                    resolve(res.data);
                })
                .catch((err) => {
                    reject(err);
                });
        }),
    register: (data) =>
        new Promise(function (resolve, reject) {
            API.post("/employee", data)
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
    updateEmployeeDetails: (data) =>
        new Promise(function (resolve, reject) {
            API.post("/employee/updatedata", data)
                .then(async (res) => {
                    console.log({ res: res.status });
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
export default employee;