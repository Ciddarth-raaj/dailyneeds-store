import API from "../../../util/api";

/**
 * LIVE data: the backend /stock-audit endpoints (dailyneeds-store-backend
 * routes/stock_audit.js). Same methods and shapes as the sample adapter, so
 * the screens do not know which one they use. Store scope and permissions
 * are decided by the backend; a screen only narrows.
 */
const unwrap = (body) => {
  if (body && body.code && body.code !== 200) throw Object.assign(new Error(body.msg || "Request failed"), { code: body.code });
  return body ? body.data : null;
};
/** axios rejects statuses >= 429 (see util/api.js): keep the server's message. */
const fail = (err) => {
  const body = err && err.response && err.response.data;
  throw Object.assign(new Error((body && body.msg) || (err && err.message) || "Request failed"), { code: body && body.code });
};
const get = (url, params) => API.get(url, { params }).then((res) => unwrap(res.data), fail);
const send = (method, url, data) => API.request({ method, url, data }).then((res) => unwrap(res.data), fail);
const one = (outlets) => (outlets && outlets.length === 1 ? outlets[0] : undefined);

export const apiAdapter = {
  source: "LIVE",
  meta: () => get("/stock-audit/meta"),
  stores: ({ outlets, period } = {}) => get("/stock-audit/stores", { outlet_id: one(outlets), period }),
  store: ({ outletId, period }) => get(`/stock-audit/stores/${Number(outletId)}`, { period }),
  employees: ({ outlets, search, page, size, sort, period } = {}) => get("/stock-audit/employees", { outlet_id: one(outlets), search: search || undefined, page, size, sort, period }),
  employee: ({ rpUserId, period }) => get(`/stock-audit/employees/${encodeURIComponent(rpUserId)}`, { period }),
  my: ({ period } = {}) => get("/stock-audit/my", { period }),
  articles: ({ rpUserId, page, size, period, self = false }) =>
    get(self ? `/stock-audit/my/${encodeURIComponent(rpUserId)}/articles` : `/stock-audit/employees/${encodeURIComponent(rpUserId)}/articles`, { page, size, period }),
  verifications: ({ outletId, page, size, period } = {}) => get("/stock-audit/verifications", { outlet_id: outletId || undefined, page, size, period }),
  variances: ({ outletId, kind, page, size, period } = {}) => get("/stock-audit/variances", { outlet_id: outletId || undefined, kind: kind || undefined, page, size, period }),
  management: ({ period } = {}) => get("/stock-audit/management", { period }),
  standings: ({ period } = {}) => get("/stock-audit/sapl/standings", { period }),
  seasons: () => get("/stock-audit/sapl/seasons"),
  updateSeason: (id, body) => send("put", `/stock-audit/sapl/seasons/${id}`, body),
  createSeason: (body) => send("post", "/stock-audit/sapl/seasons", body),
  syncRuns: () => get("/stock-audit/sync"),
  startSync: (kind) => send("post", "/stock-audit/sync", { kind }),
  approvals: ({ period } = {}) => get("/stock-audit/approvals", { period }),
  policyVersions: () => get("/stock-audit/policy-versions"),
  allotmentUploads: () => get("/stock-audit/allotment/uploads"),
  validateAllotment: ({ period_code, files }) => send("post", "/stock-audit/allotment/validate", { period_code, files }),
  confirmAllotment: (batchId) => send("post", `/stock-audit/allotment/uploads/${batchId}/confirm`),
  discardAllotment: (batchId) => send("post", `/stock-audit/allotment/uploads/${batchId}/discard`),
  mapping: () => get("/stock-audit/mapping"),
  mappingEmployees: () => get("/stock-audit/mapping/employees"),
  setMapping: (rpUserId, employeeId) => send("put", `/stock-audit/mapping/${encodeURIComponent(rpUserId)}`, { employee_id: employeeId }),
  cycles: () => get("/stock-audit/cycles"),
  createCycle: (body) => send("post", "/stock-audit/cycles", body),
  hrReport: ({ date, period } = {}) => get("/stock-audit/hr/report", { date, period }),
};
