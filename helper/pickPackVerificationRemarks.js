import API from "../util/api";

/**
 * Pick & Pack Verification Remarks API — base path: /pick-pack-verification-remarks
 */

export const getPickPackVerificationRemarks = (params = {}) => {
  return API.get("/pick-pack-verification-remarks", { params }).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to fetch verification remarks");
  });
};

export const getPickPackVerificationRemarkById = (id) => {
  return API.get(`/pick-pack-verification-remarks/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    if (res.data?.code === 404) return null;
    throw new Error(res.data?.msg || "Failed to fetch verification remark");
  });
};

export const createPickPackVerificationRemark = (body) => {
  return API.post("/pick-pack-verification-remarks", body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to create verification remark");
  });
};

export const updatePickPackVerificationRemark = (id, body) => {
  return API.put(`/pick-pack-verification-remarks/${id}`, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to update verification remark");
  });
};

export const deletePickPackVerificationRemark = (id) => {
  return API.delete(`/pick-pack-verification-remarks/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to delete verification remark");
  });
};
