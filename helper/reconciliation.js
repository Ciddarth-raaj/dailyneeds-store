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
