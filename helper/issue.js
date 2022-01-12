import API from "../util/api";

const issue = {
    getIssue: () =>
        new Promise(function (resolve, reject) {
            API.get("/issue")
                .then(async (res) => {
                    resolve(issue.format(res.data));
                })
                .catch((err) => {
                    reject(err);
                });
        }),
        format: (data) => {
            const formattedData = [];
            for (const d of data) {
                formattedData.push({
                    indent_id: d.indent_id,
                    indent_number: d.indent_number,
                    store_id: d.store_id,
                    from: d.from,
                    to: d.to,
                    product_id: d.product_id,
                    de_name: d.de_name,
                    sent: d.sent,
                    received: d.received,
                    difference: d.difference,
                    delivery_status: d.delivery_status
                });
            }
    
            return formattedData;
        },
    updateStatus: (data) =>
        new Promise(function (resolve, reject) {
            API.post("/issue/update-status", data)
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
    createIssue: (data) =>
        new Promise(function (resolve, reject) {
            API.post("/issue/create", data)
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
    getIssueByStoreId: (store_id) =>
    new Promise(function (resolve, reject) {
        API.get("/issue/store_id?store_id= " + store_id)
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
    getIssueFromStoreId: (store_id) =>
    new Promise(function (resolve, reject) {
        API.get("/issue/from/store_id?store_id= " + store_id)
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
    getIssueById: (issue_id) =>
        new Promise(function (resolve, reject) {
            API.get("/issue/issue_id?issue_id= " + issue_id)
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
    updateIssue: (data) =>
        new Promise(function (resolve, reject) {
            API.post("/issue/update-issue", data)
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
export default issue;
