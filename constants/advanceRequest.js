/**
 * Shared vocabulary for the LR advance request workflow, so the listing and
 * the stage form cannot disagree about what a status means.
 *
 * The statuses mirror the `status` enum on the backend's advance_requests
 * table; the stages are the four form sections the workflow is built from.
 */

export const STAGE_MAP = {
  a1: 1,
  "a1.1": 2,
  a2: 3,
  a3: 4,
};

export const STATUS_META = {
  submitted: { label: "Submitted", colorScheme: "gray" },
  verified: { label: "Verified", colorScheme: "green" },
  on_hold: { label: "On Hold", colorScheme: "orange" },
  approved: { label: "Approved", colorScheme: "green" },
  rejected: { label: "Rejected", colorScheme: "red" },
  paid: { label: "Paid", colorScheme: "purple" },
};

/**
 * The stage that still has work to do for a request in this status. A request
 * that has been checked is waiting on approval, an approved one on payment.
 * Terminal statuses point at the last stage that ran, so the whole history
 * stays visible with nothing left editable.
 */
export const STAGE_FOR_STATUS = {
  submitted: "a1.1",
  on_hold: "a1.1",
  verified: "a2",
  approved: "a3",
  rejected: "a2",
  paid: "a3",
};

/** Nothing moves a request out of these. */
export const TERMINAL_STATUSES = ["rejected", "paid"];

/**
 * Statuses whose A1 details can still be corrected. A held request is editable
 * because clarifying it is the way out of a hold - and editing one releases it
 * to the approver, which the API does on its own.
 */
export const EDITABLE_STATUSES = ["submitted", "on_hold"];

/** The permission that lets someone act on each stage. */
export const STAGE_PERMISSION = {
  a1: "edit_advance_request",
  "a1.1": "view_old_balance_check",
  a2: "approve_advance_request",
  a3: "pay_advance_request",
};

export const isTerminal = (status) => TERMINAL_STATUSES.includes(status);

export const isEditableStatus = (status) => EDITABLE_STATUSES.includes(status);

export const getStatusMeta = (status) =>
  STATUS_META[status] || { label: status || "Unknown", colorScheme: "gray" };

export const getCurrentStage = (status) => STAGE_FOR_STATUS[status] || "a1";
