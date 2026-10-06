/**
 * THE PAYSLIP, AS A SCREEN READS IT - pure presentation of a frozen snapshot.
 *
 * The snapshot arrives from the server already frozen at Publish (Mini App:
 * `GET /telegram/payslips/detail`; admin: `GET /payrun/calculation/payslip`).
 * NOTHING HERE COMPUTES A FIGURE: every amount is the snapshot's own string,
 * formatted. Lines are hidden only when they are optional AND zero - the same
 * rule the server's PDF uses - so the screen and the PDF list the same lines.
 */

/** "12345.50" -> "₹12,345.50" (Indian grouping). Text in, text out - no float. */
function formatRupees(amount) {
  if (amount === null || amount === undefined || amount === "") return "—";
  const text = String(amount);
  const negative = text.startsWith("-");
  const [whole, frac = "00"] = text.replace("-", "").split(".");
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return `${negative ? "-" : ""}₹${grouped}.${frac.padEnd(2, "0").slice(0, 2)}`;
}

const isZero = (amount) => amount === null || amount === undefined || Number(amount) === 0;

/** Every non-optional line, and optional lines only when non-zero. */
const printableLines = (lines) => (lines || []).filter((l) => l && (!l.optional || !isZero(l.amount)));

const payTypeLabel = (payType) => (payType === "BANK" ? "Bank" : payType === "CASH" ? "Cash" : payType || null);

/** [label, value] pairs with the empty ones dropped. */
const facts = (pairs) => pairs.filter(([, v]) => v !== null && v !== undefined && v !== "");

function employeeFacts(snapshot) {
  const e = (snapshot && snapshot.employee) || {};
  return facts([
    ["Name", e.employee_name],
    ["Employee ID", e.employee_id],
    ["Designation", e.designation_name],
    ["Department", e.department_name],
    ["Outlet", e.store_name],
    ["Date of Joining", e.date_of_joining],
    ["Payroll Month", snapshot && snapshot.period && snapshot.period.label],
    ["Payment Type", payTypeLabel(e.pay_type)],
    ["Bank Name", e.bank_name],
    ["Bank Account", e.bank_account_masked],
    ["PAN", e.pan_masked],
  ]);
}

function attendanceFacts(snapshot) {
  const a = (snapshot && snapshot.attendance) || {};
  return facts([
    ["Monthly Gross (Fixed)", a.monthly_gross ? formatRupees(a.monthly_gross) : null],
    ["Salary Days", a.salary_days],
    ["Daily Rate", a.daily_rate ? formatRupees(a.daily_rate) : null],
    ["Standard Working Hours / Day", a.nrm_hours],
    ["Missing Hours", Number(a.missing_hours) > 0 ? `${a.missing_hours} h` : null],
    ["Missing-hours Deduction", !isZero(a.missing_hours_deduction) ? formatRupees(a.missing_hours_deduction) : null],
    ["Extra Days", Number(a.extra_days) > 0 ? a.extra_days : null],
    ["Approved OT Hours", Number(a.approved_ot_hours) > 0 ? a.approved_ot_hours : null],
    ["OT Rate", Number(a.approved_ot_hours) > 0 && a.ot_hourly_rate ? `${formatRupees(a.ot_hourly_rate)} / hour` : null],
    ["OT Amount", Number(a.approved_ot_hours) > 0 ? formatRupees(a.ot_amount) : null],
  ]);
}

/**
 * UAN / PF / ESI numbers in full (snapshot schema 2). A schema-1 snapshot
 * carries only the masked form, which is shown as it was frozen.
 */
const full = (value, masked) => (value !== undefined ? value : masked);

function statutoryFacts(snapshot) {
  const s = (snapshot && snapshot.statutory) || {};
  const c = (snapshot && snapshot.company) || {};
  return facts([
    ["UAN", s.pf_applicable ? full(s.uan, s.uan_masked) : null],
    ["PF Number", s.pf_applicable ? full(s.pf_number, s.pf_number_masked) : null],
    ["PF Wage", s.pf_wage ? formatRupees(s.pf_wage) : null],
    ["ESI Number", s.esi_applicable ? full(s.esi_number, s.esi_number_masked) : null],
    ["ESI Wage", s.esi_wage ? formatRupees(s.esi_wage) : null],
    ["PF Establishment Code", s.pf_applicable ? c.pf_establishment_code : null],
    ["ESI Establishment Code", s.esi_applicable ? c.esi_establishment_code : null],
  ]);
}

/** Advance Details - only when the snapshot has an advance block (balance or recovery). */
function advanceFacts(snapshot) {
  const a = snapshot && snapshot.advance;
  if (!a || (isZero(a.closing_balance) && isZero(a.recovery_this_month))) return [];
  return facts([
    ["Advance Opening Balance", formatRupees(a.opening_balance)],
    ["Recovery This Month", formatRupees(a.recovery_this_month)],
    ["Advance Closing Balance", formatRupees(a.closing_balance)],
  ]);
}

/**
 * CTC / Employer Contribution - informational, never part of Earnings or
 * Deductions. The figures are the snapshot's own (Monthly CTC = Monthly Gross
 * + Total Employer Contribution, frozen at Publish); zero rows are hidden.
 */
function employerContributionFacts(snapshot) {
  const c = snapshot && snapshot.employer_contribution;
  if (!c || !c.monthly_ctc) return [];
  return facts([
    ["Employer PF Contribution", isZero(c.employer_pf) ? null : formatRupees(c.employer_pf)],
    ["Employer ESI Contribution", isZero(c.employer_esi) ? null : formatRupees(c.employer_esi)],
    ["Other Employer Contribution", isZero(c.other) ? null : formatRupees(c.other)],
    ["Total Employer Contribution", isZero(c.total) ? null : formatRupees(c.total)],
    ["Monthly Gross (Fixed)", formatRupees(c.monthly_gross)],
    ["Monthly CTC", formatRupees(c.monthly_ctc)],
    ["Annual CTC", formatRupees(c.annual_ctc)],
  ]);
}

function finalFacts(snapshot) {
  const f = (snapshot && snapshot.final) || {};
  return facts([
    ["Net Pay Before Rounding", formatRupees(f.net_pay_before_rounding)],
    ["Round-off", formatRupees(f.net_pay_rounding)],
    ["Final Net Pay", formatRupees(f.net_pay)],
  ]);
}

/** "September 2026 - Published", newest first, as the server sent it. */
const payslipListLabel = (p) => `${p.label} — ${p.status || "Published"}`;

module.exports = {
  formatRupees,
  printableLines,
  payTypeLabel,
  employeeFacts,
  attendanceFacts,
  statutoryFacts,
  advanceFacts,
  employerContributionFacts,
  finalFacts,
  payslipListLabel,
};
