import API from "../util/api";

/**
 * The Shift Change Eligibility Report, as
 * `routes/attendance_shift_change_report.js` defines it.
 *
 *   GET /attendance/reports/shift-change-eligibility
 *       view_shift_change_eligibility_report
 *   GET /attendance/reports/shift-change-eligibility/export.xlsx
 *       + export_shift_change_eligibility_report
 *
 * "Can Raise Shift Change?" is decided by the SERVER, by the very rule that
 * accepts or refuses the employee's own request
 * (`utils/shift_change_eligibility.js`). Nothing in the browser re-states it:
 * this helper sends filters and the screen renders what comes back. That is
 * why the report and the Telegram Mini App cannot disagree about who may
 * raise a request.
 *
 * Both calls take the SAME filters and are subject to the SAME permission and
 * branch scope - the export is not a second query, it is this one again.
 *
 * Refusals arrive as `{ code: 403, msg }` like every other helper; the screen
 * unwraps them. The export resolves once the file is saved.
 */

const EXPORT_ERROR = "The export could not be produced";

async function blobText(blob) {
  if (!blob) return "";
  if (typeof blob.text === "function") return blob.text();
  return "";
}

/**
 * GET the spreadsheet with the session token, save it, or throw the server's
 * own message.
 *
 * `responseType: "blob"` with the transform disabled, because a REFUSAL comes
 * back as JSON on the same endpoint: it is read out of the blob and rethrown
 * with its message, rather than being saved as a 40-byte .xlsx that opens to
 * an error nobody can read.
 */
async function downloadXlsx(path, params, fallbackName) {
  const res = await API.request({
    method: "GET",
    url: path,
    params,
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
    const error = new Error((parsed && parsed.msg) || EXPORT_ERROR);
    error.code = parsed ? parsed.code : res.status;
    throw error;
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
  return filename;
}

const get = (url, params) =>
  new Promise((resolve, reject) => {
    API.get(url, { params })
      .then((res) => resolve(res.data))
      .catch(reject);
  });

/**
 * The WRITE calls live on their own router, behind
 * `manage_shift_change_eligibility` - NOT the report's read key. A person who
 * may open this screen may not necessarily block anybody, and the server is
 * what enforces that; hiding a button is presentation.
 *
 * NO OUTLET OR STORE ID IS SENT. The employee's branch is a fact the server
 * looks up, so there is nothing here for a crafted request to lie about.
 */
const post = (url, body) =>
  new Promise((resolve, reject) => {
    API.post(url, body)
      .then((res) => resolve(res.data))
      .catch(reject);
  });

const BLOCK_URL = "/attendance/shift-change-eligibility/block";

const attendanceShiftChangeEligibility = {
  getReport: (params) => get("/attendance/reports/shift-change-eligibility", params),
  block: ({ employee_id, attendance_date, reason }) =>
    post(BLOCK_URL, { employee_id, attendance_date, reason }),
  unblock: ({ employee_id, attendance_date, removal_reason }) =>
    post(`${BLOCK_URL}/remove`, { employee_id, attendance_date, removal_reason }),
  exportXlsx: (params) =>
    downloadXlsx(
      "/attendance/reports/shift-change-eligibility/export.xlsx",
      params,
      "shift-change-eligibility.xlsx"
    ),
};

export default attendanceShiftChangeEligibility;
