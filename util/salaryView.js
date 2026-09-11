/**
 * M3 — how the Employee Master reads the current approved salary.
 *
 * Pure functions, no React, so the decisions that matter can be tested without
 * a renderer: what a figure reads as, what an unresolved statutory component
 * reads as, and what each of them says about WHY.
 *
 * NOTHING HERE CALCULATES A SALARY. Every number on this screen comes from
 * `GET /hr/salary/employee/:id/current` exactly as the M2 resolver produced it
 * — gross, daily salary, the four components, both contributions, the employer
 * costs and the CTC. This module formats them and nothing else. A second
 * implementation of the breakup or of the statutory rules in the browser would
 * be a second answer, and the two would disagree the first time a rate changed.
 *
 * THREE ANSWERS, NOT TWO. A statutory figure is one of:
 *
 *   an amount        the backend resolved it, and it is shown as money
 *   Not applicable   the employee is not in that scheme. Nothing is
 *                    outstanding and nobody has to go and find anything.
 *   Pending          the backend could NOT resolve it and said why. It is
 *                    never shown as 0 — a contribution nobody has worked out
 *                    and a contribution of zero are different facts, and
 *                    printing the second for the first understates what the
 *                    employee is owed and what the employer will pay.
 *
 * The same distinction the Statutory section already draws between "not
 * recorded" and "Not applicable", applied to money.
 */

/* ---------------------------------------------------------------- money */

/**
 * Indian currency, Indian grouping, paise preserved.
 *
 * `en-IN` is what puts the lakh/crore grouping in ("₹45,00,000.50" rather than
 * "₹4,500,000.50"), and two fraction digits are fixed rather than optional so
 * a column of figures lines up and a paise value is never silently rounded
 * away. DECIMAL columns arrive from the driver as strings, so the value is
 * coerced here rather than at every call site.
 */
function formatMoney(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * `YYYY-MM-DD` as "01 Apr 2026".
 *
 * Written out rather than passed through a date library: the API sends a
 * date-only string on purpose, and parsing it into a Date would invite a
 * timezone to move it by a day — which on an effective date is the difference
 * between a salary applying this month and next.
 */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatEffectiveFrom(value) {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!match) return String(value);
  const [, year, month, day] = match;
  const name = MONTHS[Number(month) - 1];
  if (!name) return String(value);
  return `${day} ${name} ${year}`;
}

/* --------------------------------------------------- unresolved reasons */

/**
 * The backend's stable reason codes, in words HR can act on.
 *
 * `utils/salary_engine.js` keys these strings deliberately so that screens can
 * say WHY rather than just "Pending" — and every one of them names something
 * somebody can go and fix, which is the only reason to show a reason at all.
 */
const UNRESOLVED_TEXT = {
  PF_APPLICABILITY_NOT_RECORDED:
    "PF applicable has not been recorded on Statutory Details.",
  EPS_MEMBERSHIP_NOT_RECORDED:
    "Existing / Previous EPS member has not been recorded on Statutory Details.",
  EPS_DOB_NOT_RECORDED:
    "Date of birth has not been recorded, so pension-scheme eligibility cannot be decided.",
  ESI_APPLICABILITY_NOT_RECORDED:
    "ESI applicable has not been recorded on Statutory Details.",
  ESI_WAGE_CONTEXT_UNAVAILABLE:
    "ESI is charged on the wage actually paid in a month, and monthly payroll has not produced one yet.",
};

