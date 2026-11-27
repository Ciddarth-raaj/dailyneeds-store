/**
 * Stock Audit - the calculation rules the screens show, mirrored from the
 * backend (dailyneeds-store-backend utils/stock_audit_incentive.js,
 * utils/stock_audit_verification.js). The backend stays the source of truth;
 * this copy exists so previews and sample data use the same slabs.
 *
 * Every figure is a status cell: { status, value, reason }.
 * Only AVAILABLE carries a value. Missing information is never 0 or 100%.
 */

export const STATUS = {
  AVAILABLE: "AVAILABLE",
  PENDING: "PENDING",
  UNAVAILABLE: "UNAVAILABLE",
  NOT_APPLICABLE: "NOT_APPLICABLE",
};

export const available = (value, extra = {}) => ({ status: STATUS.AVAILABLE, value, ...extra });
export const pending = (reason) => ({ status: STATUS.PENDING, value: null, reason });
export const unavailable = (reason) => ({ status: STATUS.UNAVAILABLE, value: null, reason });
export const notApplicable = (reason) => ({ status: STATUS.NOT_APPLICABLE, value: null, reason });
export const known = (c) => Boolean(c) && c.status === STATUS.AVAILABLE;

export const REASON_LABEL = {
  ALLOTMENT_UNAVAILABLE: "Allotment not imported yet",
  PENDING_VERIFICATION: "Waiting for recounts",
  INSUFFICIENT_SAMPLE: "Recount sample below 5%",
  PENDING_ELIGIBILITY_REVIEW: "Eligibility review pending",
  POLICY_NOT_APPROVED: "Policy not approved",
  NO_ARTICLES: "No articles audited",
  NO_DATA: "Data not in yet",
  COMPONENT_PENDING: "Some KPIs pending",
  INDEPENDENT_VERIFICATION_PENDING: "Independent verification pending",
  INDEPENDENT_VERIFICATION_NOT_DONE: "Independent verification not done",
  RECOUNT_DATA_PENDING: "Recount data from RetailPilot pending",
  NOT_APPROVED: "Not approved yet",
  HISTORY_UNAVAILABLE: "Historical figures not reconstructable",
  BEFORE_DEADLINE: "Audit deadline not reached yet",
};

/** Confirmed 27 Nov 2026. */
export const EMPLOYEE_SLABS = [
  { minAccuracyPct: 99, rate: 1.1 },
  { minAccuracyPct: 97, rate: 1.0 },
  { minAccuracyPct: 95, rate: 0.5 },
];
export const MIN_SAMPLE_PCT = 5;

export const MANAGEMENT = {
  SUPERVISOR: {
    title: "Supervisor",
    max: 1000,
    components: [
      { key: "completion_within_deadline", label: "Audit completion within deadline", max: 200 },
      { key: "employee_counting_accuracy", label: "Employee counting accuracy", max: 300 },
      { key: "independent_recount_verification", label: "Independent recount and verification", max: 500 },
    ],
  },
  STORE_MANAGER: {
    title: "Store Manager",
    max: 1500,
    components: [
      { key: "completion_within_deadline", label: "Audit completion within deadline", max: 600 },
      { key: "employee_counting_accuracy", label: "Employee counting accuracy", max: 500 },
      { key: "verification_quality_control", label: "Verification quality control", max: 400 },
    ],
  },
  OPERATIONS_MANAGER: {
    title: "Operations Manager",
    max: 2000,
    perStoreMax: 400,
    slabs: [
      { minScorePct: 98, amount: 400 },
      { minScorePct: 95, amount: 300 },
      { minScorePct: 90, amount: 200 },
    ],
  },
};

/** 5% of UNIQUE articles, rounded up; at least 1. */
export const requiredSample = (uniqueArticles) => (uniqueArticles > 0 ? Math.max(1, Math.ceil((uniqueArticles * MIN_SAMPLE_PCT) / 100)) : 0);

/** Exact slab, never rounded up into a slab. */
export function rateFor(matched, verified) {
  const slab = EMPLOYEE_SLABS.find((s) => matched * 100 * 1000 >= Math.round(s.minAccuracyPct * 1000) * verified);
  return slab ? slab.rate : 0;
}

/** Employee incentive for one cycle (same order of checks as the backend). */
export function employeeIncentive({ audited = 0, eligible = 0, pendingEligibility = 0, verified = 0, matched = 0 }) {
  const required = requiredSample(audited);
  const sample = { required, verified, matched, met: verified >= required && required > 0 };
  if (!audited) return { status: "NOT_APPLICABLE", sample, accuracy: notApplicable("NO_ARTICLES"), rate: notApplicable("NO_ARTICLES"), amount: notApplicable("NO_ARTICLES") };
  if (!verified) return { status: "PENDING_VERIFICATION", sample, accuracy: pending("PENDING_VERIFICATION"), rate: pending("PENDING_VERIFICATION"), amount: pending("PENDING_VERIFICATION") };
  const acc = (matched * 100) / verified;
  if (!sample.met) return { status: "INSUFFICIENT_SAMPLE", sample, accuracy: available(acc, { provisional: true }), rate: pending("INSUFFICIENT_SAMPLE"), amount: pending("INSUFFICIENT_SAMPLE") };
  const rate = rateFor(matched, verified);
  const amount = Math.round(rate * 100 * eligible) / 100;
  if (pendingEligibility > 0) {
    return { status: "PENDING_ELIGIBILITY_REVIEW", sample, accuracy: available(acc), rate: available(rate), amount: pending("PENDING_ELIGIBILITY_REVIEW"), provisional: amount };
  }
  return { status: "CALCULATED", sample, accuracy: available(acc), rate: available(rate), amount: available(amount) };
}

