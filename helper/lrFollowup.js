import API from "../util/api";
import { toQueryString } from "../util/lrFollowup";

/**
 * Purchase / LR Follow-up, Credit Purchase and Transporter Master API calls.
 * Each returns the response body; an error body carries `code` and `msg`.
 */

// ------------------------------------------------------------ LR Follow-up

export const getLrFollowupSummary = async () => (await API.get(`/lr-followup/summary`)).data;

export const getLrFollowups = async (filters = {}) =>
  (await API.get(`/lr-followup?${toQueryString(filters)}`)).data;

export const getLrFollowup = async (id) => (await API.get(`/lr-followup/${id}`)).data;

export const getLrFollowupBySource = async (sourceType, sourceId) =>
  (await API.get(`/lr-followup/by-source/${sourceType}/${sourceId}`)).data;

export const updateLrDetails = async (id, payload) => (await API.patch(`/lr-followup/${id}/lr`, payload)).data;

export const addFollowUp = async (id, payload) => (await API.post(`/lr-followup/${id}/follow-ups`, payload)).data;

export const markGoodsReceived = async (id, payload) =>
  (await API.post(`/lr-followup/${id}/goods-received`, payload)).data;

/** Legacy Follow-up Verification: the decision for a backfilled row. */
export const recordLegacyDecision = async (id, payload) =>
  (await API.post(`/lr-followup/${id}/legacy-decision`, payload)).data;

/** The exceptional close of a live follow-up: refunded, adjusted or cancelled. */
export const closeWithoutReceipt = async (id, payload) =>
  (await API.post(`/lr-followup/${id}/close-without-receipt`, payload)).data;

export const getLegacyQueue = async (filters = {}) =>
  (await API.get(`/lr-followup/legacy?${toQueryString(filters)}`)).data;

export const runLegacyBackfill = async () => (await API.post(`/lr-followup/legacy/backfill`, {})).data;

// --------------------------------------------------------- Credit Purchase

export const getCreditPurchases = async (filters = {}) =>
  (await API.get(`/credit-purchase?${toQueryString(filters)}`)).data;

export const getCreditPurchase = async (id) => (await API.get(`/credit-purchase/${id}`)).data;

export const createCreditPurchase = async (payload) => (await API.post(`/credit-purchase`, payload)).data;

// ------------------------------------------------------ Transporter Master

export const getTransporterOptions = async () => (await API.get(`/transporter-master/options`)).data;

export const getTransporters = async (filters = {}) =>
  (await API.get(`/transporter-master?${toQueryString(filters)}`)).data;

export const getTransporter = async (id) => (await API.get(`/transporter-master/${id}`)).data;

export const createTransporter = async (payload) => (await API.post(`/transporter-master`, payload)).data;

export const updateTransporter = async (id, payload) =>
  (await API.patch(`/transporter-master/${id}`, payload)).data;

/** Unwraps `{ code: 200, data }`, or throws the server's message. */
export function unwrap(body) {
  if (body && body.code === 200 && body.data !== undefined) return body.data;
  const err = new Error((body && body.msg) || "Something went wrong");
  err.code = body && body.code;
  err.errors = body && body.errors;
  throw err;
}
