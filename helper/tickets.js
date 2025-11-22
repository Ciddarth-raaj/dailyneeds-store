import API from "../util/api";

export const getAllTickets = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      params.append(key, filters[key]);
    });
    const queryString = params.toString();

    const response = await API.get(`/ticket?${queryString}`);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};
