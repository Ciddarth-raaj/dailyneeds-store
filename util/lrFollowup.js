/**
 * LR Follow-up (from an Advance Request or created by hand) and Transporter
 * Master - the screens' vocabulary, formatting and payloads.
 *
 * Pure, and separate from the screens for the reason util/staffBudget.js
 * gives: there is no React test runner in this repo, so logic left inside a
 * component is logic that cannot be tested.
 *
 * THE BACKEND IS AUTHORITATIVE. Status moves, overdue, ageing and every
 * permission and branch decision are made server-side; what is here decides
 * only what to draw and what to send.
 */

const STATUS_META = {
  DISPATCH_PENDING: { label: "Dispatch / LR Pending", colorScheme: "yellow" },
  IN_TRANSIT: { label: "In Transit", colorScheme: "blue" },
  GOODS_RECEIVED: { label: "Goods Received", colorScheme: "green" },
  CLOSED: { label: "Closed", colorScheme: "gray" },
  VERIFICATION_REQUIRED: { label: "Verification Required", colorScheme: "orange" },
};

const OPEN_STATUSES = ["DISPATCH_PENDING", "IN_TRANSIT"];

/**
 * How a follow-up started: an Advance Request reaching paid, or a user's
 * "Create LR Follow-up" (MANUAL). A manual one has no source document; its
 * LRF number is its only reference.
 */
const SOURCE_META = {
  ADVANCE_REQUEST: { label: "Advance", prefix: "AR", colorScheme: "purple" },
  MANUAL: { label: "Manual", prefix: null, colorScheme: "teal" },
};

const CLOSURE_LABEL = {
  GOODS_RECEIVED: "Goods Received",
  REFUNDED: "Refunded",
  ADJUSTED: "Adjusted / Settled",
  CANCELLED: "Cancelled",
};

/**
 * A CLOSED follow-up is shown with HOW it closed, so stock actually received
 * can never be read as a refund or a cancellation:
 *   "Closed – Goods Received" (green)   vs   "Closed – Refunded" (red), ...
 */
function outcomeMeta(row) {
  if (!row || row.status !== "CLOSED") return statusMeta(row && row.status);
  const reason = row.closure_reason;
  return {
    label: `Closed – ${CLOSURE_LABEL[reason] || reason || "Unknown"}`,
    colorScheme: reason === "GOODS_RECEIVED" ? "green" : "red",
    stockReceived: reason === "GOODS_RECEIVED",
  };
}

/** Dashboard filter values that mean "closed, with this outcome". */
const CLOSED_OUTCOME_FILTERS = [
  { id: "CLOSED:GOODS_RECEIVED", value: "Closed – Goods Received", status: "CLOSED", closure_reason: "GOODS_RECEIVED" },
  { id: "CLOSED:WITHOUT_RECEIPT", value: "Closed – Without Receipt (all)", status: "CLOSED", closure_reason: "WITHOUT_RECEIPT" },
  { id: "CLOSED:REFUNDED", value: "Closed – Refunded", status: "CLOSED", closure_reason: "REFUNDED" },
  { id: "CLOSED:ADJUSTED", value: "Closed – Adjusted / Settled", status: "CLOSED", closure_reason: "ADJUSTED" },
  { id: "CLOSED:CANCELLED", value: "Closed – Cancelled", status: "CLOSED", closure_reason: "CANCELLED" },
];

/** The API's `status` and `closure_reason` for a dashboard Status choice. */
function statusFilterParams(choice) {
  const outcome = CLOSED_OUTCOME_FILTERS.find((f) => f.id === choice);
  if (outcome) return { status: outcome.status, closure_reason: outcome.closure_reason };
  return { status: choice || "OPEN", closure_reason: "" };
}

/** The Legacy Follow-up Verification decisions, in the order offered. */
const DECISIONS = [
  { id: "GOODS_RECEIVED", value: "Goods Received" },
  { id: "STILL_PENDING", value: "Goods Still Pending" },
  { id: "REFUNDED", value: "Refunded" },
  { id: "ADJUSTED", value: "Adjusted / Settled" },
  { id: "CANCELLED", value: "Cancelled" },
];

/** Closing a live follow-up without receipt: never "received". */
const NON_RECEIPT_DECISIONS = DECISIONS.filter((d) =>
  ["REFUNDED", "ADJUSTED", "CANCELLED"].includes(d.id)
);

const AGEING_BUCKETS = [
  { id: "0-2", value: "0–2 days" },
  { id: "3-5", value: "3–5 days" },
  { id: "6-10", value: "6–10 days" },
  { id: "10+", value: "More than 10 days" },
];

