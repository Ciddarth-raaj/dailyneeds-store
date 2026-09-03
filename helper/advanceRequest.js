import API from "../util/api";

/** Drops empty filters so they never reach the API as "undefined". */
const toQueryString = (filters = {}) => {
  const params = new URLSearchParams();

  Object.keys(filters).forEach((key) => {
    const value = filters[key];
    if (value === undefined || value === null || value === "") return;
    params.append(key, value);
  });

  return params.toString();
};

export const getAllAdvanceRequests = async (filters = {}) => {
  const response = await API.get(`/advance-request?${toQueryString(filters)}`);
  return response.data;
};

export const getAdvanceRequestById = async (id) => {
  const response = await API.get(`/advance-request/${id}`);
  return response.data;
};

export const createAdvanceRequest = async (params) => {
  const response = await API.post(`/advance-request`, params);
  return response.data;
};

export const updateAdvanceRequest = async (id, params) => {
  const response = await API.patch(`/advance-request/${id}`, params);
  return response.data;
};

/** A1.1 - records the supplier's pending bills and previous advance balance. */
export const submitBalanceCheck = async (id, params) => {
  const response = await API.patch(
    `/advance-request/${id}/balance-check`,
    params
  );
  return response.data;
};

/** A1.2 - purchase decide what to do about the balance accounts found. */
export const submitBalanceAction = async (id, params) => {
  const response = await API.patch(
    `/advance-request/${id}/balance-action`,
    params
  );
  return response.data;
};

/** A2 - the admin approves, holds, or rejects. */
export const submitApproval = async (id, params) => {
  const response = await API.patch(`/advance-request/${id}/approval`, params);
  return response.data;
};

/**
 * A3 - close an approved request. The payment is made in Tally, so there is
 * nothing to send; the advice goes up through addAdvanceRequestDocument.
 */
export const submitPayment = async (id) => {
  const response = await API.patch(`/advance-request/${id}/payment`, {});
  return response.data;
};

/**
 * Attaches a file that has already been uploaded through POST /asset — only
 * its URL is stored against the request.
 */
export const addAdvanceRequestDocument = async (id, stage, fileUrl) => {
  const response = await API.post(`/advance-request/${id}/documents`, {
    stage,
    file_url: fileUrl,
  });
  return response.data;
};
