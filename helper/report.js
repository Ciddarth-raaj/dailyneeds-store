import API from "../util/api";

/**
 * The /reports API surface, as the backend actually defines it.
 *
 * Every path here was read from `routes/employee_report.js`; nothing is
 * invented. Two permissions matter: `view_reports` for everything except the
 * exports, `export_reports` for those.
 *
 * WHAT A REQUEST MAY CONTAIN. Semantic field keys, filter values, a template
 * id, a page number. There is no field on any call below that carries a column
 * name, a sort expression or anything else the server would treat as SQL - the
 * server assembles all of that from its own catalogue, and would refuse an
 * invented key rather than interpolate it. Do not add one here either.
 *
 * ERRORS ARE MEANINGFUL, so these do not flatten them. `preview` and the
 * template calls resolve `res.data` like the rest of `helper/`, which means a
 * caller can receive `{ code, error, msg }` instead of the happy shape - and
 * must, because a 409 FILTER_WIDENED and a 422 TOO_MANY_ROWS need different
 * things said to the user. The exports are different: they resolve a file or
 * throw a typed error, because a failed download has no partial answer to
 * show.
 */

/** The two refusals a caller has to be able to tell apart by name. */
export const REPORT_ERROR = {
  FILTER_WIDENED: "FILTER_WIDENED",
  TOO_MANY_ROWS: "TOO_MANY_ROWS",
  EXPORT_FORBIDDEN: "EXPORT_FORBIDDEN",
  TEMPLATE_FORBIDDEN: "TEMPLATE_FORBIDDEN",
  TEMPLATE_NOT_FOUND: "TEMPLATE_NOT_FOUND",
};

const BASE = "/reports/employee-master";

/**
 * An export failure carries the server's own code and detail, so the UI can
 * offer the right next step - acknowledge and retry, or narrow the filters -
 * rather than a generic "download failed".
 */
export class ReportExportError extends Error {
  constructor(body, status) {
    super((body && body.msg) || "The export could not be produced");
    this.name = "ReportExportError";
    this.status = status;
    this.code = (body && body.error) || null;
    this.detail = body || {};
  }
}

/** Read a Blob back as text, so a JSON error body inside one can be parsed. */
const blobText = (blob) =>
  new Promise((resolve) => {
    if (!blob || typeof blob.text !== "function") return resolve("");
    blob.text().then(resolve).catch(() => resolve(""));
  });

/**
 * Ask for a file.
 *
 * The response is requested as a blob, so an ERROR body arrives as a blob too
 * and has to be read back and parsed - otherwise a 409 would be saved to the
 * user's disk as a file called `report.xlsx` containing JSON, which is exactly
 * the sort of thing somebody opens in six months and believes.
 */
async function download(path, body, fallbackName) {
  const res = await API.request({
    method: "POST",
    url: `${BASE}${path}`,
    data: body,
    responseType: "blob",
    transformResponse: [(data) => data],
  });

  if (res.status !== 200) {
    const text = await blobText(res.data);
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      parsed = null;
    }
    throw new ReportExportError(parsed, res.status);
  }

  // The server names the file; `Content-Disposition` is not readable
  // cross-origin without an expose header, so fall back to a sane name rather
  // than to `download`.
  const disposition = res.headers && res.headers["content-disposition"];
  const match = disposition && /filename="([^"]+)"/.exec(disposition);
  const filename = match ? match[1] : fallbackName;

  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoked on the next tick: revoking immediately can cancel the download in
  // some browsers before it has started reading the object.
  setTimeout(() => URL.revokeObjectURL(url), 0);

  return { filename };
}

const report = {
  /* ------------------------------------------------------------ discovery */

  /**
   * GET /reports/employee-master/fields — view_reports.
   *
   * The field catalogue as THIS caller may see it: fields they lack the
   * permission for are absent, not disabled. Also carries `max_fields`,
   * `max_rows` and `can_export`, so the screen can show its own limits without
   * hardcoding numbers the server owns.
   */
  getFields: () =>
    new Promise((resolve, reject) => {
      API.get(`${BASE}/fields`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /* ------------------------------------------------------------ templates */

  /** GET /templates — view_reports. Every system and shared report, plus your own. */
  listTemplates: () =>
    new Promise((resolve, reject) => {
      API.get(`${BASE}/templates`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /** POST /templates — view_reports. Sharing additionally needs manage_shared_report_templates. */
  createTemplate: (payload) =>
    new Promise((resolve, reject) => {
      API.post(`${BASE}/templates`, payload)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  updateTemplate: (templateId, payload) =>
    new Promise((resolve, reject) => {
      API.put(`${BASE}/templates/${templateId}`, payload)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  deleteTemplate: (templateId) =>
    new Promise((resolve, reject) => {
      API.delete(`${BASE}/templates/${templateId}`)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /**
   * POST /templates/:id/copy — view_reports.
   *
   * The route everyone has for a report they may run but not edit, which is
   * what makes the built-in reports read-only without making them useless.
   */
  copyTemplate: (templateId, templateName) =>
    new Promise((resolve, reject) => {
      API.post(`${BASE}/templates/${templateId}/copy`, { template_name: templateName })
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /* -------------------------------------------------------------- running */

  /**
   * POST /preview — view_reports.
   *
   * POST rather than GET because the body carries an ORDERED field list and
   * several id arrays, which do not survive a query string honestly - and a
   * preview of a PAN column does not belong in an access log URL.
   *
   * `matching_count` is the whole matching set, not the page, and it is the
   * number of rows an export will contain.
   */
  preview: (payload) =>
    new Promise((resolve, reject) => {
      API.post(`${BASE}/preview`, payload)
        .then((res) => resolve(res.data))
        .catch(reject);
    }),

  /* --------------------------------------------------------------- export */

  /** POST /export/xlsx — export_reports. Streamed; resolves once the file is saved. */
  exportXlsx: (payload) => download("/export/xlsx", payload, "employee-master.xlsx"),

  /** POST /export/csv — export_reports. */
  exportCsv: (payload) => download("/export/csv", payload, "employee-master.csv"),
};

export default report;
