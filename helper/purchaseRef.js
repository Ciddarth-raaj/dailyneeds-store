import API from "../util/api";

export const getPurchaseRef = () => {
  return API.get("/purchase-ref").then((res) => {
    const data = res?.data ?? res;
    if (data?.code === 200) return data;
    throw new Error(data?.msg || "Failed to fetch Purchase Ref");
  });
};
