import API from "../util/api";

const invoice = {
  // Get invoice by ID
  getInvoiceById: (invoiceId) =>
    new Promise(function (resolve, reject) {
      API.get(`/invoice/${invoiceId}`)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to fetch invoice");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Create new invoice
  createInvoice: (data) =>
    new Promise(function (resolve, reject) {
      API.post("/invoice/create", data)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to create invoice");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Update existing invoice
  updateInvoice: (invoiceId, data) =>
    new Promise(function (resolve, reject) {
      API.put(`/invoice/${invoiceId}/with-items`, data)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to update invoice");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Delete invoice
  deleteInvoice: (invoiceId) =>
    new Promise(function (resolve, reject) {
      API.delete(`/invoice/${invoiceId}`)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to delete invoice");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),

  // Get all invoices with optional filters
  getAllInvoices: (filters = {}) =>
    new Promise(function (resolve, reject) {
      const queryParams = new URLSearchParams();
      if (filters.offset) queryParams.append("offset", filters.offset);
      if (filters.limit) queryParams.append("limit", filters.limit);

      const url = `/invoice${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      
      API.get(url)
        .then(async (res) => {
          if (res.status === 200) {
            resolve(res.data);
          } else {
            reject(res.data.msg || "Failed to fetch invoices");
          }
        })
        .catch((err) => {
          reject(err);
        });
    }),
};

export default invoice;
