/**
 * What a 403 response body means, as a pure decision.
 *
 * The backend answers with `code: 403` for two completely different reasons,
 * and the difference decides whether the user keeps their session:
 *
 *   * AUTHENTICATION refused - no token, an invalid or expired token, a
 *     revoked or inactive account. `middlewares/auth.js` sends these with
 *     `msg: "Access Denied"`. The session really is gone, so the user goes
 *     to /login.
 *
 *   * AUTHORISATION refused (Stage 0B / B2) - a perfectly valid session that
 *     does not hold the permission for that route. `middlewares/permissions.js`
 *     sends these with `msg: "You do not have permission to perform this
 *     action"`. Redirecting here would log a signed-in user out of the whole
 *     application because one dropdown on the page happened to be an HR
 *     endpoint, so the body is handed back to the caller instead.
 *
 * The two are told apart by `msg`, never by "has no `error` field": an
 * authentication refusal also has no `error` in most of its branches.
 *
 * CommonJS on purpose, so the decision can be unit-tested with `node --test`
 * without a bundler; the ESM side imports it through Babel's interop.
 */
const PERMISSION_DENIED_MSG = "You do not have permission to perform this action";

/**
 * @param {object} res       the parsed response body
 * @param {string} pathname  window.location.pathname
 * @returns {{href: string|null}} where to send the browser, or null to stay
 */
function classify403(res, pathname) {
  const stay = { href: null };

  if (!res || res.code !== 403 || pathname === "/login") return stay;

  // A session confined to the change-password screen is not a stale session
  // either. Send it there, not to login.
  if (res.error === "PASSWORD_CHANGE_REQUIRED") {
    if (pathname === "/change-password") return stay;
    return { href: "/change-password?required=1" };
  }

  // A refused employee-only action for a system account is a real answer,
  // not a session problem; let the caller show it.
  if (res.error === "EMPLOYEE_REQUIRED") return stay;

  // Stage 0B / B2: a permission refusal is a real answer too. The session is
  // valid and must survive it.
  if (res.msg === PERMISSION_DENIED_MSG) return stay;

  // An IP block is not a stale session - send the reason along so the login
  // screen can explain it instead of showing a blank form.
  if (res.error === "IP_NOT_ALLOWED") {
    const ip = res.ip ? `&ip=${encodeURIComponent(res.ip)}` : "";
    return { href: `/login?blocked=ip${ip}` };
  }

  // Everything else that reaches here is an authentication refusal.
  return { href: "/login" };
}

module.exports = classify403;
module.exports.classify403 = classify403;
module.exports.PERMISSION_DENIED_MSG = PERMISSION_DENIED_MSG;
