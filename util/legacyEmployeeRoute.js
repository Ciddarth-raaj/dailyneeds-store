/**
 * Stage 0C / C3 — where a legacy /employee/[id] URL goes.
 *
 * A plain module rather than a function inside the page, for the same reason
 * `util/hrStatus.js` exists: it is a decision, it can be wrong in ways a build
 * will not catch, and it should be testable without a router or a renderer.
 *
 * THERE IS ONE EMPLOYEE PROFILE — /hr/employees/[id]. This maps the old URL
 * onto it, carrying the employee id through unchanged, because that id is the
 * permanent employee code: it survives every resignation and rejoin, so a
 * bookmark or a link written down two years ago still opens the right person.
 */

/** The one non-numeric id the old route accepted: its "new employee" form. */
const LEGACY_CREATE_ID = "create";

/** The canonical list, for anything that is not a single employee. */
const EMPLOYEE_LIST = "/hr/employees";

/**
 * @param id the `[id]` segment as Next.js provides it - a string, an array if
 *   the route ever matched repeatedly, or undefined before the router is ready.
 * @returns the path to replace the current one with, or null when there is not
 *   yet an id to act on. Never throws: a redirect that crashes is worse than
 *   the 404 it was meant to prevent.
 */
function canonicalPathFor(id) {
  if (id === undefined || id === null) return null;

  const raw = String(Array.isArray(id) ? id[0] : id).trim();
  if (raw === "") return EMPLOYEE_LIST;

  // The old create form. Its replacement is a different PATH, not a different
  // id, so this is mapped rather than passed through - otherwise
  // /employee/create would open a profile for an employee called "create".
  if (raw.toLowerCase() === LEGACY_CREATE_ID) return "/hr/employees/new";

  // Anything that is not a positive integer is not an employee id. The list is
  // a better answer than a profile that cannot exist.
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) return EMPLOYEE_LIST;

  return `${EMPLOYEE_LIST}/${raw}`;
}

module.exports = { canonicalPathFor, EMPLOYEE_LIST, LEGACY_CREATE_ID };