/** A code nobody has written copy for yet, as a readable sentence. */
function humaniseCode(code) {
  const words = String(code).toLowerCase().replace(/_/g, " ").trim();
  if (!words) return null;
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}.`;
}

/**
 * The reason text for one component, from the stored `unresolved_notes`.
 *
 * `components` is a list because one displayed figure can be unresolved for
 * more than one reason - the CTC is pending whenever ANY employer cost in it
 * is - and because the note's `component` names the engine's part, not the
 * label on this screen.
 */
function unresolvedReason(notes, components) {
  const wanted = Array.isArray(components) ? components : [components];
  const seen = [];
  for (const note of Array.isArray(notes) ? notes : []) {
    if (!note || !note.code) continue;
    // No component filter means "any reason at all" - which is what the CTC
    // wants, since it is the sum of everything above it.
    if (wanted.length && !wanted.includes(note.component)) continue;
    const text = UNRESOLVED_TEXT[note.code] || humaniseCode(note.code);
    if (text && !seen.includes(text)) seen.push(text);
  }
  return seen.length ? seen.join(" ") : null;
}

/* ------------------------------------------------------------- the cells */

const APPLIED = "APPLIED";
const NOT_APPLICABLE = "NOT_APPLICABLE";
const PENDING = "PENDING";

/**
 * One money figure, as the screen should render it.
 *
 * Returns `{ kind, text, reason }` rather than a string, so the component can
 * style a Pending differently from an amount without re-deciding which it is.
 *
 * A NULL AMOUNT IS PENDING, NOT ZERO — and that is true even when the section
 * status is APPLIED: PF can be applicable and fully computed while the EPS
 * split alone is unresolved, and the engine reports exactly that by leaving
 * `employer_eps` and `employer_epf` null on an APPLIED record.
 */
function moneyCell(amount, { status, notes, components } = {}) {
  if (status === NOT_APPLICABLE) {
    return { kind: "not_applicable", text: "Not applicable", reason: null };
  }
  const text = formatMoney(amount);
  if (status === PENDING || text === null) {
    return {
      kind: "pending",
      text: "Pending",
      reason: unresolvedReason(notes, components),
    };
  }
  return { kind: "amount", text, reason: null };
}

/** A plain figure that carries no statutory status of its own. */
function plainCell(amount) {
  const text = formatMoney(amount);
  if (text === null) return { kind: "pending", text: "Pending", reason: null };
  return { kind: "amount", text, reason: null };
}

/* -------------------------------------------------------- the whole card */

/**
 * The Payroll section's contents, from one `current_salary` record.
 *
 * The grouping is the approved M3 layout and is decided here rather than in
 * the JSX so the order and the membership of each group can be asserted:
 * summary, structure, what the employee loses, what the employer adds, and
 * the CTC those two produce.
 */
function presentCurrentSalary(record) {
  if (!record) return null;

  const notes = Array.isArray(record.unresolved_notes) ? record.unresolved_notes : [];
  const pf = { status: record.pf_status, notes, components: ["pf"] };
  const esi = { status: record.esi_status, notes, components: ["esi"] };
  // The EPS split has its own note component: the employer's 12% is known,
  // and it is only the division of it that nobody can decide yet.
  const eps = { status: record.pf_status, notes, components: ["pf", "employer_eps"] };

  return {
    summary: {
      monthly_gross: plainCell(record.monthly_gross),
      daily_salary: plainCell(record.daily_salary),
      effective_from: formatEffectiveFrom(record.effective_from),
      status: record.status || null,
    },
    structure: [
      { label: "Basic", cell: plainCell(record.basic) },
      { label: "Conveyance", cell: plainCell(record.conveyance) },
      { label: "HRA", cell: plainCell(record.hra) },
      { label: "Special Allowance", cell: plainCell(record.special_allowance) },
    ],
    employeeDeductions: [
      { label: "Employee PF", cell: moneyCell(record.employee_pf, pf) },
      { label: "Employee ESI", cell: moneyCell(record.employee_esi, esi) },
    ],
    employerContributions: [
      { label: "Employer EPF", cell: moneyCell(record.employer_epf, eps) },
      { label: "Employer EPS", cell: moneyCell(record.employer_eps, eps) },
      { label: "EDLI", cell: moneyCell(record.edli, pf) },
      { label: "PF Admin Charge", cell: moneyCell(record.pf_admin_charge, pf) },
      { label: "Employer ESI", cell: moneyCell(record.employer_esi, esi) },
    ],
    // The CTC has no scheme of its own to be outside of: it is either worked
    // out or it is waiting on something above it, so every note counts.
    ctc: moneyCell(record.monthly_ctc, { status: record.ctc_status, notes, components: [] }),
  };
}

module.exports = {
  formatMoney,
  formatEffectiveFrom,
  UNRESOLVED_TEXT,
  unresolvedReason,
  moneyCell,
  plainCell,
  presentCurrentSalary,
  SALARY_FIELD_STATUS: { APPLIED, NOT_APPLICABLE, PENDING },
};
