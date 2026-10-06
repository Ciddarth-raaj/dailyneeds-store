import API from "../util/api";

/**
 * Payroll Reports - `/reports/payroll`, exactly as `routes/payroll_report.js`
 * defines it. Requests carry semantic field keys and values only.
 *
 * JSON calls resolve `res.data` like the rest of `helper/`, so a refusal
 * arrives as `{ code, error, msg }` and callers check `code >= 400`. Files
 * resolve `{ filename }` once saved, or throw `PayrollReportFileError`
 * carrying the server's code and detail - a 409 BLOCKED_EMPLOYEES needs its
 * blocked list shown, not a generic "download failed". The statutory files
 * take the month (and ESI zero-day reasons) only: there is no column list
 * and no partial-file option.
 */

const BASE = "/reports/payroll";

export class PayrollReportFileError extends Error {
  constructor(body, status) {
    super((body && body.msg) || "The file could not be produced");
    this.name = "PayrollReportFileError";
    this.status = status;
    this.code = (body && body.error) || null;
    this.detail = body || {};
  }
}

const blobText = (blob) =>
  new Promise((resolve) => {
    if (!blob || typeof blob.text !== "function") return resolve("");
    blob.text().then(resolve).catch(() => resolve(""));
  });

/** POST for a file; an error body arrives as a blob and is read back, never saved to disk. */
async function download(path, body, fallbackName) {
  const res = await API.request({
    method: "POST",
    url: `${BASE}${path}`,
    data: body,
    responseType: "blob",
    transformResponse: [(data) => data],
  });
  if (res.status !== 200) {
    let parsed = null;
    try {
      parsed = JSON.parse(await blobText(res.data));
    } catch (err) {
      parsed = null;
    }
    throw new PayrollReportFileError(parsed, res.status);
  }
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
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return { filename };
}

const data = (promise) => promise.then((res) => res.data);

const payrollReport = {
  /* discovery */
  getMeta: () => data(API.get(`${BASE}/meta`)),
  getMonths: () => data(API.get(`${BASE}/months`)),

  /* month-wise layout: user + report type + payroll month */
  getLayout: (params) => data(API.get(`${BASE}/layout`, { params })),
  saveLayout: (payload) => data(API.put(`${BASE}/layout`, payload)),
  resetLayout: (params) => data(API.delete(`${BASE}/layout`, { params })),
  copyPreviousMonth: (payload) => data(API.post(`${BASE}/layout/copy-previous`, payload)),

  /* templates */
  listTemplates: (reportType) => data(API.get(`${BASE}/templates`, { params: { report_type: reportType } })),
  createTemplate: (payload) => data(API.post(`${BASE}/templates`, payload)),
  updateTemplate: (templateId, payload) => data(API.put(`${BASE}/templates/${templateId}`, payload)),
  renameTemplate: (templateId, templateName) =>
    data(API.patch(`${BASE}/templates/${templateId}/name`, { template_name: templateName })),
  duplicateTemplate: (templateId, templateName) =>
    data(API.post(`${BASE}/templates/${templateId}/duplicate`, { template_name: templateName })),
  deleteTemplate: (templateId) => data(API.delete(`${BASE}/templates/${templateId}`)),
  setDefaultTemplate: (reportType, templateId) =>
    data(API.put(`${BASE}/default-template`, { report_type: reportType, template_id: templateId })),

  /* the report */
  preview: (payload) => data(API.post(`${BASE}/preview`, payload)),
  exportXlsx: (payload) => download("/export/xlsx", payload, "payroll-report.xlsx"),
  exportPdf: (payload) => download("/export/pdf", payload, "payroll-report.pdf"),

  /* statutory files - generated for download; nothing is sent to EPFO or ESIC */
  getEpfValidation: (params) => data(API.get(`${BASE}/epf/validation`, { params })),
  downloadEcr: (payload) => download("/epf/ecr", payload, "ECR.txt"),
  getEsiValidation: (payload) => data(API.post(`${BASE}/esi/validation`, payload)),
  downloadEsiContribution: (payload) => download("/esi/contribution-file", payload, "ESIC_Contribution.xls"),

  /* Cash Payment Excel - the month only; refused unless every Cash employee is finalized */
  downloadCashPayment: (payload) => download("/cash-payment/xlsx", payload, "Cash Payment.xlsx"),
};

export default payrollReport;
