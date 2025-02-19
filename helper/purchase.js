import API from "../util/api";

export const getAllPurchases = async () => {
  try {
    const response = await API.get(`/purchase`);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
