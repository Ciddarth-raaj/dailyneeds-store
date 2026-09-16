/**
 * EMPLOYEE TELEGRAM - the vocabulary, the labels and every decision the
 * screens make, as pure functions.
 *
 * WHY A MODULE. There is no React test runner in this repository, so logic
 * left inside a component is logic that cannot be tested - the same reason
 * `util/hrOnboarding.js` exists. Everything here is a pure function over the
 * backend's answer, and `util/employeeTelegram.test.js` pins it.
 *
 * AND WHY ONE MODULE. Three screens show Telegram state - the Add Employee
 * wizard, the Employee Master card and the onboarding dashboard - and if each
 * invented its own labels they would drift within a week. The label a manager
 * reads on a dashboard row is the label they read on the employee's profile
 * because both call `telegramLabel`.
 *
 * ============================ CONNECTED IS NOT COMPLETE ===================
 *
 * The backend says CONNECTED when an employee's Telegram identity is verified.
 * That is NOT finished Telegram onboarding: required groups are decided by
 * Group Mapping, which does not exist yet, so a connected employee still has
 * work outstanding. Every screen therefore reads
 *
 *     Connected - Groups Pending
 *
 * and nothing anywhere says "Telegram Complete" or shows group progress that
 * is not real. When the group phase ships, this label changes here, once.
 */

/**
 * The statuses the backend actually returns. Mirrored from
 * `constants/employee_telegram.js`; nothing here invents a state.
 *
 * DISCONNECTED IS IN THE VOCABULARY BUT IS NOT DERIVED FROM STORAGE by the
 * deployed backend - disconnecting retires the identity and the employee
 * reads PENDING again, because that is what they are: needing setup. It is
 * handled here so a screen that has just performed a disconnect, or a future
 * backend that does derive it, renders something sensible rather than falling
 * through to "unknown".
 */
const TELEGRAM_STATUS = Object.freeze({
  PENDING: "PENDING",
  AWAITING_CONTACT: "AWAITING_CONTACT",
  MOBILE_MISMATCH: "MOBILE_MISMATCH",
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
});

/** What a human reads, wherever the status is shown. */
const TELEGRAM_LABELS = Object.freeze({
  PENDING: "Telegram Pending",
  AWAITING_CONTACT: "Waiting for Phone Verification",
  MOBILE_MISMATCH: "Mobile Number Mismatch",
  CONNECTED: "Connected - Groups Pending",
  DISCONNECTED: "Telegram Disconnected",
});

/** The shorter form a dashboard column has room for. */
const TELEGRAM_SHORT_LABELS = Object.freeze({
  PENDING: "Pending",
  AWAITING_CONTACT: "Waiting for Verification",
  MOBILE_MISMATCH: "Mobile Mismatch",
  CONNECTED: "Connected - Groups Pending",
  DISCONNECTED: "Disconnected",
});

/** Chakra colour schemes, matching how the other status badges read. */
const TELEGRAM_BADGE_SCHEMES = Object.freeze({
  PENDING: "gray",
  AWAITING_CONTACT: "blue",
  MOBILE_MISMATCH: "red",
  CONNECTED: "green",
  DISCONNECTED: "orange",
});

const known = (status) => Object.prototype.hasOwnProperty.call(TELEGRAM_LABELS, String(status));

/**
 * The label for a status.
 *
 * AN UNKNOWN STATUS READS "—" RATHER THAN ITS OWN NAME. A future backend
 * state leaking onto a manager's screen as `GROUPS_PENDING` is worse than a
 * dash: the dash is obviously "no answer", the raw enum looks like a fact.
 */
function telegramLabel(status, { short = false } = {}) {
  if (!known(status)) return "—";
  return (short ? TELEGRAM_SHORT_LABELS : TELEGRAM_LABELS)[String(status)];
}

function telegramBadgeScheme(status) {
  return known(status) ? TELEGRAM_BADGE_SCHEMES[String(status)] : "gray";
}

/** True only for the one status that means an identity exists. */
const isConnected = (status) => String(status) === TELEGRAM_STATUS.CONNECTED;

