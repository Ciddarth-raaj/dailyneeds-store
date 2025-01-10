import moment from "moment";
import API from "../util/api";

export const getAllAccounts = (filters = {}) => {
  return new Promise(async function (resolve, reject) {
    try {
      const queryParams = new URLSearchParams();
      if (filters.store_id) queryParams.append("store_id", filters.store_id);
      if (filters.from_date) queryParams.append("from_date", filters.from_date);
      if (filters.to_date) queryParams.append("to_date", filters.to_date);

      const url = `/accounts${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;
      const data = await API.get(url);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAccountById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.get(`/accounts/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createAccount = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.post("/accounts", params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateAccount = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.put(`/accounts/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteAccount = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.delete(`/accounts/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const saveAccountSheet = async (params) => {
  try {
    const response = await API.post("/accounts/save", {
      sheet_date: params.sheet_date,
      store_id: params.store_id,
    });
    return response.data;
  } catch (err) {
    console.error("Error saving account sheet:", err);
    throw err;
  }
};

export const unsaveAccountSheet = async (params) => {
  try {
    const queryParams = new URLSearchParams({
      sheet_date: params.sheet_date,
      store_id: params.store_id,
    });

    const response = await API.delete(
      `/accounts/save?${queryParams.toString()}`
    );
    return response.data;
  } catch (err) {
    console.error("Error unsaving account sheet:", err);
    throw err;
  }
};

export const checkSheetSaved = async (params) => {
  try {
    const response = await API.get(
      `/accounts/check-saved?date=${params.date}&store_id=${params.store_id}`
    );
    return response.data;
  } catch (err) {
    console.error("Error checking account sheet:", err);
    throw err;
  }
};

export const createWarehouseSale = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Format date if it's a Date object
      const formattedParams = {
        ...params,
        date:
          typeof params.date === "string"
            ? params.date
            : params.date.toISOString().slice(0, 10),
      };

      const response = await API.post(
        "/accounts/warehouse-sales",
        formattedParams
      );
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateWarehouseSale = (id, params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const formattedParams = {
        ...params,
        date: moment(params.date).format("YYYY-MM-DD"),
      };

      const response = await API.put(
        `/accounts/warehouse-sales/${id}`,
        formattedParams
      );
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const deleteWarehouseSale = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await API.delete(`/accounts/warehouse-sales/${id}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getAllWarehouseSales = (filters = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const queryParams = new URLSearchParams();

      // Add date filters if provided
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

      const url = `/accounts/warehouse-sales${
        queryParams.toString() ? `?${queryParams.toString()}` : ""
      }`;

      const response = await API.get(url);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getWarehouseSaleById = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await API.get(`/accounts/warehouse-sales/${id}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};
