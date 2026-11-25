import API from "../util/api";

/**
 * The Missing Attendance Report, as `routes/attendance_missing.js` defines it.
 *
 *   GET /attendance/reports/missing               view_missing_attendance_report
 *   GET /attendance/reports/missing/export.xlsx   + export_missing_attendance_report
 *
 * A record is Missing Attendance when an eligible employee recorded a
 * POSITIVE, ODD number of punches on a COMPLETED past attendance date. Zero
 * punches is absence and is not on this report, and today is never on it -
 * today is still being punched into. THE RULE LIVES ON THE SERVER
 * (`utils/attendance_missing.js`) and nothing in the browser re-states it:
 * this helper sends filters and renders what comes back. The same server rule
 * drives the 06:00 Telegram alert, which is why the two agree.
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

const attendanceMissing = {
  getReport: (params) => get("/attendance/reports/missing", params),
  exportXlsx: (params) =>
    downloadXlsx("/attendance/reports/missing/export.xlsx", params, "missing-attendance.xlsx"),
};

export default attendanceMissing;
