/**
 * Telegram Group Mapping - the rules the Map screen reads from. Phase 3A.
 *
 * Pure. No React, no API, no Chakra, so every rule below is executed by
 * `components/master/telegramGroupMapping.test.js` rather than asserted
 * against JSX. Shaped like `util/telegramGroup.js`, which does the same for
 * the registry screens.
 *
 * THE SERVER IS THE AUTHORITY ON ALL OF IT. The counts, the target state and
 * the warning words all arrive in the response; this file names them, gives
 * the screen a vocabulary for them, and provides fallbacks so an older
 * cached response still renders something truthful. It re-derives nothing
 * the backend decided.
 */

/** The only four. There is no rule builder and no hand-picked employee list. */
export const MAPPING_TYPE = {
  ALL_EMPLOYEES: "ALL_EMPLOYEES",
  OUTLET: "OUTLET",
  DESIGNATION: "DESIGNATION",
  DEPARTMENT: "DEPARTMENT",
};

/** Dropdown order, matching the backend's constant. */
export const MAPPING_TYPES = [
  MAPPING_TYPE.ALL_EMPLOYEES,
  MAPPING_TYPE.OUTLET,
  MAPPING_TYPE.DESIGNATION,
  MAPPING_TYPE.DEPARTMENT,
];

export const MAPPING_TYPE_LABEL = {
  ALL_EMPLOYEES: "All Employees",
  OUTLET: "Outlet",
  DESIGNATION: "Designation",
  DEPARTMENT: "Department",
};

export const TARGET_STATE = {
  NOT_APPLICABLE: "NOT_APPLICABLE",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MISSING: "MISSING",
};

export const MAPPING_MESSAGES = {
  INACTIVE_GROUP:
    "This Telegram group is inactive. Mapping configuration is preserved. No Telegram membership action will be performed.",
  TARGET_INACTIVE: "Mapped target is inactive",
  TARGET_MISSING: "Mapped target no longer exists",
  NO_MAPPINGS:
    "This group has no mappings yet, so it matches nobody. A group's name never decides who belongs to it.",
  ADD_TITLE: "Add Mapping",
  DELETE_TITLE: "Remove mapping",
  deleteBody: (label) =>
    `Remove the ${label} mapping? This changes who should belong to the group. Nobody is added to or removed from Telegram.`,
};

/**
 * WHICH SELECTOR THE ADD FORM SHOWS.
 *
 * `null` for All Employees, because it covers everybody and a target would
 * be a question with no meaning. The three others name the master they pick
 * from. Nobody ever types a numeric id: every target is chosen from the
 * existing master list, so an id that does not exist cannot be submitted by
 * hand in the first place.
 */
export const TARGET_SELECTOR = {
  ALL_EMPLOYEES: null,
  OUTLET: "outlet",
  DESIGNATION: "designation",
  DEPARTMENT: "department",
};

export const needsTarget = (type) => Boolean(TARGET_SELECTOR[type]);

export const mappingTypeLabel = (type) => MAPPING_TYPE_LABEL[type] || type || "";

/**
 * What the Mapping To column shows.
 *
 * A MISSING TARGET STILL SHOWS ITS ID. "Outlet #14" is what lets somebody
 * work out which outlet was deleted; a blank cell or a bare dash would leave
 * them with a warning they cannot act on.
 */
export function mappingTargetLabel(row) {
  if (!row) return "";
  if (row.mapping_type === MAPPING_TYPE.ALL_EMPLOYEES) {
    return MAPPING_TYPE_LABEL.ALL_EMPLOYEES;
  }
  if (row.target_name) return row.target_name;
  const id = row.target_id === null || row.target_id === undefined ? "" : `#${row.target_id}`;
  return `${mappingTypeLabel(row.mapping_type)} ${id}`.trim();
}

/**
 * THE WARNING, OR NOTHING - and zero matches is NOT a warning.
 *
 * A rule whose outlet is open and staffed by nobody today is correct and
 * reads "Active" with a count of 0. A rule whose outlet was deleted is
 * broken configuration. Collapsing the two into "0 employees" would hide
 * real breakage behind an ordinary number, which is the single distinction
 * this screen exists to preserve.
 */
