/**
 * Does this navigation entry's permission condition hold?
 *
 * The menu used to say `permission: "view_employees"` and each of the four
 * places that render navigation compared it to the granted keys with `==`.
 * That expresses one requirement and only one, which was enough until an entry
 * needed a PREREQUISITE as well as its own key.
 *
 * Reports is the case that needed it. `view_reports` is a reporting
 * capability, not a doorway into a dataset: the Employee Master report also
 * requires `view_employees`, the same key that guards the HR directory, and
 * the backend enforces exactly that with `requireAll`. Showing the entry to
 * somebody holding only `view_reports` would put a module on their rail that
 * 403s the moment they open it.
 *
 * So a `permission` may now be:
 *
 *   undefined / null / ""   no requirement - the entry always shows
 *   "a_key"                 that one key, exactly as before
 *   ["a_key", "b_key"]      ALL of them
 *
 * AND rather than OR, deliberately and to match the backend. An array meaning
 * "any of these" would make a list of keys WEAKEN a condition as it grew,
 * which is the opposite of how everyone reads it - and is the same trap
 * `permissions.require(a, b)` sets on the server, where `requireAll` exists
 * for this reason.
 *
 * NOT A SECURITY BOUNDARY. This decides what to draw. Every route behind these
 * entries is guarded independently by the backend, which revalidates on every
 * request and does not care what the menu chose to render.
 */

/**
 * @param permission a key, an array of keys (all required), or nothing
 * @param granted    the user's permission rows, `[{ permission_key }]`
 */
function hasMenuPermission(permission, granted) {
  if (!permission) return true;
  if (!Array.isArray(granted)) return false;

  // `==` rather than `===`, preserved from the four call sites this replaces:
  // some permission rows arrive with a numeric-looking key, and tightening the
  // comparison here would silently hide entries that render today.
  const holds = (key) =>
    granted.find((item) => item && item.permission_key == key) !== undefined;

  if (Array.isArray(permission)) {
    // An empty array is "no requirement", not "requires nothing so refuse".
    return permission.length === 0 || permission.every(holds);
  }
  return holds(permission);
}

module.exports = hasMenuPermission;
module.exports.hasMenuPermission = hasMenuPermission;
