import API from "../util/api";

const BASE = "/pick-pack-write-off";

/**
 * @param {{ from_date?: string, to_date?: string }} params - YYYY-MM-DD
 */
export const listPickPackWriteOffs = (params = {}) => {
  return API.get(BASE, { params }).then((res) => {
    if (res.data?.code === 200) {
      return Array.isArray(res.data.data) ? res.data.data : [];
    }
    throw new Error(res.data?.msg || "Failed to fetch write-offs");
  });
};

export const getPickPackWriteOffById = (id) => {
  return API.get(`${BASE}/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    if (res.data?.code === 404) return null;
    throw new Error(res.data?.msg || "Failed to fetch write-off");
  });
};

export const createPickPackWriteOff = (body) => {
  return API.post(BASE, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to create write-off");
  });
};

export const updatePickPackWriteOff = (id, body) => {
  return API.put(`${BASE}/${id}`, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to update write-off");
  });
};

export const deletePickPackWriteOff = (id) => {
  return API.delete(`${BASE}/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to delete write-off");
  });
};
