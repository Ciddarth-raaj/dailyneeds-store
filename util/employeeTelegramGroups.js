import { telegramBadgeScheme, telegramLabel } from "./employeeTelegram";

/**
 * Required Telegram groups - the rules the screen reads from. Phase 3B.
 *
 * Pure. No React, no API, no Chakra, so every rule is executed by the tests
 * rather than asserted against JSX - the same split `util/employeeTelegram.js`
 * uses for the identity panel.
 *
 * THE SERVER IS THE AUTHORITY ON ALL OF IT. Membership, readiness and
 * completion all arrive decided; this names them, gives the screen words for
 * them, and provides fallbacks so an older cached response still renders
 * something truthful. It re-derives nothing.
 */

/** What the screen shows for one employee in one group. */
export const MEMBERSHIP_STATUS = {
  JOINED: "JOINED",
  JOIN_PENDING: "JOIN_PENDING",
  ACTION_REQUIRED: "ACTION_REQUIRED",
  GROUP_NOT_READY: "GROUP_NOT_READY",
};

export const MEMBERSHIP_LABEL = {
  JOINED: "Joined",
  JOIN_PENDING: "Join Pending",
  ACTION_REQUIRED: "Action Required",
  GROUP_NOT_READY: "Group Not Ready",
};

export const MEMBERSHIP_COLOR = {
  JOINED: "green",
  JOIN_PENDING: "orange",
  ACTION_REQUIRED: "purple",
  GROUP_NOT_READY: "red",
};

export const GROUP_READINESS = {
  READY: "READY",
  INACTIVE_GROUP: "INACTIVE_GROUP",
  BASIC_GROUP_UNSUPPORTED: "BASIC_GROUP_UNSUPPORTED",
  BOT_NOT_MEMBER: "BOT_NOT_MEMBER",
  BOT_NOT_ADMIN: "BOT_NOT_ADMIN",
  BOT_PERMISSION_MISSING: "BOT_PERMISSION_MISSING",
  TELEGRAM_UNAVAILABLE: "TELEGRAM_UNAVAILABLE",
};

/**
 * The fallback sentences, for a response that predates the server sending
 * its own. NEVER a raw enum on screen: "BOT_PERMISSION_MISSING" tells a
 * manager nothing they can act on, and this is a screen used by people who
 * administer groups, not by people who read our code.
 */
export const READINESS_FALLBACK = {
  INACTIVE_GROUP: "Group inactive",
  BASIC_GROUP_UNSUPPORTED: "Basic Group is not supported for managed membership",
  BOT_NOT_MEMBER: "Diya is not in this group",
  BOT_NOT_ADMIN: "Diya is not an admin",
  BOT_PERMISSION_MISSING: "Diya needs permission to manage join requests",
  TELEGRAM_UNAVAILABLE: "Telegram is temporarily unavailable",
};

export const GROUP_MESSAGES = {
  NOT_CONNECTED:
    "Connect Telegram first. Required groups appear once the employee's account is verified.",
  NONE_REQUIRED:
    "No Telegram groups are mapped to this employee, so there is nothing to join.",
  COMPLETE: "Telegram Complete",
  INCOMPLETE: "Telegram Pending",
  LINK_READY:
    "Open this link on the phone signed in to the employee's Telegram account. It expires in 15 minutes and works only for them.",
  LINK_EXPIRED: "That join link has expired. Generate a new one.",
  PENDING_HINT: "Waiting for the employee to open the link and be approved.",
};

export const membershipLabel = (status) => MEMBERSHIP_LABEL[status] || "Unknown";
export const membershipColor = (status) => MEMBERSHIP_COLOR[status] || "gray";

/**
 * The reason a group cannot be managed, in words.
 *
 * The server's own sentence wins; the local table is only a fallback. Null
 * for a ready group - there is nothing to report and an empty warning row
 * reads as a fault.
 */
export function readinessReason(group) {
  if (!group) return null;
  if (group.readiness_reason) return group.readiness_reason;
  if (!group.readiness_status || group.readiness_status === GROUP_READINESS.READY) return null;
  return READINESS_FALLBACK[group.readiness_status] || null;
}

/** Only a group we can actually manage offers a Join button. */
export const canJoin = (group) =>
  Boolean(group) && group.membership_status === MEMBERSHIP_STATUS.ACTION_REQUIRED;

export const isPending = (group) =>
  Boolean(group) && group.membership_status === MEMBERSHIP_STATUS.JOIN_PENDING;

export const isJoined = (group) =>
  Boolean(group) && group.membership_status === MEMBERSHIP_STATUS.JOINED;

export const isNotReady = (group) =>
  Boolean(group) && group.membership_status === MEMBERSHIP_STATUS.GROUP_NOT_READY;

