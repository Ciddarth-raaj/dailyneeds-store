import API from "../util/api";

export const getGrnList = ({ from_date, to_date } = {}) => {
  const params = {};
  if (from_date) params.from_date = from_date;
  if (to_date) params.to_date = to_date;

  return API.get("/grn/list", { params }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch GRN list");
  });
};

export const getGrnDetail = (refno) => {
  return API.get("/grn/detail", {
    params: { refno },
  }).then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    if (data?.code === 404) {
      throw new Error(data?.msg || "GRN not found");
    }
    throw new Error(data?.msg || "Failed to fetch GRN detail");
  });
};
