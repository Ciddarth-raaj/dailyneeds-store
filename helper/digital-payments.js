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
