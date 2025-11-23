import API from "../util/api";

export const getAllTelegramDepartments = async (filters = {}) => {
  try {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      params.append(key, filters[key]);
    });
    const queryString = params.toString();

    const response = await API.get(`/telegram-departments?${queryString}`);
    return response.data;
  } catch (err) {
    console.log(err);
    throw err;
  }
};

export const getTelegramDepartmentById = (id) => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.get(`/telegram-departments/${id}`);
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
