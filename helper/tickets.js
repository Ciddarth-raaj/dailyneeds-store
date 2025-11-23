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

export const getTicketById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.get(`/ticket/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const createTicket = (params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.post(`/ticket`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};

export const updateTicket = (id, params) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.put(`/ticket/${id}`, params);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
