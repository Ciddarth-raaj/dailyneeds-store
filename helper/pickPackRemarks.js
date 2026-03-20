import API from "../util/api";

/**
 * Pick & Pack Remarks API — same contract as remarks master, base path: /pick-pack-remarks
 */

export const getPickPackRemarks = () => {
  return API.get("/pick-pack-remarks").then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to fetch remarks");
  });
};

export const getPickPackRemarkById = (id) => {
  return API.get(`/pick-pack-remarks/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    if (res.data?.code === 404) return null;
    throw new Error(res.data?.msg || "Failed to fetch remark");
  });
};

export const createPickPackRemark = (body) => {
  return API.post("/pick-pack-remarks", body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to create remark");
  });
};

export const updatePickPackRemark = (id, body) => {
  return API.put(`/pick-pack-remarks/${id}`, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to update remark");
  });
};

export const deletePickPackRemark = (id) => {
  return API.delete(`/pick-pack-remarks/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to delete remark");
  });
};
