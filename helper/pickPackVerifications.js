import API from "../util/api";

const BASE = "/pick-pack-verifications";

/**
 * @param {{ from_date?: string, to_date?: string, job_type?: 'GRN'|'STA' }} params
 */
export const listPickPackVerifications = (params = {}) => {
  return API.get(BASE, { params }).then((res) => {
    if (res.data?.code === 200) {
      return Array.isArray(res.data.data) ? res.data.data : [];
    }
    throw new Error(res.data?.msg || "Failed to fetch verifications");
  });
};

export const getPickPackVerificationById = (id) => {
  return API.get(`${BASE}/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    if (res.data?.code === 404) return null;
    throw new Error(res.data?.msg || "Failed to fetch verification");
  });
};

export const createPickPackVerification = (body) => {
  return API.post(BASE, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to create verification");
  });
};

export const updatePickPackVerification = (id, body) => {
  return API.put(`${BASE}/${id}`, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to update verification");
  });
};

export const deletePickPackVerification = (id) => {
  return API.delete(`${BASE}/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to delete verification");
  });
};
