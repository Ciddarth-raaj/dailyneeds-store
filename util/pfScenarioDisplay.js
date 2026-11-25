/**
 * PF SCENARIO AND PF RULE REFERENCES, SAID IN WORDS - display only.
 *
 * The server stores the month's PF case as one machine code, built by
 * `utils/pf_period.js#scenarioOf` in the backend:
 *
 *   [FAQ_x:]<period state>[><period state>]|<contribution basis>
 *
 *   EXCLUDED>EXCLUDED|CEILING            a month split by the 17-09-2026 ceiling
 *                                        revision, excluded in both periods
 *   FAQ_B:EPF_ONLY>EPF_EPS|ACTUAL_WAGE   EPF only, then EPF + EPS
 *
 * Printed as it is, that is one unbreakable string the reader has to decode
 * themselves - and it read as a duplicated, concatenated value. This splits it
 * into the parts it already carries and names each one. NOTHING IS DECIDED
 * HERE: no state, basis or case is worked out from a figure; a code this does
 * not recognise is shown as the code itself, and the raw code is kept for
 * reference.
 */

const STATE_LABEL = {
  NOT_EMPLOYED: "Not employed",
  EXCLUDED: "Excluded",
  PF_NOT_RECORDED: "PF not recorded",
  NO_PAY: "No pay",
  EPF_ONLY: "EPF only",
  EPF_EPS: "EPF + EPS",
  EPS_UNRESOLVED: "EPS unresolved",
};

const BASIS_LABEL = {
  CEILING: "Wage ceiling",
  ACTUAL_WAGE: "Actual wage",
};

/**
 * @param {string|null} code  the stored `pf_scenario`
 * @returns {null | { status: string, periods: string[], basis: string|null, faq: string|null, code: string }}
 *   `status` is the one value to show beside "PF Scenario": the single state
 *   when every period was the same, else the states in order ("EPF only, then
 *   EPF + EPS").
 */
function describePfScenario(code) {
  const raw = code === null || code === undefined ? "" : String(code).trim();
  if (!raw) return null;

  let body = raw;
  let faq = null;
  const faqMatch = /^(FAQ_[A-Z])\s*:\s*(.*)$/.exec(body);
  if (faqMatch) {
    faq = `EPFO FAQ case ${faqMatch[1].slice(4)}`;
    body = faqMatch[2];
  }

  const [statesPart, basisPart] = body.split("|");
  const states = String(statesPart || "")
    .split(/[>›]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const periods = states.map((s) => STATE_LABEL[s] || s);
  if (periods.length === 0) {
    return { status: raw, periods: [], basis: null, faq, code: raw };
  }
  // The same state in every period is ONE state, not a repetition.
  const distinct = periods.filter((p, i) => i === 0 || p !== periods[i - 1]);
  const basisCode = String(basisPart || "").trim();
  return {
    status: distinct.join(", then "),
    periods,
    basis: basisCode ? BASIS_LABEL[basisCode] || basisCode : null,
    faq,
    code: raw,
  };
}

/**
 * The PF ceiling rule reference(s). A month cut by a ceiling revision carries
 * both rules joined by "+"; each is its own line, not one 60-character token.
 */
function pfRuleReferences(version) {
  const raw = version === null || version === undefined ? "" : String(version).trim();
  if (!raw) return [];
  return raw
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * A machine identifier as pieces that may break AFTER each separator
 * (EPFO-CEILING-15000-2014-09-01 -> "EPFO-", "CEILING-", ...), so it wraps at
 * a boundary a person would choose rather than mid-word.
 */
function identifierPieces(id) {
  return String(id || "").match(/[^-_/.:|>]+[-_/.:|>]*|[-_/.:|>]+/g) || [];
}

module.exports = {
  describePfScenario,
  pfRuleReferences,
  identifierPieces,
};
