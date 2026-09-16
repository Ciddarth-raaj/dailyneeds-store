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
 * "34 employees match this mapping. 12 are visible in your branch scope."
 *
 * THE TOTAL IS ALWAYS STATED, even when the viewer can see all of it, and
 * the visible count is only mentioned when it differs. A manager must never
 * be left believing the twelve names in front of them are the whole
 * population - that is how somebody concludes a rule is wrong and deletes
 * it.
 */
export function scopeSummary({ total_matched = 0, visible_count = 0, scope_limited = false } = {}) {
  const people = total_matched === 1 ? "employee matches" : "employees match";
  const base = `${total_matched} ${people} this mapping.`;
  if (!scope_limited && visible_count === total_matched) return base;
  return `${base} ${visible_count} ${visible_count === 1 ? "is" : "are"} visible in your branch scope.`;
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
