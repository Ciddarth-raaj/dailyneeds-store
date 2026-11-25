/**
 * MANAGED MEMBERSHIP, as a screen reads it. Phase 3C.
 *
 * Pure: it turns a claim into words, a colour and a sentence, and knows
 * nothing about fetching. The backend's vocabulary is deliberately not shown
 * raw - `REMOVAL_PENDING` is a correct internal state and a terrible thing to
 * put in front of a manager, who needs to know whether the person is still in
 * the group and whether anything is expected of them.
 */

export const CLAIM_SOURCE = { RULE: "RULE", MANUAL: "MANUAL" };
export const CLAIM_STATE = {
  ACTIVE: "ACTIVE",
  REMOVAL_PENDING: "REMOVAL_PENDING",
  CLOSED: "CLOSED",
};

/** WHY somebody is managed into a group. */
export const SOURCE_LABEL = {
  RULE: "By rule",
  MANUAL: "Added manually",
};

export const SOURCE_HINT = {
  RULE: "A mapping on this group matches them. It follows their branch, department and designation.",
  MANUAL: "Somebody added them deliberately. This survives a transfer, and ends when it is removed or they leave.",
};

/**
 * WHAT IS HAPPENING, in words a manager can act on.
 *
 * "Removal pending" says the decision is made and the Telegram side has not
 * caught up - which is the honest answer, and is different from "removed".
 */
export const STATE_LABEL = {
  ACTIVE: "Managed",
  REMOVAL_PENDING: "Removal pending",
  CLOSED: "Ended",
};

export const STATE_SCHEME = {
  ACTIVE: "green",
  REMOVAL_PENDING: "orange",
  CLOSED: "gray",
};

export const STATE_HINT = {
  ACTIVE: "This group is required for them. Joining still happens through their own Telegram link.",
  REMOVAL_PENDING:
    "They are no longer meant to be in this group. Diya removes them on its next pass; until then this stays pending.",
  CLOSED: "No longer managed.",
};

/** A chip for one claim: `{ label, scheme, hint }`. */
export function membershipChip(claim) {
  const state = (claim && claim.state) || CLAIM_STATE.CLOSED;
  return {
    label: STATE_LABEL[state] || STATE_LABEL.CLOSED,
    scheme: STATE_SCHEME[state] || STATE_SCHEME.CLOSED,
    hint: STATE_HINT[state] || STATE_HINT.CLOSED,
  };
}

export function sourceChip(claim) {
  const source = (claim && claim.source) || CLAIM_SOURCE.RULE;
  return {
    label: SOURCE_LABEL[source] || source,
    scheme: source === CLAIM_SOURCE.MANUAL ? "purple" : "blue",
    hint: SOURCE_HINT[source] || "",
  };
}

/**
 * MAY THIS CLAIM BE REVOKED FROM THIS SCREEN?
 *
 * Only a MANUAL claim that is still ACTIVE. A RULE claim is not revocable by
 * hand at all - it is the mapping that decides it, and offering a button
 * that quietly does nothing would be worse than offering none. An already
 * pending removal is not offered twice.
 */
export function canRevoke(claim, { canManage } = {}) {
  if (!canManage) return false;
  return Boolean(
    claim && claim.source === CLAIM_SOURCE.MANUAL && claim.state === CLAIM_STATE.ACTIVE
  );
}

/** Why the revoke control is absent, for a tooltip. Never a bare disabled button. */
export function revokeBlockedReason(claim, { canManage } = {}) {
  if (!canManage) return "You do not have permission to manage Telegram groups";
  if (!claim) return "";
  if (claim.source === CLAIM_SOURCE.RULE) {
    return "This comes from a mapping. Remove the mapping to end it.";
  }
  if (claim.state === CLAIM_STATE.REMOVAL_PENDING) return "Removal is already pending";
  return "";
}

/** One sentence under the list, so an empty table is not a mystery. */
export function membershipSummary(claims = []) {
  const live = claims.filter((claim) => claim.state !== CLAIM_STATE.CLOSED);
  if (live.length === 0) {
    return "Nobody is managed into this group yet. Mappings add people by rule; you can also add somebody directly.";
  }
  const manual = live.filter((claim) => claim.source === CLAIM_SOURCE.MANUAL).length;
  const rule = live.length - manual;
  const parts = [];
  if (rule) parts.push(`${rule} by rule`);
  if (manual) parts.push(`${manual} added manually`);
  const pending = live.filter((claim) => claim.state === CLAIM_STATE.REMOVAL_PENDING).length;
  const tail = pending ? `, ${pending} awaiting removal` : "";
  return `${live.length} managed ${live.length === 1 ? "person" : "people"} (${parts.join(", ")})${tail}.`;
}

/**
 * A group that still manages people cannot be deleted - the server refuses
 * it with 409 and this is the sentence that explains what to do instead.
 */
export const DELETE_BLOCKED_HINT =
  "Remove this group's mappings and let managed membership finish its cleanup before deleting it.";
