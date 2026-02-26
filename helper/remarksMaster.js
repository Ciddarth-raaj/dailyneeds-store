import API from "../util/api";

/**
 * Remarks Master API - see backend docs/remarks_master_api.md
 * Base path: /remarks-master
 */

export const getRemarks = () => {
  return API.get("/remarks-master").then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to fetch remarks");
  });
};

export const getRemarkById = (id) => {
  return API.get(`/remarks-master/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    if (res.data?.code === 404) return null;
    throw new Error(res.data?.msg || "Failed to fetch remark");
  });
};

export const createRemark = (body) => {
  return API.post("/remarks-master", body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to create remark");
  });
};

export const updateRemark = (id, body) => {
  return API.put(`/remarks-master/${id}`, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to update remark");
  });
};

export const deleteRemark = (id) => {
  return API.delete(`/remarks-master/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to delete remark");
  });
};
