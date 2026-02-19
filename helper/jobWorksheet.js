import API from "../util/api";

/**
 * Job Worksheet API - see backend docs/job-worksheet-api.md
 */

export const getJobWorksheets = (params = {}) => {
  const search = new URLSearchParams();
  if (params.grn_no != null) search.set("grn_no", params.grn_no);
  if (params.supplier_id != null) search.set("supplier_id", params.supplier_id);
  if (params.date_from) search.set("date_from", params.date_from);
  if (params.date_to) search.set("date_to", params.date_to);
  if (params.limit != null) search.set("limit", params.limit);
  if (params.offset != null) search.set("offset", params.offset);
  const qs = search.toString();
  return API.get(`/job-worksheet${qs ? `?${qs}` : ""}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to fetch job worksheets");
  });
};

export const getJobWorksheetById = (id) => {
  return API.get(`/job-worksheet/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    if (res.data?.code === 404) return null;
    throw new Error(res.data?.msg || "Failed to fetch job worksheet");
  });
};

export const getJobWorksheetWithItems = (id) => {
  return API.get(`/job-worksheet/${id}/with-items`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    if (res.data?.code === 404) return null;
    throw new Error(res.data?.msg || "Failed to fetch job worksheet");
  });
};

export const createJobWorksheet = (body) => {
  return API.post("/job-worksheet", body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to create job worksheet");
  });
};

export const updateJobWorksheet = (id, body) => {
  return API.put(`/job-worksheet/${id}`, body).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to update job worksheet");
  });
};

export const deleteJobWorksheet = (id) => {
  return API.delete(`/job-worksheet/${id}`).then((res) => {
    if (res.data?.code === 200) return res.data;
    throw new Error(res.data?.msg || "Failed to delete job worksheet");
  });
};

export const getJobWorksheetItems = (id) => {
  return API.get(`/job-worksheet/${id}/items`).then((res) => {
    if (res.data?.code === 200) return res.data.data;
    throw new Error(res.data?.msg || "Failed to fetch items");
  });
};

/**
 * Update a single job worksheet item.
 * @param {number} worksheetId - Job worksheet ID
 * @param {number} itemId - Job worksheet item ID
 * @param {Object} body - { product_id, qty, mrp, status? }
 */
export const updateJobWorksheetItem = (worksheetId, itemId, body) => {
  return API.put(`/job-worksheet/${worksheetId}/items/${itemId}`, body).then(
    (res) => {
      if (res.data?.code === 200) return res.data;
      throw new Error(res.data?.msg || "Failed to update item");
    }
  );
};
