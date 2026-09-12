import API from "../util/api";

/**
 * Attendance - Part 1 (raw Biomax punches), as `routes/attendance_raw.js`
 * and `routes/biomax_device.js` define it.
 *
 * Two views, two permissions:
 *
 *   Attendance List  GET /attendance/raw            view_raw_attendance
 *                    one row per employee per attendance date, every punch of
 *                    that day merged whichever terminal recorded it. Filters
 *                    are From/To, HOME outlet, department, search. There is
 *                    deliberately NO device or punch-location filter here and
 *                    the server answers 400 if one is sent.
 *   Punch Audit      GET /attendance/raw/punches    view_attendance_punch_audit
 *                    one row per physical punch; device, punch location,
 *                    source IP and review-status filters live here.
 *
 * Nothing here calculates attendance. The rows are raw punches.
 *
 * Refusals arrive as `{ code: 403, msg }` like every other helper; the
 * screens unwrap them. Exports resolve once the file is saved.
 */

const ATTENDANCE_EXPORT_ERROR = "The export could not be produced";

async function blobText(blob) {
  if (!blob) return "";
  if (typeof blob.text === "function") return blob.text();
  return "";
}

/** GET a CSV with the session token, save it, or throw the server's message. */
async function downloadCsv(path, params, fallbackName) {
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
    const error = new Error((parsed && parsed.msg) || ATTENDANCE_EXPORT_ERROR);
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

const post = (url, body) =>
  new Promise((resolve, reject) => {
    API.post(url, body)
      .then((res) => resolve(res.data))
      .catch(reject);
  });

const attendance = {
  /* ------------------------------------------------------- Attendance List */

  /** `{ from, to, home_outlet_id?, department_id?, search? }` -> `{ code, meta, data }`. */
  getAttendanceList: (params) => get("/attendance/raw", params),

  /** Banner counts for a range -> `{ code, data }`. */
  getSummary: (params) => get("/attendance/raw/summary", params),

  /** CSV of the Attendance List with the SAME filters; `with_locations: 1` adds `@DN2`. */
  exportAttendanceList: (params) =>
    downloadCsv("/attendance/raw/export.csv", params, "attendance-list.csv"),

  /* ----------------------------------------------------------- Punch Audit */

  /** `{ from, to, dev_id?, punch_outlet_id?, device_status?, review?, search?, source_ip?, employee_id?, attendance_date?, limit?, offset? }`. */
  getPunchAudit: (params) => get("/attendance/raw/punches", params),

  exportPunchAudit: (params) =>
    downloadCsv("/attendance/raw/punches/export.csv", params, "punch-audit.csv"),

  /**
   * Void Punch - `POST /attendance/raw/punches/:id/void`, behind
   * `void_attendance_punch`. `{ biomax_punch_id, reason, source? }`: the
   * reason is mandatory; `source` (BIOMAX / IMPORT) only says what the screen
   * believes the punch is, and the server refuses a mismatch. Nothing else is
   * sent - the employee, the time and the actor are the server's to decide.
   * Answers `{ code, recalculated, msg, ... }`; `recalculated: false` means
   * the void was saved but the date could not be recalculated.
   */
  voidPunch: ({ biomax_punch_id, reason, source }) =>
    post(`/attendance/raw/punches/${biomax_punch_id}/void`, source ? { reason, source } : { reason }),

  /* --------------------------------------------------------------- Devices */

  getDevices: () => get("/attendance/devices"),
  getUnregisteredDevices: () => get("/attendance/devices/unregistered"),
  getDevice: (biomax_device_id) => get("/attendance/devices/details", { biomax_device_id }),

  /** `{ dev_id, label, notes?, outlet_id, effective_from, note? }` */
  createDevice: (body) => post("/attendance/devices/create", body),
  /** `{ biomax_device_id, label?, notes? }` - never the Cloud ID */
  updateDeviceDetails: (body) => post("/attendance/devices/update-details", body),
  /** Move / re-activate: `{ biomax_device_id, outlet_id, effective_from, note?, confirm_before_last_punch? }` */
  assignDevice: (body) => post("/attendance/devices/assign", body),
  /** `{ biomax_device_id, effective_to, note?, confirm_before_last_punch? }` */
  deactivateDevice: (body) => post("/attendance/devices/deactivate", body),
  /** `{ biomax_device_id, dev_id, reason }` - audited; refused once the device has punched */
  correctCloudId: (body) => post("/attendance/devices/correct-cloud-id", body),

  /* ------------------------------------------------- DigiSME Excel import */
  /*
   * `routes/attendance_import.js`, mounted at /attendance/imports, every
   * endpoint behind `manage_attendance_import`. Preview stages a batch and
   * writes no punch; only commit writes, and only a PREVIEWED batch.
   *
   * preview and commit answer `{ code, batch, classification_counts,
   * outcome_counts, unmatched_employee_codes }`; the three reads answer
   * `{ code, data }`. A refusal or a conflict arrives as `{ code, msg }`
   * like every other helper - 409 means the batch was already committed.
   */

  /**
   * One .xlsx, multipart, as the server's formidable reader expects it. The
   * browser never parses the workbook: the server is the only thing that
   * reads a punch out of it.
   */
  previewDigiSmeImport: (file) => {
    const formData = new FormData();
    formData.append("file", file, file.name);
    return post("/attendance/imports/digisme/preview", formData);
  },

  /** Import history, newest batch first. `{ limit? }`. */
  listAttendanceImports: (params) => get("/attendance/imports", params),

  /** One batch: the batch row, both count maps, and the unmatched codes. */
  getAttendanceImportDetails: (import_batch_id) =>
    get("/attendance/imports/details", { import_batch_id }),

  /** `{ import_batch_id, classification?, outcome?, limit?, offset? }` -> `{ rows, total, limit, offset }`. */
  getAttendanceImportItems: (params) => get("/attendance/imports/items", params),

  /** Commit a PREVIEWED batch. Answers the refreshed details, or 409. */
  commitAttendanceImport: (import_batch_id) =>
    post("/attendance/imports/commit", { import_batch_id }),

  /**
   * Attach identity to every stored punch that was UNMATCHED at ingest and
   * whose Employee Code is now in the master. `{ employee_id? }` narrows it
   * to one employee. Answers `{ code, scanned, rematched, still_unmatched,
   * employees: [{ employee_id, user_id, punches }] }`.
   */
  rematchUnmatchedPunches: (body) => post("/attendance/imports/rematch", body || {}),
};

export default attendance;
