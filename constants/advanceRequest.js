/**
 * Shared vocabulary for the LR advance request workflow, so the listing and
 * the stage form cannot disagree about what a status means.
 *
 * The chain: purchase raise it (A1); accounts record what the supplier
 * already holds (A1.1); if there is a balance it goes back to purchase to
 * decide less-and-pay or defer (A1.2); the admin approves, holds or rejects
 * (A2); accounts pay through Tally and file the advice (A3), which closes it.
 */

export const STAGE_MAP = {
  a1: 1,
  "a1.1": 2,
  "a1.2": 3,
  a2: 4,
  a3: 5,
};

/** Each status names who the request is sitting with. */
export const STATUS_META = {
  submitted: { label: "With Accounts", colorScheme: "gray" },
  pending_purchase_decision: { label: "With Purchase", colorScheme: "blue" },
  pending_approval: { label: "Awaiting Approval", colorScheme: "yellow" },
  on_hold: { label: "On Hold", colorScheme: "orange" },
  approved: { label: "Approved", colorScheme: "green" },
  rejected: { label: "Rejected", colorScheme: "red" },
  paid: { label: "Paid", colorScheme: "purple" },
};

/** What to do about a balance the supplier already holds. */
export const BALANCE_ACTIONS = [
  { id: "less_and_pay", value: "Less and pay" },
  { id: "defer", value: "Deduct next time" },
];

export const BALANCE_ACTION_LABEL = {
  less_and_pay: "Less and pay",
  defer: "Deduct next time",
};

/** The admin's three ways out of an approval. */
export const APPROVAL_DECISIONS = [
  { id: "approve", value: "Approve" },
  { id: "hold", value: "Hold" },
  { id: "reject", value: "Reject" },
];

/**
 * The stage that still has work to do for a request in this status.
 * Terminal statuses point at the last stage that ran, so the whole history
 * stays visible with nothing left editable.
 */
export const STAGE_FOR_STATUS = {
  submitted: "a1.1",
  pending_purchase_decision: "a1.2",
  pending_approval: "a2",
  on_hold: "a2",
  approved: "a3",
  rejected: "a2",
  paid: "a3",
};

/**
 * How to tell a stage has actually run: every step stamps its own timestamp on
 * the request, so this reads the data rather than re-deriving the workflow.
 */
export const STAGE_COMPLETED = {
  a1: () => true, // the request itself
  "a1.1": (r) => Boolean(r?.balance_checked_at),
  "a1.2": (r) => Boolean(r?.balance_action_at),
  a2: (r) => Boolean(r?.approved_at), // approve, hold or reject
  a3: (r) => Boolean(r?.paid_at),
};

export const isStageCompleted = (stage, request) =>
  Boolean(STAGE_COMPLETED[stage] && STAGE_COMPLETED[stage](request));

/** Nothing moves a request out of these. */
export const TERMINAL_STATUSES = ["rejected", "paid"];

/**
 * Statuses whose A1 details can still be corrected. An edit only corrects a
 * request - it never moves it, so a held request stays held and releasing it
 * remains the admin's decision.
 */
export const EDITABLE_STATUSES = [
  "submitted",
  "pending_purchase_decision",
  "on_hold",
];

/**
 * The permission that lets someone act on each stage. Deciding what to do
 * about a balance is the raising team's own step, so it rides on the
 * permission they already hold to raise a request.
 */
export const STAGE_PERMISSION = {
  a1: "edit_advance_request",
  "a1.1": "view_old_balance_check",
  "a1.2": "create_advance_request",
  a2: "approve_advance_request",
  a3: "pay_advance_request",
};

export const isTerminal = (status) => TERMINAL_STATUSES.includes(status);

export const isEditableStatus = (status) => EDITABLE_STATUSES.includes(status);

export const getStatusMeta = (status) =>
  STATUS_META[status] || { label: status || "Unknown", colorScheme: "gray" };

export const getCurrentStage = (status) => STAGE_FOR_STATUS[status] || "a1";
