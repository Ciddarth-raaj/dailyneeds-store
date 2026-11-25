/**
 * WHAT HAPPENED TO ONE SECTION'S READ — as four distinct answers.
 *
 * ============================== THE DEFECT THIS FIXES =====================
 *
 * The employee profile loaded its sections like this:
 *
 *     HrHelper.getAadhaarStatus(id).catch(() => null)
 *     const usable = (r) => (r && !r.code ? r : null);
 *
 * Every possible failure collapsed into the same `null`: a permission
 * refusal, a missing employee, a server error and a dropped connection were
 * all indistinguishable from each other - and, worse, indistinguishable from
 * a section that had loaded and had nothing in it.
 *
 * The Aadhaar card then read that `null` as a BUSINESS STATE:
 *
 *     badge={<AadhaarBadge status={aadhaar ? aadhaar.aadhaar_status : "PENDING"} />}
 *     "No Aadhaar on record."
 *
 * So a store manager who simply lacks `view_employee_lifecycle` - the key
 * that gates the Aadhaar status endpoint - was told, as a fact about the
 * employee, that no Aadhaar existed. That is not a display quirk; it is the
 * application asserting something false about a person's records.
 *
 * A FAILURE IS NOT A VALUE. This module keeps the reasons apart so a section
 * can say what it actually knows.
 *
 * ============================== THE FOUR STATES ===========================
 *
 *   OK       the server answered, and the payload is the answer. This is the
 *            ONLY state a business conclusion may be drawn from.
 *   DENIED   this user is not allowed to read it. Says nothing whatever about
 *            the employee.
 *   MISSING  the server says there is no such record (404).
 *   ERROR    anything else - a 500, a timeout, a dropped connection, a body
 *            that would not parse. Unknown, not empty.
 *
 * CommonJS, like `util/hrStatus.js`, so the rule is testable with
 * `node --test` and no bundler or React runner.
 */

const SECTION_STATE = Object.freeze({
  OK: "OK",
  DENIED: "DENIED",
  MISSING: "MISSING",
  ERROR: "ERROR",
});

/** The backend's permission refusal, from `middlewares/permissions.js`. */
const PERMISSION_DENIED_MSG = "You do not have permission to perform this action";

const result = (state, data, message) => ({
  state,
  data: state === SECTION_STATE.OK ? data : null,
  message: message || null,
  ok: state === SECTION_STATE.OK,
  denied: state === SECTION_STATE.DENIED,
});

/**
 * Classify a RESOLVED response body.
 *
 * `util/api.js` sets `validateStatus` to accept everything below 429, so a
 * 403 and a 500 arrive here as ordinary resolved bodies carrying `code`
 * rather than as thrown errors. That is why the body, not the transport, is
 * what decides.
 *
 * A body with no `code` is the success shape these endpoints use; `code: 200`
 * is accepted too, because an endpoint that starts sending one should not
 * silently blank a section.
 */
function classifyBody(body) {
  if (body === null || body === undefined) {
    return result(SECTION_STATE.ERROR, null, "No response from the server.");
  }
  if (typeof body !== "object") {
    return result(SECTION_STATE.ERROR, null, "The server sent an unexpected response.");
  }

  const code = Number(body.code);

  if (!body.code || code === 200) return result(SECTION_STATE.OK, body);

  if (code === 403) {
    // Both shapes are a refusal of THIS read and not of the session: B2's
    // permission message, and the branch-scope refusal added with employee
    // branch scoping, which carries its own `error` and message.
    return result(SECTION_STATE.DENIED, null, body.msg || PERMISSION_DENIED_MSG);
  }
  if (code === 401) return result(SECTION_STATE.DENIED, null, body.msg || "Not signed in.");
  if (code === 404) return result(SECTION_STATE.MISSING, null, body.msg || "Not found.");

  return result(SECTION_STATE.ERROR, null, body.msg || "This could not be loaded.");
}

/** Classify a THROWN failure - a network drop, a 429+, an unparseable body. */
function classifyError(err) {
  const status = err && err.response ? Number(err.response.status) : null;

  if (status === 403 || status === 401) {
    const body = (err.response && err.response.data) || {};
    return result(SECTION_STATE.DENIED, null, body.msg || PERMISSION_DENIED_MSG);
  }
  if (status === 404) return result(SECTION_STATE.MISSING, null, "Not found.");

  return result(SECTION_STATE.ERROR, null, "This could not be loaded.");
}

/**
 * Run one section's read and never throw.
 *
 * Returns the classified outcome, so a caller can await several of these with
 * `Promise.all` and have each section report for itself - a refusal on one
 * still must not blank the page.
 */
function loadSection(promise) {
  return Promise.resolve(promise).then(classifyBody, classifyError);
}

/**
 * The payload if - and only if - the read actually succeeded.
 * Anything else is `null`, which is what a caller should render as "unknown".
 */
const dataOf = (outcome) => (outcome && outcome.ok ? outcome.data : null);

module.exports = {
  SECTION_STATE,
  PERMISSION_DENIED_MSG,
  classifyBody,
  classifyError,
  loadSection,
  dataOf,
};
