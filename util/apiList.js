/**
 * Turn whatever an API helper resolved with into a list a component can render.
 *
 * The helpers in `helper/` resolve `res.data` without looking at the status,
 * so a caller expecting an array can receive an error body instead. Since
 * Stage 0B/B2 that is a routine occurrence rather than an edge case: a
 * permission refusal is `{ code: 403, msg: "You do not have permission to
 * perform this action" }`, and `util/api.js` deliberately hands it back to the
 * caller so the session survives. A hook that then calls `.filter` on it
 * throws during render, and React unwinds to the generic Next.js `/_error`
 * page — which is how a legitimate 403 became "Something Went Wrong".
 *
 * Three outcomes are kept apart on purpose, because they need different
 * treatment on screen and must never be confused:
 *
 *   ok           the request succeeded; `items` is the array
 *   accessDenied the caller lacks the permission — say so, do not pretend
 *                the list is empty
 *   error        anything else went wrong — a 500, a malformed payload
 *
 * In all three cases `items` is an array, so rendering cannot throw.
 */

const PERMISSION_DENIED_MSG = "You do not have permission to perform this action";

/** True when `body` is B2/B3's permission refusal. Matched on msg, not on the
 *  absence of an `error` field: middlewares/auth.js sends "Access Denied"
 *  with no `error` either, and that one means the session is gone. */
const isPermissionDenied = (body) =>
  Boolean(body) && body.code === 403 && body.msg === PERMISSION_DENIED_MSG;

/**
 * @param {*} response whatever the helper resolved with
 * @returns {{items: Array, accessDenied: boolean, error: boolean, message: string|null}}
 */
function unwrapList(response) {
  if (Array.isArray(response)) {
    return { items: response, accessDenied: false, error: false, message: null };
  }

  if (isPermissionDenied(response)) {
    return { items: [], accessDenied: true, error: false, message: response.msg };
  }

  // Every other shape is a failure of some kind: an error body, a null, or a
  // success payload that is not the list this caller was promised. None of
  // them is "no data", and none of them may reach `.filter`.
  const message =
    response && typeof response === "object" && typeof response.msg === "string"
      ? response.msg
      : null;
  return { items: [], accessDenied: false, error: true, message };
}

module.exports = unwrapList;
module.exports.unwrapList = unwrapList;
module.exports.isPermissionDenied = isPermissionDenied;
module.exports.PERMISSION_DENIED_MSG = PERMISSION_DENIED_MSG;