const ACTIVITY_LABEL = {
  CREATED: "Follow-up created",
  FOLLOW_UP: "Follow-up",
  LR_UPDATE: "LR / dispatch update",
  EXPECTED_DELIVERY_CHANGE: "Expected delivery changed",
  GOODS_RECEIVED: "Goods received",
  CLOSED: "Closed",
  CLOSED_WITHOUT_RECEIPT: "Closed WITHOUT stock receipt",
  BACKFILL: "Brought in at go-live",
  VERIFICATION_DECISION: "Verification decision",
};

const PERMISSIONS = {
  VIEW: "view_lr_followup",
  UPDATE: "update_lr_followup",
  MARK_RECEIVED: "mark_lr_goods_received",
  MANAGE_LEGACY: "manage_lr_legacy_verification",
  CLOSE_WITHOUT_RECEIPT: "close_lr_followup_without_receipt",
  ALL_STORES: "lr_followup_all_stores",
  // "Create LR Follow-up". The key keeps the name it shipped with.
  CREATE_MANUAL: "create_credit_purchase",
  VIEW_TRANSPORTER: "view_transporter_master",
  CREATE_TRANSPORTER: "create_transporter_master",
  EDIT_TRANSPORTER: "edit_transporter_master",
};

const statusMeta = (status) =>
  STATUS_META[status] || { label: status || "Unknown", colorScheme: "gray" };

const isOpenStatus = (status) => OPEN_STATUSES.includes(status);

