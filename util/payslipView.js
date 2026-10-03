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
    ["Outlet", e.store_name],
    ["Department", e.department_name],
    ["Payroll Month", snapshot && snapshot.period && snapshot.period.label],
    ["Payment Type", payTypeLabel(e.pay_type)],
    ["Date of Joining", e.date_of_joining],
    ["Bank", e.bank_name],
    ["Bank Account", e.bank_account_masked],
    ["PAN", e.pan_masked],
  ]);
}

function attendanceFacts(snapshot) {
  const a = (snapshot && snapshot.attendance) || {};
  return facts([
    ["Monthly Gross", a.monthly_gross ? formatRupees(a.monthly_gross) : null],
    ["Salary Days", a.salary_days],
    ["Daily Rate", a.daily_rate ? formatRupees(a.daily_rate) : null],
    ["NRM (hours / day)", a.nrm_hours],
    ["Missing Hours", Number(a.missing_hours) > 0 ? `${a.missing_hours} h` : null],
    ["Missing-hours Deduction", !isZero(a.missing_hours_deduction) ? formatRupees(a.missing_hours_deduction) : null],
    ["Extra Days", Number(a.extra_days) > 0 ? a.extra_days : null],
    ["Approved OT Hours", Number(a.approved_ot_hours) > 0 ? a.approved_ot_hours : null],
    ["OT Rate", Number(a.approved_ot_hours) > 0 && a.ot_hourly_rate ? `${formatRupees(a.ot_hourly_rate)} / hour` : null],
    ["OT Amount", Number(a.approved_ot_hours) > 0 ? formatRupees(a.ot_amount) : null],
  ]);
}

function statutoryFacts(snapshot) {
  const s = (snapshot && snapshot.statutory) || {};
  return facts([
    ["UAN", s.uan],
    ["PF Number", s.pf_number],
    ["PF Wage", s.pf_wage ? formatRupees(s.pf_wage) : null],
    ["ESI Number", s.esi_number],
    ["ESI Wage", s.esi_wage ? formatRupees(s.esi_wage) : null],
  ]);
}

function finalFacts(snapshot) {
  const f = (snapshot && snapshot.final) || {};
  return facts([
    ["Net Pay before rounding", formatRupees(f.net_pay_before_rounding)],
    ["Net Pay Rounding", formatRupees(f.net_pay_rounding)],
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
  finalFacts,
  payslipListLabel,
};
