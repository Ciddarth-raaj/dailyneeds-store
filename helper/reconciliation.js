import API from "../util/api";

export const saveReconciliation = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const formattedParams = {
        ...params,
        bill_date:
          typeof params.bill_date === "string"
            ? params.bill_date
            : params.bill_date.toISOString().slice(0, 19).replace("T", " "),
        loyalty_diff: params.loyalty_diff ? parseFloat(params.loyalty_diff) : 0,
        sales_diff: params.sales_diff ? parseFloat(params.sales_diff) : 0,
        return_diff: params.return_diff ? parseFloat(params.return_diff) : 0,
      };

      const response = await API.post("/reconciliation/sales", formattedParams);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

const diffFormatter = (value) => {
  if (!value) {
    return undefined;
  }

  return value || value == 0 ? parseFloat(value) : null;
};

export const saveReconciliationEpayment = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const formattedParams = {
        ...params,
        bill_date:
          typeof params.bill_date === "string"
            ? params.bill_date
            : params.bill_date.toISOString().slice(0, 19).replace("T", " "),
        card_diff: diffFormatter(params.card_diff),
        upi_diff: diffFormatter(params.upi_diff),
        sodexo_diff: diffFormatter(params.sodexo_diff),
        paytm_diff: diffFormatter(params.paytm_diff),
        card_settled: false,
        upi_settled: false,
        sodexo_settled: false,
        paytm_settled: false,
      };

      const response = await API.post(
        "/reconciliation/epayment",
        formattedParams
      );
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getReconciliationData = (filters = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();

      if (filters.store_id) {
        queryParams.append("store_id", filters.store_id);
      }

      if (filters.from_date) {
        const fromDate =
          typeof filters.from_date === "string"
            ? filters.from_date
            : filters.from_date.toISOString().slice(0, 10);
        queryParams.append("from_date", fromDate);
      }

      if (filters.to_date) {
        const toDate =
          typeof filters.to_date === "string"
            ? filters.to_date
            : filters.to_date.toISOString().slice(0, 10);
        queryParams.append("to_date", toDate);
      }

      const url = `/reconciliation/sales${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;

      const response = await API.get(url);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getReconciliationEpaymentData = (filters = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();

      if (filters.store_id) {
        queryParams.append("store_id", filters.store_id);
      }

      if (filters.from_date) {
        const fromDate =
          typeof filters.from_date === "string"
            ? filters.from_date
            : filters.from_date.toISOString().slice(0, 10);
        queryParams.append("from_date", fromDate);
      }

      if (filters.to_date) {
        const toDate =
          typeof filters.to_date === "string"
            ? filters.to_date
            : filters.to_date.toISOString().slice(0, 10);
        queryParams.append("to_date", toDate);
      }

      const url = `/reconciliation/epayment${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;

      const response = await API.get(url);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteReconciliationEpayment = (date) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await API.delete(`/reconciliation/epayment/${date}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};