/** `YYYY-MM-DD` of anything date-like, or "" when there is none. */
function dateOnly(value) {
  if (value === undefined || value === null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(
      value.getDate()
    ).padStart(2, "0")}`;
  }
  const s = String(value);
  // An ISO instant from the API is shown in the viewer's own calendar.
  if (/T\d{2}:\d{2}/.test(s)) return dateOnly(new Date(s));
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : "";
}

/** DD/MM/YYYY, or "-" when there is no date. */
function formatDate(value) {
  const d = dateOnly(value);
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/** DD/MM/YYYY hh:mm AM, or "-". */
function formatDateTime(value) {
  if (!value) return "-";
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return "-";
  const h = at.getHours();
  const hh = String(((h + 11) % 12) + 1).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  return `${formatDate(at)} ${hh}:${mm} ${h < 12 ? "AM" : "PM"}`;
}

const followupRef = (row) => (row && row.lr_followup_id ? `LRF-${row.lr_followup_id}` : "-");

function sourceRef(row) {
  if (!row) return "-";
  if (row.source_ref) return row.source_ref;
  if (row.source_type === "ADVANCE_REQUEST" && row.advance_request_id) return `AR-${row.advance_request_id}`;
  if (row.source_type === "MANUAL") return "Manual";
  return "-";
}

/** Where the source reference links to. */
function sourceHref(row) {
  if (!row) return null;
  if (row.source_type === "ADVANCE_REQUEST" && row.advance_request_id) {
    return `/advance-request/view/${row.advance_request_id}`;
  }
  return null;
}

/** "Source: Advance Request AR-1025" / "Source: Created manually" */
function sourceLabel(row) {
  if (!row) return "";
  if (row.source_type === "MANUAL") return "Source: Created manually";
  return `Source: Advance Request ${sourceRef(row)}`;
}

function ageingLabel(days) {
  if (days === undefined || days === null || days === "") return "-";
  const n = Number(days);
  return `${n} day${n === 1 ? "" : "s"}`;
}

/** "VRL Logistics (9876543210)"; marks an inactive one so it is not mistaken. */
function transporterLabel(row, { markInactive = true } = {}) {
  if (!row || !row.transporter_name) return "-";
  const base = row.transporter_contact_no || row.contact_no
    ? `${row.transporter_name} (${row.transporter_contact_no || row.contact_no})`
    : row.transporter_name;
  const inactive =
    row.transporter_is_active === false || row.transporter_is_active === 0 ||
    row.is_active === false || row.is_active === 0;
  return markInactive && inactive ? `${base} — inactive` : base;
}

/**
 * The transporter dropdown's options: active transporters from the master,
 * plus - when a record already holds an inactive one - that one, so the
 * current value still shows. It is labelled inactive; the server refuses it
 * as a NEW selection anyway.
 */
function transporterOptions(active, current) {
  const options = (active || []).map((t) => ({
    id: Number(t.transporter_id),
    value: transporterLabel(t, { markInactive: false }),
  }));
  if (current && current.transporter_id && !options.some((o) => o.id === Number(current.transporter_id))) {
    options.unshift({
      id: Number(current.transporter_id),
      value: `${transporterLabel(current, { markInactive: false })} — inactive`,
    });
  }
  return options;
}

/** A fresh key for one submission, so a retried request is recorded once. */
function newRequestKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `rk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Drops empty values so they never reach the API as "undefined". */
function toQueryString(filters = {}) {
  const parts = [];
  Object.keys(filters).forEach((key) => {
    const value = filters[key];
    if (value === undefined || value === null || value === "" || value === false) return;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  });
  return parts.join("&");
}

/**
 * The LR / dispatch update payload: only the fields that changed, a field
 * the user emptied sent as "" so the server clears it. Nothing changed and
 * no remark -> null, and the screen says so instead of sending.
 */
function buildLrPayload(current, form, requestKey) {
  const payload = {};
  const norm = (v) => (v === undefined || v === null ? "" : String(v).trim());
  if (norm(form.lr_no) !== norm(current.lr_no)) payload.lr_no = norm(form.lr_no);
  if (norm(form.dispatch_date) !== norm(dateOnly(current.dispatch_date))) {
    payload.dispatch_date = norm(form.dispatch_date);
  }
  if (norm(form.expected_delivery_date) !== norm(dateOnly(current.expected_delivery_date))) {
    payload.expected_delivery_date = norm(form.expected_delivery_date);
  }
  const formTransporter = form.transporter_id ? Number(form.transporter_id) : null;
  const currentTransporter = current.transporter_id ? Number(current.transporter_id) : null;
  if (formTransporter !== currentTransporter) payload.transporter_id = formTransporter;
  if (norm(form.remark)) payload.remark = norm(form.remark);
  if (Object.keys(payload).length === 0) return null;
  payload.request_key = requestKey;
  return payload;
}

/** Add Follow-up: the remark is required; the dates only when given. */
function buildFollowUpPayload(form, current, requestKey) {
  const remark = String(form.remark || "").trim();
  if (!remark) return { error: "Remark is required" };
  const payload = { remark, request_key: requestKey };
  if (form.next_follow_up_date) payload.next_follow_up_date = form.next_follow_up_date;
  if (form.expected_delivery_date && form.expected_delivery_date !== dateOnly(current && current.expected_delivery_date)) {
    payload.expected_delivery_date = form.expected_delivery_date;
  }
  return { payload };
}

/**
 * The Create LR Follow-up form, checked the way the API checks it, so the
 * user hears sooner. Supplier and Transporter are required; everything else
 * is optional. No bill, amount or outlet: delivery is always to the
 * Warehouse. Returns `{ errors, payload }`.
 */
function validateManualFollowup(form, today) {
  const errors = {};
  const trimmed = (v) => (v === undefined || v === null ? "" : String(v).trim());
  if (!form.distributor_code) errors.distributor_code = "Supplier is required";
  if (!form.transporter_id) errors.transporter_id = "Transporter is required — select one from the Transporter Master";
  if (form.dispatch_date && form.dispatch_date > today) errors.dispatch_date = "Dispatch Date cannot be in the future";
  if (form.expected_delivery_date && form.dispatch_date && form.expected_delivery_date < form.dispatch_date) {
    errors.expected_delivery_date = "Expected Delivery cannot be before the Dispatch Date";
  }
  if (Object.keys(errors).length) return { errors, payload: null };
  return {
    errors,
    payload: {
      distributor_code: Number(form.distributor_code),
      transporter_id: Number(form.transporter_id),
      lr_no: trimmed(form.lr_no) || null,
      dispatch_date: form.dispatch_date || null,
      expected_delivery_date: form.expected_delivery_date || null,
      remarks: trimmed(form.remarks) || null,
    },
  };
}

/**
 * What the read-only LR Follow-up card on an Advance Request shows. An advance that is paid but has no follow-up is an
 * EXCEPTION, shown as one - never quietly nothing.
 */
function cardState({ sourceStatus, sourceType, response, canView }) {
  if (!canView) return { kind: "hidden" };
  if (sourceType === "ADVANCE_REQUEST" && sourceStatus !== "paid") return { kind: "hidden" };
  if (!response) return { kind: "loading" };
  if (response.error) return { kind: "error", message: response.error };
  if (response.followup) return { kind: "followup", followup: response.followup };
  if (response.expected) return { kind: "exception", message: response.exception };
  return { kind: "hidden" };
}

/** The local calendar date, `YYYY-MM-DD`. */
function localToday(now = new Date()) {
  return dateOnly(now);
}

module.exports = {
  STATUS_META,
  OPEN_STATUSES,
  SOURCE_META,
  CLOSURE_LABEL,
  DECISIONS,
  NON_RECEIPT_DECISIONS,
  AGEING_BUCKETS,
  ACTIVITY_LABEL,
  PERMISSIONS,
  statusMeta,
  outcomeMeta,
  CLOSED_OUTCOME_FILTERS,
  statusFilterParams,
  isOpenStatus,
  dateOnly,
  formatDate,
  formatDateTime,
  followupRef,
  sourceRef,
  sourceHref,
  sourceLabel,
  ageingLabel,
  transporterLabel,
  transporterOptions,
  newRequestKey,
  toQueryString,
  buildLrPayload,
  buildFollowUpPayload,
  validateManualFollowup,
  cardState,
  localToday,
};