export function targetWarning(row) {
  if (!row) return null;
  if (row.target_warning) return row.target_warning;
  if (row.target_state === TARGET_STATE.INACTIVE) return MAPPING_MESSAGES.TARGET_INACTIVE;
  if (row.target_state === TARGET_STATE.MISSING) return MAPPING_MESSAGES.TARGET_MISSING;
  return null;
}

/** Active / Inactive / Missing / — , for the Status column. */
export function targetStatusLabel(row) {
  if (!row) return "";
  switch (row.target_state) {
    case TARGET_STATE.MISSING:
      return "Missing";
    case TARGET_STATE.INACTIVE:
      return "Inactive";
    case TARGET_STATE.ACTIVE:
      return "Active";
    default:
      return "—";
  }
}

export const targetIsBroken = (row) => targetWarning(row) !== null;

/**
 * What the numbers on this screen count. The server decides; this names it.
 *
 * THREE STATES, AND TWO OF THEM WOULD OTHERWISE RENDER AS THE SAME ZERO.
 * `BRANCH` with nothing matched is an OBSERVATION - nobody in your branch
 * fits this rule. `NONE` is not an observation about anybody: the account has
 * no employee record, no branch, an inactive record, no session, or the
 * scope resolver did not run. Showing "0 employees match" there would invent
 * a finding out of a failure, and the reading it invites - "this rule matches
 * nobody, it must be broken" - is what gets a working rule deleted.
 */
export const COUNTS_SCOPE = {
  ALL: "ALL",
  BRANCH: "BRANCH",
  NONE: "NONE",
};

/**
 * THE ONE PLACE `counts_scope` IS INTERPRETED. Every component asks these
 * three questions rather than comparing the string itself, so a fourth state
 * added later is handled here once instead of in five components that each
 * quietly disagree.
 */
export const isBranchScoped = (payload) =>
  Boolean(payload) && payload.counts_scope === COUNTS_SCOPE.BRANCH;

/**
 * ANYTHING THAT IS NOT EXPLICITLY `ALL` OR `BRANCH` IS UNAVAILABLE.
 *
 * Deliberately not `=== "NONE"`. A missing field, a response from an older
 * server, or a state added in a future release must all fall to the
 * non-disclosing answer, because the alternative default - treating an
 * unrecognised scope as company-wide - would present somebody's partial or
 * absent numbers as the company's. The safe direction is to say less.
 */
export function isCountsUnavailable(payload) {
  const scope = payload && payload.counts_scope;
  return scope !== COUNTS_SCOPE.ALL && scope !== COUNTS_SCOPE.BRANCH;
}

/** The sentence for a state where nothing could be counted. */
export const COUNTS_UNAVAILABLE = {
  SUMMARY: "Employee counts are unavailable for your account scope.",
  NOTICE:
    "The mapping rules are still shown, but employee counts cannot be displayed for this account.",
  EMPLOYEES: "Employee details and counts are unavailable for your account scope.",
  /** What a count cell shows instead of a number. Compact, and not a zero. */
  CELL: "\u2014",
};

/**
 * THE COUNT SENTENCE, AND WHOSE EMPLOYEES IT COUNTS.
 *
 * A branch-scoped caller is never shown a bare number. "12 employees match
 * this mapping" would be FALSE AS LABELLED for them - the rule may well
 * cover a hundred people - and a manager who believes a company-wide rule
 * covers twelve is a manager who concludes it is broken and deletes it.
 *
 * An unavailable scope gets no number at all, for the stronger version of
 * the same reason: there is nothing to report.
 */
export function scopeSummary(payload = {}) {
  if (isCountsUnavailable(payload)) return COUNTS_UNAVAILABLE.SUMMARY;
  const { total_matched = 0 } = payload;
  const verb = total_matched === 1 ? "employee matches" : "employees match";
  if (isBranchScoped(payload)) {
    return `${total_matched} ${verb} this mapping in your branch scope.`;
  }
  return `${total_matched} ${verb} this mapping.`;
}

