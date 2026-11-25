/**
 * M4 — what a salary API response body MEANS, as a pure decision.
 *
 * The salary endpoints answer with four quite different things, and a screen
 * that lumps them together tells HR the wrong story:
 *
 *   ok          the call worked
 *   denied      403. The user may not do this. NOT a failure to retry.
 *   refused     400/422. The SERVER'S BUSINESS RULE said no, and its message
 *               is the actionable part: "a pending salary revision already
 *               exists for 2026-10-01", "this employee already has a
 *               future-dated salary revision", "the salary period 2026-04 is
 *               locked". These are the answer, not an error to hide behind
 *               "something went wrong".
 *   error       500, a transport failure, a shape nobody expected
 *
 * THE REFUSAL MESSAGE IS SHOWN VERBATIM, minus the exception-class prefix.
 * `utils/http.js#respondError` sends `err.toString()`, which is
 * "ValidationError: <the sentence somebody needs to read>". The prefix is
 * noise on a screen; everything after it was written to be read by the person
 * who hit the rule, and paraphrasing it here would be a second copy of a rule
 * that lives on the server.
 *
 * NO SILENT FALLBACK TO AN EMPTY STATE. `unwrapList` already keeps that
 * distinction for lists; this keeps it for writes, so a refused approval never
 * renders as "done".
 *
 * CommonJS, so the decision can be unit-tested with `node --test` without a
 * bundler - the same reason `util/handle403.js` is.
 */

const PERMISSION_DENIED_MSG = "You do not have permission to perform this action";

const KIND = {
  OK: "ok",
  DENIED: "denied",
  REFUSED: "refused",
  ERROR: "error",
};

const GENERIC_ERROR = "Something went wrong. Please try again.";

/** "ValidationError: text" -> "text". Anything else is returned unchanged. */
function stripErrorPrefix(message) {
  if (typeof message !== "string") return null;
  const trimmed = message.trim();
  if (trimmed === "") return null;
  const match = /^[A-Za-z]*Error:\s*(.+)$/s.exec(trimmed);
  return match ? match[1].trim() : trimmed;
}

/**
 * @param body whatever a `helper/payrollSalary.js` method resolved with
 * @returns {{kind: string, message: string|null}}
 */
function describeApiResult(body) {
  if (!body || typeof body !== "object") {
    return { kind: KIND.ERROR, message: GENERIC_ERROR };
  }

  const code = body.code;

  // A success payload carries no `code` at all - every salary endpoint answers
  // with its own object. `code: 200` is honoured too, for the handful of
  // endpoints in this codebase that send one.
  if (code === undefined || code === null || code === 200) {
    return { kind: KIND.OK, message: null };
  }

  if (code === 403) {
    return {
      kind: KIND.DENIED,
      message: body.msg === PERMISSION_DENIED_MSG ? body.msg : body.msg || PERMISSION_DENIED_MSG,
    };
  }

  // 422 is what `respondError` labels a ValidationError; 400 is what it sends
  // for the handful of other named errors. Both are the server saying no for a
  // reason worth reading.
  if (code === 400 || code === 422) {
    return { kind: KIND.REFUSED, message: stripErrorPrefix(body.msg) || GENERIC_ERROR };
  }

  return { kind: KIND.ERROR, message: stripErrorPrefix(body.msg) || GENERIC_ERROR };
}

/** True when the body is anything other than a success. */
function isFailure(body) {
  return describeApiResult(body).kind !== KIND.OK;
}

module.exports = {
  KIND,
  GENERIC_ERROR,
  PERMISSION_DENIED_MSG,
  stripErrorPrefix,
  describeApiResult,
  isFailure,
};