/**
 * IS THE EMPLOYEE TELEGRAM COMPLETE?
 *
 * The server's `telegram_complete` is the authority and is used when
 * present. The local derivation exists only so an older response still
 * renders something truthful, and it is the SAME rule: connected, and every
 * required group joined.
 *
 * A DISCONNECTED EMPLOYEE IS NEVER COMPLETE, whatever the group list says -
 * checked first, because that is the case where a stale list is most likely
 * to still be full of green ticks.
 */
export function telegramComplete(payload) {
  if (!payload || !payload.connected) return false;
  if (typeof payload.telegram_complete === "boolean") return payload.telegram_complete;
  const groups = payload.groups || [];
  if (groups.length === 0) return true;
  return groups.every(isJoined);
}

/** "2 of 3 groups joined" - the one-line summary above the list. */
export function groupProgress(payload) {
  const groups = (payload && payload.groups) || [];
  const joined = groups.filter(isJoined).length;
  return { joined, total: groups.length };
}

export function progressSummary(payload) {
  const { joined, total } = groupProgress(payload);
  if (total === 0) return GROUP_MESSAGES.NONE_REQUIRED;
  return `${joined} of ${total} required group${total === 1 ? "" : "s"} joined`;
}

/**
 * Should the panel keep polling?
 *
 * ONLY WHILE SOMETHING IS ACTUALLY IN FLIGHT. A join arrives asynchronously -
 * the employee taps the link on their phone and Telegram delivers the
 * request to us - so the screen cannot know without asking again. But
 * polling a settled list is a Telegram API call per group per tick for no
 * reason, so it stops the moment nothing is pending.
 */
export const shouldPollGroups = (payload) =>
  Boolean(payload) && Boolean(payload.connected) && ((payload.groups || []).some(isPending));

/* ------------------------------------ dashboard completion (Phase 3B) ---- */

/**
 * The dashboard's four states. LAST-VERIFIED, not a live Telegram verdict -
 * the list cannot ask Telegram without thousands of calls per page load, so
 * it reads what the employee's own screen last confirmed.
 */
export const TELEGRAM_COMPLETION = {
  NOT_CONNECTED: "NOT_CONNECTED",
  VERIFICATION_PENDING: "VERIFICATION_PENDING",
  PENDING: "PENDING",
  COMPLETE: "COMPLETE",
};

/**
 * VERIFICATION_PENDING SAYS "NOT CHECKED", NOT "NOT DONE".
 *
 * It is a different job for whoever works this queue: PENDING means the
 * employee still has to join something, while Not Checked means nobody has
 * looked since a mapping changed or they reconnected. Labelling both
 * "Pending" would send somebody chasing an employee who may already be
 * finished.
 */
export const COMPLETION_LABEL = {
  NOT_CONNECTED: "Not Connected",
  VERIFICATION_PENDING: "Not Checked",
  PENDING: "Groups Pending",
  COMPLETE: "Complete",
};

export const COMPLETION_SCHEME = {
  NOT_CONNECTED: "red",
  VERIFICATION_PENDING: "blue",
  PENDING: "orange",
  COMPLETE: "green",
};

/**
 * The tooltip. It states the one thing the badge cannot: this is what was
 * true when somebody last looked, and the employee's own record is the
 * authority.
 */
export const COMPLETION_HINT = {
  NOT_CONNECTED: "This employee has not connected Telegram.",
  VERIFICATION_PENDING:
    "A required group has not been checked for this Telegram account yet. Open the employee to verify.",
  PENDING: "A required group was not joined when this was last checked.",
  COMPLETE: "All required groups were joined when this was last checked.",
};

export const completionLabel = (status) => COMPLETION_LABEL[status] || null;
export const completionScheme = (status) => COMPLETION_SCHEME[status] || "gray";
export const completionHint = (status) => COMPLETION_HINT[status] || null;

/** Is this a status the dashboard knows how to render? */
export const hasCompletion = (row) =>
  Boolean(row) && Boolean(COMPLETION_LABEL[row.telegram_completion]);

/**
 * THE TELEGRAM CHIP, FOR EVERY QUEUE VIEW. One function, so the desktop
 * table and the mobile card cannot disagree.
 *
 * They are two renderings of one fact, and the way they drift is that
 * somebody updates one and not the other - which is invisible until a
 * manager on a phone and a manager at a desk are looking at the same
 * employee and reading different words. So neither view decides anything:
 * both ask this.
 *
 * FALLS BACK TO THE PHASE 2 LABEL when the server sends no completion - an
 * older response, or a server without the verification cache wired. A
 * missing field must not render blank, and certainly not as "Not Connected",
 * which would put a connected employee on a queue they do not belong on.
 */
export function telegramQueueBadge(row) {
  if (hasCompletion(row)) {
    return {
      colorScheme: completionScheme(row.telegram_completion),
      label: completionLabel(row.telegram_completion),
      hint: completionHint(row.telegram_completion),
      fromCompletion: true,
    };
  }
  return {
    colorScheme: telegramBadgeScheme(row && row.telegram_status),
    label: telegramLabel(row && row.telegram_status, { short: true }),
    hint: null,
    fromCompletion: false,
  };
}