/**
 * The line that qualifies the WHOLE screen's numbers - shown once, near the
 * counts, rather than repeated on every row.
 *
 * For a branch caller it is explicit that the RULE is unaffected, because a
 * scoped count read as "this mapping only covers my branch" makes deleting it
 * look harmless. The unavailable notice says the same thing differently: the
 * rules are real and visible, only the arithmetic is missing.
 */
export function countsScopeNotice(payload) {
  if (isCountsUnavailable(payload)) return COUNTS_UNAVAILABLE.NOTICE;
  if (!isBranchScoped(payload)) return null;
  return "Counts on this screen are limited to your branch scope. The mapping rules themselves apply company-wide.";
}

/** The header line above the mapping grid. */
export function groupCountSummary(payload = {}) {
  // No "0 employees", and no "0 already connected" either - neither is an
  // observed population.
  if (isCountsUnavailable(payload)) return COUNTS_UNAVAILABLE.SUMMARY;
  const { total_matched = 0, total_connected } = payload;
  const who = isBranchScoped(payload) ? " in your branch scope" : "";
  const noun = total_matched === 1 ? "employee" : "employees";
  let text = `${total_matched} ${noun}${who} currently match this group's mappings`;
  if (typeof total_connected === "number") {
    text += ` · ${total_connected} already connected to Telegram`;
  }
  if (payload.as_of_date) text += ` · as of ${payload.as_of_date}`;
  return text;
}

/**
 * The empty state, which must not overclaim.
 *
 * A branch-scoped caller seeing nothing has learned that NOBODY THEY MAY SEE
 * matches - not that nobody matches. An unavailable caller has learned even
 * less than that: nothing was looked at, so the mapping must not be described
 * as matching anybody or nobody.
 */
export function emptyMatchedMessage(payload) {
  if (isCountsUnavailable(payload)) return COUNTS_UNAVAILABLE.EMPLOYEES;
  if (isBranchScoped(payload)) {
    return "No currently employed staff in your branch scope match this mapping. It may still match employees in other branches.";
  }
  return "No currently employed staff match this mapping.";
}

/**
 * What one row's Matched Employees cell shows.
 *
 * An em dash rather than a 0, because the cell has nothing to report and a
 * zero would be read as a count. The raw number from the server is left
 * alone; only its presentation depends on the scope.
 */
export function matchedCountCell(row, payload) {
  if (isCountsUnavailable(payload)) return COUNTS_UNAVAILABLE.CELL;
  return row && typeof row.matched_employees === "number" ? row.matched_employees : COUNTS_UNAVAILABLE.CELL;
}

/**
 * The Matched Employees column header.
 *
 * NEUTRAL WHEN COUNTS ARE UNAVAILABLE. "(your branch)" over a column of
 * dashes would claim a branch answer where there is none.
 */
export function matchedCountHeader(payload) {
  return isBranchScoped(payload) ? "Matched Employees (your branch)" : "Matched Employees";
}

/** Yes / No. Never a username, an id or a mobile number. */
export const telegramConnectedLabel = (employee) =>
  employee && employee.telegram_connected ? "Yes" : "No";

/**
 * Both write actions need the manage key; viewing needs only the view key,
 * which the route already required to get here. One helper so Add and Delete
 * cannot drift apart.
 */
export const canManageMappings = (permissions = {}) =>
  Boolean(permissions.manage_telegram_groups);

/**
 * Is this Add Mapping form submittable?
 *
 * All Employees is ready as soon as it is chosen. The other three need a
 * target picked from their list. Nothing else is ever required, because
 * there is nothing else to ask.
 */
export function canSubmitMapping({ mapping_type, target_id } = {}) {
  if (!MAPPING_TYPES.includes(mapping_type)) return false;
  if (!needsTarget(mapping_type)) return true;
  const id = Number(target_id);
  return Number.isInteger(id) && id > 0;
}

/**
 * The body for POST /telegram-groups/:id/mappings.
 *
 * ALL_EMPLOYEES SENDS NO TARGET AT ALL. The server assigns the sentinel; a
 * client that invented its own 0 would be duplicating a rule it does not
 * own, and the server refuses a target on that type anyway.
 */
export function mappingPayload({ mapping_type, target_id } = {}) {
  if (!needsTarget(mapping_type)) return { mapping_type };
  return { mapping_type, target_id: Number(target_id) };
}