/**
 * Is the QR still usable?
 *
 * `expiresAt` is the backend's ISO timestamp. NO SECOND-PERFECT AGREEMENT
 * with the server is attempted or needed: the server refuses an expired token
 * whatever this says, so this only decides when to stop showing a QR that
 * will not work.
 */
function isLinkExpired(expiresAt, now = Date.now()) {
  if (!expiresAt) return true;
  const at = new Date(expiresAt).getTime();
  if (!Number.isFinite(at)) return true;
  return at <= (now instanceof Date ? now.getTime() : now);
}

/** Whole seconds left, floored at zero. */
function secondsUntil(expiresAt, now = Date.now()) {
  if (!expiresAt) return 0;
  const at = new Date(expiresAt).getTime();
  if (!Number.isFinite(at)) return 0;
  const ms = at - (now instanceof Date ? now.getTime() : now);
  return ms <= 0 ? 0 : Math.floor(ms / 1000);
}

/** `12:43`, for the countdown beside the QR. */
function countdownText(expiresAt, now = Date.now()) {
  const total = secondsUntil(expiresAt, now);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * What the CURRENT link attempt has come to, as the backend reports it.
 *
 * SEPARATE FROM THE STATUS, and that separation is what makes reconnect work.
 * Mirrored from `utils/employee_telegram_status.js`; nothing here invents a
 * state.
 */
const LINK_ATTEMPT = Object.freeze({
  NONE: "NONE",
  PENDING: "PENDING",
  AWAITING_CONTACT: "AWAITING_CONTACT",
  MOBILE_MISMATCH: "MOBILE_MISMATCH",
  VERIFIED: "VERIFIED",
  /**
   * It ended, and not on the number - the Telegram account is already another
   * employee's, or the employee stopped being employed mid-flow. The backend
   * sends one word and no reason, and the screen shows one sentence and no
   * reason: naming it would disclose from the office what the bot refuses to
   * say in the chat.
   */
  FAILED: "FAILED",
});

/** An attempt that has finished, one way or another. Nothing more will change. */
const ATTEMPT_SETTLED = [
  LINK_ATTEMPT.MOBILE_MISMATCH,
  LINK_ATTEMPT.VERIFIED,
  LINK_ATTEMPT.FAILED,
];

/**
 * SHOULD THE SCREEN STILL BE POLLING?
 *
 * The one rule behind the polling lifecycle, kept out of the component so it
 * can be tested. Polling exists ONLY to notice that the employee finished on
 * their phone, so it stops the moment there is nothing left to notice.
 *
 * ================== WHY IT IS NOT "STOP WHEN CONNECTED" ==================
 *
 * That is what it used to be, and it was wrong for RECONNECT. When a connected
 * employee links a different Telegram account the backend deliberately keeps
 * the old identity until the new one verifies, so `status` reads CONNECTED for
 * the whole attempt. A screen that stopped at CONNECTED would stop the instant
 * it generated the QR - and would have declared success for a verification
 * that had not happened.
 *
 * SO THE ATTEMPT DECIDES, NOT THE IDENTITY. While a live QR is on screen,
 * polling continues until that attempt settles - verified or mismatched -
 * whatever the employee's existing connection says. `link_attempt` is the
 * backend field that reports it.
 *
 * WITHOUT THAT FIELD, the old rule applies: an older backend that does not
 * send `link_attempt` still stops on CONNECTED, which is right for a first
 * connection and is all it could ever have done.
 */
function shouldPollTelegram({
  status,
  attempt = null,
  hasLiveLink = false,
  attemptIsCurrent = true,
} = {}) {
  if (!hasLiveLink) return false;
  // THE STATUS ON SCREEN PREDATES THIS QR, so it says nothing about it. Keep
  // watching until an answer that belongs to this attempt arrives - stopping
  // on a stale one is exactly how a fresh reconnect QR used to be killed by
  // the previous attempt's VERIFIED.
  if (!attemptIsCurrent) return true;
  if (attempt !== null && attempt !== undefined && attempt !== "") {
    return !ATTEMPT_SETTLED.includes(String(attempt));
  }
  if (isConnected(status)) return false;
  if (String(status) === TELEGRAM_STATUS.MOBILE_MISMATCH) return false;
  return true;
}

/**
 * Is a reconnect in flight - a live QR for an employee who is already
 * connected, whose new attempt has not settled?
 *
 * The screen says so in as many words, because "Connected" beside a QR is
 * otherwise a contradiction a manager has to work out for themselves.
 */
function isReconnectInFlight({
  status,
  attempt = null,
  hasLiveLink = false,
  attemptIsCurrent = true,
} = {}) {
  if (!hasLiveLink || !isConnected(status)) return false;
  // A QR whose answer has not arrived yet is in flight by definition.
  if (!attemptIsCurrent) return true;
  return String(attempt) === LINK_ATTEMPT.AWAITING_CONTACT || String(attempt) === LINK_ATTEMPT.PENDING;
}

/** Did the attempt in front of the user just finish successfully? */
const attemptVerified = (attempt) => String(attempt) === LINK_ATTEMPT.VERIFIED;

/** Did it fail on the number? */
const attemptMismatched = (attempt) => String(attempt) === LINK_ATTEMPT.MOBILE_MISMATCH;

/** Did it end some other way it cannot come back from? */
const attemptFailed = (attempt) => String(attempt) === LINK_ATTEMPT.FAILED;

/**
 * Has the attempt in front of the user finished, whatever the ending?
 *
 * ONLY EVER ASKED OF A STATUS THAT BELONGS TO THE CURRENT QR - see the hook.
 * A settled answer about the PREVIOUS attempt says nothing about this one.
 */
const attemptSettled = (attempt) => ATTEMPT_SETTLED.includes(String(attempt));

/** How often, in ms. Modest on purpose - a manager is standing there, not a robot. */
const TELEGRAM_POLL_INTERVAL_MS = 3000;

/**
 * MAY THIS USER SET TELEGRAM UP for an employee they can already see?
 *
 * THE BACKEND IS THE AUTHORITY AND THIS ONLY HIDES BUTTONS. It mirrors what
 * `routes/employee_telegram.js` enforces - `employee_create` OR
 * `employee_edit`, plus the branch scope, which no frontend can evaluate -
 * so a store manager is offered the action for their own store's employees
 * and is refused by the server for anybody else's. NO NEW TELEGRAM
 * PERMISSION EXISTS, deliberately: finishing setup for an existing employee
 * must not require the right to create employees, which is why it is an OR.
 */
function canManageTelegram({ permissions = [], isAdmin = false } = {}) {
  if (isAdmin === true) return true;
  const held = Array.isArray(permissions) ? permissions : [];
  return held.includes("employee_edit") || held.includes("employee_create");
}

/** Reading the status is the ordinary employee read. */
function canViewTelegram({ permissions = [], isAdmin = false } = {}) {
  if (isAdmin === true) return true;
  const held = Array.isArray(permissions) ? permissions : [];
  return held.includes("view_employees");
}

/**
 * The status of one employee out of the dashboard's status-summary row.
 *
 * Returns null when the server did not send it - a server that cannot answer
 * must not read as "Pending", which is a work queue somebody would then chase.
 */
function telegramStatusOf(summaryRow) {
  if (!summaryRow) return null;
  const status = summaryRow.telegram_status;
  return known(status) ? String(status) : null;
}

/** Does this row need Telegram work? Unknown is NOT pending. */
function telegramPending(summaryRow) {
  const status = telegramStatusOf(summaryRow);
  if (status === null) return false;
  return !isConnected(status);
}

module.exports = {
  TELEGRAM_STATUS,
  LINK_ATTEMPT,
  ATTEMPT_SETTLED,
  isReconnectInFlight,
  attemptVerified,
  attemptMismatched,
  attemptFailed,
  attemptSettled,
  TELEGRAM_LABELS,
  TELEGRAM_SHORT_LABELS,
  TELEGRAM_POLL_INTERVAL_MS,
  telegramLabel,
  telegramBadgeScheme,
  isConnected,
  isLinkExpired,
  secondsUntil,
  countdownText,
  shouldPollTelegram,
  canManageTelegram,
  canViewTelegram,
  telegramStatusOf,
  telegramPending,
};
