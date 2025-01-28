import API from "../util/api";

export const createDigitalPayment = (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const formattedParams = {
        ...params,
      };

      // Remove null values
      Object.keys(formattedParams).forEach((key) => {
        if (formattedParams[key] === null) {
          delete formattedParams[key];
        }
      });

      const response = await API.post("/digital-payments", formattedParams);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getDigitalPayments = () => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await API.get("/digital-payments");
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const getDigitalPaymentById = (id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const response = await API.get(`/digital-payments/${id}`);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateDigitalPayment = (id, params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = {
        bank_mid: params.bank_mid,
        bank_tid: params.bank_tid,
        api_key: params.api_key,
        payment_mid: params.payment_mid,
        payment_tid: params.payment_tid,
        paytm_aggregator_id: params.paytm_aggregator_id,
        pluxe_outlet_id: params.pluxe_outlet_id,
        s_no: params.s_no,
      };
      const response = await API.put(`/digital-payments/${id}`, data);
      resolve(response.data);
    } catch (err) {
      reject(err);
    }
  });
};
