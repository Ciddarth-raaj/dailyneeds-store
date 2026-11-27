import API from "../../../util/api";
import { withSeason as addSeason } from "./season";

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
/**
 * The SEASON every screen works on (?period=<code>). Kept here, outside React,
 * because the page remounts the module on every navigation; remembered for
 * the browser tab. A request that names its own period keeps it.
 */
const SEASON_KEY = "stockAudit.season";
let selected = (() => {
  try {
    return (typeof window !== "undefined" && window.sessionStorage.getItem(SEASON_KEY)) || null;
  } catch (e) {
    return null;
  }
})();
const withSeason = (params) => addSeason(selected, params);
const get = (url, params) => API.get(url, { params: withSeason(params) }).then((res) => unwrap(res.data), fail);
const send = (method, url, data) => API.request({ method, url, data, params: withSeason(undefined) }).then((res) => unwrap(res.data), fail);
const one = (outlets) => (outlets && outlets.length === 1 ? outlets[0] : undefined);

export const apiAdapter = {
  source: "LIVE",
  getPeriod: () => selected,
  setPeriod: (code) => {
    selected = code || null;
    try {
      if (typeof window !== "undefined") {
        if (selected) window.sessionStorage.setItem(SEASON_KEY, selected);
        else window.sessionStorage.removeItem(SEASON_KEY);
      }
    } catch (e) {
      // private mode / storage blocked: the choice lasts until the page reloads
    }
  },
  meta: () => get("/stock-audit/meta"),
  stores: ({ outlets, period } = {}) => get("/stock-audit/stores", { outlet_id: one(outlets), period }),
  store: ({ outletId, period }) => get(`/stock-audit/stores/${Number(outletId)}`, { period }),
  employees: ({ outlets, search, page, size, sort, period, mapped } = {}) => get("/stock-audit/employees", { outlet_id: one(outlets), search: search || undefined, page, size, sort, period, mapped: mapped === true ? "true" : mapped === false ? "false" : undefined }),
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
  eligibility: ({ period } = {}) => get("/stock-audit/eligibility", { period }),
  takeSnapshot: (outletId) => send("post", `/stock-audit/eligibility/${outletId}/snapshot`),
  requestExclusion: (outletId, employeeId, reason) => send("post", `/stock-audit/eligibility/${outletId}/exclusions`, { employee_id: employeeId, reason }),
  decideExclusion: (id, approve, note) => send("post", `/stock-audit/exclusions/${id}/${approve ? "approve" : "reject"}`, { note }),
  roles: ({ period } = {}) => get("/stock-audit/roles", { period }),
  assignRole: (body) => send("put", "/stock-audit/roles", body),
  settingsView: () => get("/stock-audit/settings"),
  updateSettings: (body) => send("put", "/stock-audit/settings", body),
  hrReport: ({ date, period } = {}) => get("/stock-audit/hr/report", { date, period }),
};
