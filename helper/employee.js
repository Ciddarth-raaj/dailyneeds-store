import API from "../util/api";
import moment from "moment";

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
    getAnniversary: () =>
        new Promise(function (resolve, reject) {
            API.get("/employee/anniversary")
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
    getBirthday: () =>
        new Promise(function (resolve, reject) {
            API.get("/employee/birthday")
                .then(async (res) => {
                    resolve(employee.formatBrand(res.data));
                })
                .catch((err) => {
                    reject(err);
                });
        }),
        formatBrand: (data) => {
            const formattedData = [];
            for (const d of data) {
                formattedData.push({
                    birthday: d.birthday,
                    dob: moment(d.dob).format("DD MMMM YYYY"),
                });
            }
    
            return formattedData;
        },
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