/** Score one KPI component from its measure (threshold scoring by default). */
export function scoreComponent(component, measure, minPct = 100) {
  if (!known(measure)) return { ...component, measure, payPct: null, amount: { ...measure } };
  const payPct = measure.value >= minPct ? 100 : 0;
  return { ...component, measure, payPct, amount: available((component.max * payPct) / 100) };
}

export function roleIncentive(role, measures, thresholds = {}) {
  const r = MANAGEMENT[role];
  const components = r.components.map((c) => scoreComponent(c, measures[c.key] || pending("NO_DATA"), thresholds[c.key] ?? 100));
  const decided = components.filter((c) => known(c.amount));
  const decidedAmount = Math.min(decided.reduce((t, c) => t + c.amount.value, 0), r.max);
  const complete = decided.length === components.length;
  const totalMax = components.reduce((t, c) => t + c.max, 0);
  return {
    role,
    components,
    decidedAmount,
    amount: complete ? available(decidedAmount) : pending("COMPONENT_PENDING"),
    weightedScore: complete ? available(components.reduce((t, c) => t + c.payPct * c.max, 0) / totalMax) : pending("COMPONENT_PENDING"),
  };
}

export function omStoreAmount(score, independentVerification) {
  if (independentVerification === false) return available(0, { reason: "INDEPENDENT_VERIFICATION_NOT_DONE" });
  if (independentVerification !== true) return pending("INDEPENDENT_VERIFICATION_PENDING");
  if (!known(score)) return pending("COMPONENT_PENDING");
  const slab = MANAGEMENT.OPERATIONS_MANAGER.slabs.find((s) => score.value >= s.minScorePct);
  return available(slab ? slab.amount : 0);
}

export const PROGRAMME_START = "2026-11-25T00:00:00+05:30";
export const SAPL_PRIZE = 10000;

/** SAPL scoring, confirmed 27 Nov 2026: 100 points. Shortage / excess never score. */
export const SAPL_DEFAULT_WEIGHTS = [
  { key: "completion", label: "Audit completion", max: 35 },
  { key: "accuracy", label: "Physical counting accuracy", max: 40 },
  { key: "recount", label: "Independent recount completion", max: 20 },
  { key: "participation", label: "Employee participation", max: 5 },
];

/** Points from comparable percentages. Missing KPI -> that KPI pending, total provisional. */
export function saplPoints(kpis, weights = SAPL_DEFAULT_WEIGHTS) {
  const rows = weights.map((w) => {
    const m = kpis[w.key];
    if (!known(m)) return { ...w, measure: m || pending("NO_DATA"), points: null };
    return { ...w, measure: m, points: Math.round(((w.max * Math.max(0, Math.min(100, m.value))) / 100) * 10) / 10 };
  });
  const decided = rows.filter((r) => r.points != null);
  const total = Math.round(decided.reduce((t, r) => t + r.points, 0) * 10) / 10;
  return { rows, total, complete: decided.length === rows.length };
}

/**
 * ESTIMATED incentive while the cycle runs (mirrors backend
 * estimateEmployeeIncentive). Never payable - approval and payroll use
 * employeeIncentive().amount only. No recounts -> pending (accuracy is never
 * assumed); otherwise the slab of the accuracy measured so far.
 */
export function estimateIncentive({ audited = 0, pendingEligibility = 0, allotted = null, verified = 0, matched = 0 }) {
  const required = requiredSample(audited);
  const sample = { required, verified, matched, met: verified >= required && required > 0 };
  if (!audited) {
    const na = notApplicable("NO_ARTICLES");
    return { basis: "NO_ARTICLES", sample, base: 0, accuracy: na, rate: na, estimate: na, projected: na, maxSoFar: na };
  }
  const base = Math.max(0, audited - pendingEligibility);
  const top = Math.max(...EMPLOYEE_SLABS.map((s) => s.rate));
  const money = (rate, n) => Math.round(rate * 100) * n / 100;
  const maxSoFar = available(money(top, base));
  const allotKnown = allotted != null;
  if (!verified) {
    const p = pending("PENDING_VERIFICATION");
    return { basis: "NO_RECOUNTS", sample, base, accuracy: p, rate: p, estimate: p, projected: allotKnown ? p : unavailable("ALLOTMENT_UNAVAILABLE"), maxSoFar };
  }
  const rate = rateFor(matched, verified);
  return {
    basis: sample.met ? "SAMPLE_MET" : "PARTIAL_SAMPLE",
    sample,
    base,
    accuracy: available((matched * 100) / verified),
    rate: available(rate),
    estimate: available(money(rate, base), { estimate: true }),
    projected: allotKnown ? available(money(rate, Math.max(0, allotted - pendingEligibility)), { estimate: true }) : unavailable("ALLOTMENT_UNAVAILABLE"),
    maxSoFar,
  };
}

export const ESTIMATE_BASIS_LABEL = {
  NO_ARTICLES: "No articles audited",
  NO_RECOUNTS: "No recounts yet - estimate starts after the first recount",
  PARTIAL_SAMPLE: "Based on recounts so far (5% sample not complete)",
  SAMPLE_MET: "Based on the full 5% recount sample",
};
