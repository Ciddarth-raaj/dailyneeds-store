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

export const getAllTickets = async (filters = {}) => {
  const response = await API.get(`/ticket?${toQueryString(filters)}`);
  return response.data;
};

export const getTicketSummary = async (filters = {}) => {
  const response = await API.get(`/ticket/summary?${toQueryString(filters)}`);
  return response.data;
};

export const getTicketById = async (id) => {
  const response = await API.get(`/ticket/${id}`);
  return response.data;
};

export const createTicket = async (params) => {
  const response = await API.post(`/ticket`, params);
  return response.data;
};

export const updateTicket = async (id, params) => {
  const response = await API.put(`/ticket/${id}`, params);
  return response.data;
};

export const deleteTicket = async (id) => {
  const response = await API.delete(`/ticket/${id}`);
  return response.data;
};

// -------------------------------------------------------------- comments

export const getTicketComments = async (id) => {
  const response = await API.get(`/ticket/${id}/comments`);
  return response.data;
};

export const addTicketComment = async (id, comment) => {
  const response = await API.post(`/ticket/${id}/comments`, { comment });
  return response.data;
};

export const deleteTicketComment = async (commentId) => {
  const response = await API.delete(`/ticket/comments/${commentId}`);
  return response.data;
};

// ------------------------------------------------------------- checklist

export const getTicketChecklist = async (id) => {
  const response = await API.get(`/ticket/${id}/checklist`);
  return response.data;
};

export const addChecklistItem = async (id, title) => {
  const response = await API.post(`/ticket/${id}/checklist`, { title });
  return response.data;
};

export const updateChecklistItem = async (checklistItemId, params) => {
  const response = await API.put(`/ticket/checklist/${checklistItemId}`, params);
  return response.data;
};

export const deleteChecklistItem = async (checklistItemId) => {
  const response = await API.delete(`/ticket/checklist/${checklistItemId}`);
  return response.data;
};

// ------------------------------------------------------------ recurrences

export const getRecurrences = async () => {
  const response = await API.get(`/ticket/recurrences`);
  return response.data;
};

export const updateRecurrence = async (recurrenceId, params) => {
  const response = await API.put(`/ticket/recurrences/${recurrenceId}`, params);
  return response.data;
};

export const deleteRecurrence = async (recurrenceId) => {
  const response = await API.delete(`/ticket/recurrences/${recurrenceId}`);
  return response.data;
};

export const runRecurrencesNow = async () => {
  const response = await API.post(`/ticket/recurrences/run`, {});
  return response.data;
};
