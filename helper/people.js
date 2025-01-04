import API from "../util/api";

export const getAllPeople = () => {
  return new Promise(async function (resolve, reject) {
    try {
      const data = await API.get("/people");
      resolve(data.data);
    } catch (err) {
      reject(err);
    }
  });
};
