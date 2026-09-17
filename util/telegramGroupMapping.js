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

/**
 * The rule that narrows nothing, which is what "everybody" means.
 *
 * THERE IS NO MAPPING TYPE ANY MORE. `mapping_type` / `target_id` described a
 * rule with exactly one dimension, and the backend neither stores nor accepts
 * that shape - a body carrying it is REFUSED rather than ignored, because
 * silently dropping it would save "All Employees" for somebody who asked for
 * one outlet. So the vocabulary is gone from here too: a helper that could
 * still build that body is a helper a screen could still call.
 */
export const ALL_EMPLOYEES_LABEL = "All Employees";

export const TARGET_STATE = {
  NOT_APPLICABLE: "NOT_APPLICABLE",
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  MISSING: "MISSING",
};

export const MAPPING_MESSAGES = {
  DUPLICATE_RULE: "An identical rule is already on this group",
  NO_EMPLOYEES_SELECTED: "Select at least one employee",
  TOO_MANY_EMPLOYEES: "Select at most 200 employees at a time",
  RULE_IS_ALL_EMPLOYEES:
    "Every dimension is All, so this rule covers every employee in the company.",
  SAVE_RULE_HELP:
    "Stores a rule. Anybody who matches it later is covered automatically, and anybody who stops matching it stops being covered.",
  ADD_SELECTED_HELP:
    "Adds exactly the people ticked below, and writes no rule. They stay until somebody removes them by hand.",
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
/* ============================================ MULTI-LEVEL RULES ========== */

/**
 * A RULE IS THREE OPTIONAL DIMENSIONS, JOINED BY AND.
 *
 * Outlet, then Department, then Designation - and the order is the order the
 * form cascades through, because each one narrows what the next is asked
 * about. A dimension left blank is "All", so a form with nothing chosen is
 * the rule that covers everybody, which is exactly what the old All
 * Employees type meant.
 *
 * EVERY DIMENSION ADDED MAKES THE POPULATION SMALLER, never larger. That is
 * the one thing a person reading the form must be able to predict without
 * knowing the operator, and it is why this is AND and not OR: under OR,
 * naming a designation would silently pull in that designation across every
 * outlet in the company.
 *
 * NOBODY EVER TYPES AN ID. Each dimension is picked from its existing master
 * list, so an id that does not exist cannot be submitted by hand.
 */
export const RULE_DIMENSIONS = [
  { key: "OUTLET", field: "outlet_id", label: "Outlet", selector: "outlet" },
  { key: "DEPARTMENT", field: "department_id", label: "Department", selector: "department" },
  { key: "DESIGNATION", field: "designation_id", label: "Designation", selector: "designation" },
];

/** What a dimension left unrestricted is called, everywhere. */
export const ANY_LABEL = "All";

/**
 * HOW MANY EMPLOYEES ONE "Add Selected Employees" MAY NAME.
 *
 * Mirrors `BULK_GRANT_MAX` in the backend's
 * `constants/telegram_group_mapping.js`. The server is what enforces it -
 * this is here so the screen can disable the button and say why, rather than
 * letting somebody select four hundred people and read a refusal afterwards.
 * A test pins the two numbers together.
 */
export const BULK_GRANT_MAX = 200;

/**
 * The body for POST /telegram-groups/:id/mappings and /mapping-preview.
 *
 * A BLANK DIMENSION IS OMITTED, not sent as 0 or null. "All" is the absence
 * of a restriction, and the server owns the sentinel that stores it; a
 * client inventing its own would be writing a value it does not own.
 */
export function rulePayload(form = {}) {
  const body = {};
  for (const dimension of RULE_DIMENSIONS) {
    const raw = form[dimension.field];
    if (raw === undefined || raw === null || raw === "") continue;
    const id = Number(raw);
    if (Number.isInteger(id) && id > 0) body[dimension.field] = id;
  }
  return body;
}

/** How many dimensions this form narrows. Zero is All Employees. */
export const narrowedCount = (form = {}) => Object.keys(rulePayload(form)).length;

/**
 * Is this form a rule that may be saved?
 *
 * ALMOST ALWAYS YES, and deliberately: every dimension is optional, so there
 * is no "pick a type first" step left to get wrong. The two refusals are a
 * rule the group ALREADY HAS - which the preview reports before Save is
 * pressed rather than after - and a request already in flight.
 */
export function canSaveRule({ form, preview, saving } = {}) {
  if (saving) return false;
  if (preview && preview.duplicate_rule) return false;
  return typeof form === "object" && form !== null;
}

/** Why Save is disabled, in the words the person needs. Null when it is not. */
export function saveBlockedReason({ form, preview, saving } = {}) {
  if (saving) return null;
  if (preview && preview.duplicate_rule) return MAPPING_MESSAGES.DUPLICATE_RULE;
  return null;
}

/**
 * The rule as one sentence, for a row or for the form's summary.
 *
 * THE SERVER'S OWN LABEL WINS when there is one, because it resolved the
 * names from the masters and knows which target has been deleted. The local
 * fallback exists for the form, where no rule has been saved yet and the
 * names are the ones sitting in the dropdowns.
 */
export function ruleLabel(row, names = {}) {
  if (row && row.rule_label) return row.rule_label;
  const parts = [];
  for (const dimension of RULE_DIMENSIONS) {
    const id = row && row.rule ? row.rule[dimension.field] : row && row[dimension.field];
    if (id === undefined || id === null || id === "") continue;
    const named = names[dimension.field] && names[dimension.field][id];
    parts.push(`${dimension.label}: ${named || `#${id}`}`);
  }
  return parts.length === 0 ? ALL_EMPLOYEES_LABEL : parts.join(" + ");
}

/**
 * ONE DIMENSION'S CELL on a mapping row: the target's name, or "All".
 *
 * A MISSING TARGET STILL SHOWS ITS ID. "#14" is what lets somebody work out
 * which outlet was deleted; a blank cell or a bare dash would leave them
 * with a warning they cannot act on.
 */
export function dimensionCell(row, key) {
  const found = row && Array.isArray(row.rule_dimensions)
    ? row.rule_dimensions.find((d) => d.dimension === key)
    : null;
  if (!found) return ANY_LABEL;
  if (found.name) return found.name;
  return found.id === null || found.id === undefined ? ANY_LABEL : `#${found.id}`;
}

/** The state of one dimension, for the per-dimension warning styling. */
export function dimensionState(row, key) {
  const found = row && Array.isArray(row.rule_dimensions)
    ? row.rule_dimensions.find((d) => d.dimension === key)
    : null;
  return (found && found.state) || TARGET_STATE.NOT_APPLICABLE;
}

/**
 * Is this selection of employees addable, and why not?
 *
 * BOUNDED, because the server bounds it - one transaction per request, and
 * an unbounded selection is an unbounded transaction. Saying so before the
 * button is pressed is the difference between a disabled control with a
 * reason on it and a refusal after the fact.
 */
export function canAddSelected(employeeIds = []) {
  const ids = Array.isArray(employeeIds) ? employeeIds : [];
  return ids.length > 0 && ids.length <= BULK_GRANT_MAX;
}

export function addSelectedBlockedReason(employeeIds = []) {
  const ids = Array.isArray(employeeIds) ? employeeIds : [];
  if (ids.length === 0) return MAPPING_MESSAGES.NO_EMPLOYEES_SELECTED;
  if (ids.length > BULK_GRANT_MAX) return MAPPING_MESSAGES.TOO_MANY_EMPLOYEES;
  return null;
}

/**
 * THE TWO ACTIONS ARE DIFFERENT THINGS AND THE SCREEN MUST SAY SO.
 *
 * Saving a rule stores configuration that re-derives itself from the
 * employee master forever. Adding selected employees creates MANUAL claims
 * for the people named and nothing else - it writes NO rule, because
 * inventing a rule to describe an arbitrary selection is how a group ends up
 * with configuration nobody chose and nobody can read back.
 */
export const RULE_ACTION = {
  SAVE_RULE: "Save Dynamic Rule",
  ADD_SELECTED: "Add Selected Employees",
};

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
