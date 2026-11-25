/**
 * M3 — the Payroll section's display rules.
 *
 *   node --test util/salaryView.test.js
 *
 * These are the decisions that would otherwise be buried in JSX: what a figure
 * reads as, and - the part that matters - what an UNRESOLVED figure reads as.
 * The whole point of M2 reporting a named reason instead of a number is lost
 * if the screen prints 0 for it, and that is exactly the failure a renderer
 * test would not catch and this one does.
 */
const test = require("node:test");
const assert = require("node:assert");

const {
  formatMoney,
  formatEffectiveFrom,
  unresolvedReason,
  moneyCell,
  presentCurrentSalary,
  UNRESOLVED_TEXT,
} = require("./salaryView");

/** ICU renders the currency space differently across builds; the digits do not. */
const digits = (s) => String(s).replace(/[^0-9.,]/g, "");

/* ======================================================= money formatting = */

test("money is Indian currency with Indian grouping", () => {
  assert.ok(formatMoney(45000).includes("₹"), "the rupee sign is shown");
  assert.strictEqual(digits(formatMoney(45000)), "45,000.00");

  // Lakh grouping, not thousands - "45,00,000" and not "4,500,000". This is
  // the whole reason the locale is pinned to en-IN.
  assert.strictEqual(digits(formatMoney(4500000)), "45,00,000.00");
  assert.strictEqual(digits(formatMoney(1234567.89)), "12,34,567.89");
});

test("paise are preserved, never rounded away", () => {
  assert.strictEqual(digits(formatMoney(1800.5)), "1,800.50");
  assert.strictEqual(digits(formatMoney(21.6)), "21.60");
  // DECIMAL columns arrive from the driver as strings; they format the same.
  assert.strictEqual(digits(formatMoney("1800.50")), "1,800.50");
  assert.strictEqual(digits(formatMoney("45000.00")), "45,000.00");
});

test("a real zero formats as zero; nothing at all formats as nothing", () => {
  // A genuine 0 from the backend (NOT applicable, computed as zero) is a
  // number and reads as one.
  assert.strictEqual(digits(formatMoney(0)), "0.00");
  // Absence is NOT zero, and must not be turned into one here - `moneyCell`
  // is what decides it reads as Pending.
  for (const nothing of [null, undefined, "", "not-a-number"]) {
    assert.strictEqual(formatMoney(nothing), null);
  }
});

test("the effective date is shown as a date, and the string is never parsed into a Date", () => {
  assert.strictEqual(formatEffectiveFrom("2026-04-01"), "01 Apr 2026");
  assert.strictEqual(formatEffectiveFrom("2026-12-31"), "31 Dec 2026");
  assert.strictEqual(formatEffectiveFrom(null), null);
  // A datetime from a driver that widened the column still reads as its date.
  assert.strictEqual(formatEffectiveFrom("2026-04-01T00:00:00.000Z"), "01 Apr 2026");
  // Anything unrecognised is passed through rather than guessed at.
  assert.strictEqual(formatEffectiveFrom("soon"), "soon");
});

/* ==================================================== unresolved reasons == */

test("every reason code the engine can emit has user-friendly text", () => {
  // Pinned against the engine's own constants where the backend is checked
  // out beside this repo, so a new code cannot ship without copy for it.
  for (const code of [
    "PF_APPLICABILITY_NOT_RECORDED",
    "EPS_MEMBERSHIP_NOT_RECORDED",
    "EPS_DOB_NOT_RECORDED",
    "ESI_APPLICABILITY_NOT_RECORDED",
    "ESI_WAGE_CONTEXT_UNAVAILABLE",
  ]) {
    assert.ok(UNRESOLVED_TEXT[code], `${code} needs text HR can act on`);
    assert.ok(!/_/.test(UNRESOLVED_TEXT[code]), "and it must not be the raw code");
  }
});

test("a reason is selected by component, and an unknown code still reads as English", () => {
  const notes = [
    { code: "PF_APPLICABILITY_NOT_RECORDED", component: "pf" },
    { code: "ESI_WAGE_CONTEXT_UNAVAILABLE", component: "esi" },
  ];
  assert.strictEqual(unresolvedReason(notes, ["pf"]), UNRESOLVED_TEXT.PF_APPLICABILITY_NOT_RECORDED);
  assert.strictEqual(unresolvedReason(notes, ["esi"]), UNRESOLVED_TEXT.ESI_WAGE_CONTEXT_UNAVAILABLE);

  // No component filter means every reason - which is what the CTC needs.
  const both = unresolvedReason(notes, []);
  assert.ok(both.includes(UNRESOLVED_TEXT.PF_APPLICABILITY_NOT_RECORDED));
  assert.ok(both.includes(UNRESOLVED_TEXT.ESI_WAGE_CONTEXT_UNAVAILABLE));

  // A code added to the engine before copy is written for it still says
  // something, rather than showing a constant to a store manager.
  assert.strictEqual(
    unresolvedReason([{ code: "SOME_NEW_THING", component: "pf" }], ["pf"]),
    "Some new thing."
  );

  assert.strictEqual(unresolvedReason([], ["pf"]), null);
  assert.strictEqual(unresolvedReason(null, ["pf"]), null);
});

/* ============================================================== the cells = */

test("PENDING IS NEVER ZERO AND NEVER BLANK", () => {
  const notes = [{ code: "PF_APPLICABILITY_NOT_RECORDED", component: "pf" }];
  const cell = moneyCell(null, { status: "PENDING", notes, components: ["pf"] });
  assert.strictEqual(cell.kind, "pending");
  assert.strictEqual(cell.text, "Pending");
  assert.strictEqual(cell.reason, UNRESOLVED_TEXT.PF_APPLICABILITY_NOT_RECORDED);
  assert.ok(!/0/.test(cell.text), "a contribution nobody worked out is not a contribution of zero");
});

test("NOT APPLICABLE AND PENDING ARE DIFFERENT ANSWERS", () => {
  // Out of the scheme: a real, settled answer with nothing outstanding.
  const na = moneyCell(0, { status: "NOT_APPLICABLE", notes: [], components: ["esi"] });
  assert.strictEqual(na.kind, "not_applicable");
  assert.strictEqual(na.text, "Not applicable");
  assert.strictEqual(na.reason, null);

  // In the scheme, resolved: money.
  const applied = moneyCell(1800, { status: "APPLIED", notes: [], components: ["pf"] });
  assert.strictEqual(applied.kind, "amount");
  assert.strictEqual(digits(applied.text), "1,800.00");
});

test("an APPLIED section with one null figure is pending for THAT figure only", () => {
  // The exact shape M2 produces when PF applies but the EPS split cannot be
  // decided: status APPLIED, employer_eps and employer_epf null, one note.
  const notes = [{ code: "EPS_MEMBERSHIP_NOT_RECORDED", component: "employer_eps" }];
  const eps = moneyCell(null, { status: "APPLIED", notes, components: ["pf", "employer_eps"] });
  assert.strictEqual(eps.kind, "pending");
  assert.strictEqual(eps.reason, UNRESOLVED_TEXT.EPS_MEMBERSHIP_NOT_RECORDED);

  // While the figures on the same record that WERE resolved still show.
  const edli = moneyCell(75, { status: "APPLIED", notes, components: ["pf"] });
  assert.strictEqual(edli.kind, "amount");
});

/* ======================================================= the whole record = */

/** A fully resolved record, shaped exactly as the resolver returns one. */
const RESOLVED = {
  salary_id: 11,
  employee_id: 42,
  monthly_gross: "45000.00",
  daily_salary: "1730.77",
  basic: "22500.00",
  conveyance: "2500.00",
  hra: "10000.00",
  special_allowance: "10000.00",
  pf_status: "APPLIED",
  employee_pf: "1800.00",
  employer_pf_total: "1800.00",
  employer_epf: "550.00",
  employer_eps: "1250.00",
  edli: "75.00",
  pf_admin_charge: "75.00",
  esi_status: "NOT_APPLICABLE",
  employee_esi: "0.00",
  employer_esi: "0.00",
  monthly_ctc: "46950.00",
  ctc_status: "APPLIED",
  unresolved_notes: [],
  effective_from: "2026-04-01",
  status: "APPROVED",
};

test("no record at all is null - the caller shows the empty state, not zeroes", () => {
  assert.strictEqual(presentCurrentSalary(null), null);
  assert.strictEqual(presentCurrentSalary(undefined), null);
});

test("THE SUMMARY IS GROSS, DAILY SALARY AND THE EFFECTIVE DATE", () => {
  const view = presentCurrentSalary(RESOLVED);
  assert.strictEqual(digits(view.summary.monthly_gross.text), "45,000.00");
  // Gross / 26, taken from the backend rather than divided here.
  assert.strictEqual(digits(view.summary.daily_salary.text), "1,730.77");
  assert.strictEqual(view.summary.effective_from, "01 Apr 2026");
  // The card represents the current APPROVED salary, and says so.
  assert.strictEqual(view.summary.status, "APPROVED");
});

test("the structure is the four components, in the approved order", () => {
  const view = presentCurrentSalary(RESOLVED);
  assert.deepStrictEqual(
    view.structure.map((r) => r.label),
    ["Basic", "Conveyance", "HRA", "Special Allowance"]
  );
  assert.deepStrictEqual(
    view.structure.map((r) => digits(r.cell.text)),
    ["22,500.00", "2,500.00", "10,000.00", "10,000.00"]
  );
  // And they come from the response, not from arithmetic done here: the sum
  // is the gross because the BACKEND made it so.
  const sum = ["basic", "conveyance", "hra", "special_allowance"]
    .map((k) => Number(RESOLVED[k]))
    .reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, Number(RESOLVED.monthly_gross));
});

test("deductions and employer contributions are the approved lists, in order", () => {
  const view = presentCurrentSalary(RESOLVED);
  assert.deepStrictEqual(
    view.employeeDeductions.map((r) => r.label),
    ["Employee PF", "Employee ESI"]
  );
  assert.deepStrictEqual(
    view.employerContributions.map((r) => r.label),
    ["Employer EPF", "Employer EPS", "EDLI", "PF Admin Charge", "Employer ESI"]
  );
  assert.strictEqual(digits(view.employeeDeductions[0].cell.text), "1,800.00");
  // ESI is switched off for this employee: a settled answer, not a chase.
  assert.strictEqual(view.employeeDeductions[1].cell.kind, "not_applicable");
  assert.strictEqual(digits(view.employerContributions[1].cell.text), "1,250.00");
  assert.strictEqual(view.employerContributions[4].cell.kind, "not_applicable");
});

test("the CTC is shown as money when the backend resolved it", () => {
  const view = presentCurrentSalary(RESOLVED);
  assert.strictEqual(view.ctc.kind, "amount");
  assert.strictEqual(digits(view.ctc.text), "46,950.00");
});

test("AN UNRESOLVED RECORD READS Pending WITH A REASON, EVERYWHERE IT IS UNRESOLVED", () => {
  // PF applicability never recorded and no monthly payroll to give ESI a
  // wage: the common state for an employee the C3 migration touched.
  const view = presentCurrentSalary({
    ...RESOLVED,
    pf_status: "PENDING",
    employee_pf: null,
    employer_epf: null,
    employer_eps: null,
    edli: null,
    pf_admin_charge: null,
    esi_status: "PENDING",
    employee_esi: null,
    employer_esi: null,
    monthly_ctc: null,
    ctc_status: "PENDING",
    unresolved_notes: [
      { code: "PF_APPLICABILITY_NOT_RECORDED", component: "pf" },
      { code: "ESI_WAGE_CONTEXT_UNAVAILABLE", component: "esi" },
    ],
  });

  for (const row of [...view.employeeDeductions, ...view.employerContributions]) {
    assert.strictEqual(row.cell.kind, "pending", `${row.label} must read Pending`);
    assert.strictEqual(row.cell.text, "Pending");
    assert.ok(row.cell.reason, `${row.label} must say why`);
    assert.ok(!/^₹/.test(row.cell.text), `${row.label} must not be shown as an amount`);
  }

  // The PF rows cite the PF reason and the ESI rows the ESI one.
  assert.strictEqual(
    view.employeeDeductions[0].cell.reason,
    UNRESOLVED_TEXT.PF_APPLICABILITY_NOT_RECORDED
  );
  assert.strictEqual(
    view.employeeDeductions[1].cell.reason,
    UNRESOLVED_TEXT.ESI_WAGE_CONTEXT_UNAVAILABLE
  );

  // A CTC with an unresolved employer cost in it is not a CTC. It says so,
  // and it names everything it is waiting on.
  assert.strictEqual(view.ctc.kind, "pending");
  assert.strictEqual(view.ctc.text, "Pending");
  assert.ok(view.ctc.reason.includes(UNRESOLVED_TEXT.PF_APPLICABILITY_NOT_RECORDED));
  assert.ok(view.ctc.reason.includes(UNRESOLVED_TEXT.ESI_WAGE_CONTEXT_UNAVAILABLE));

  // The gross and the breakup are NOT statutory and are unaffected - they are
  // still real numbers on a record whose contributions are outstanding.
  assert.strictEqual(digits(view.summary.monthly_gross.text), "45,000.00");
  assert.strictEqual(view.structure[0].cell.kind, "amount");
});

test("a malformed unresolved_notes never turns a Pending into a zero", () => {
  // Some driver versions hand JSON columns back as strings. The usecase parses
  // them, but a shape this screen did not expect must degrade to "Pending with
  // no reason", never to a number.
  const view = presentCurrentSalary({
    ...RESOLVED,
    pf_status: "PENDING",
    employee_pf: null,
    unresolved_notes: "not-an-array",
  });
  assert.strictEqual(view.employeeDeductions[0].cell.kind, "pending");
  assert.strictEqual(view.employeeDeductions[0].cell.reason, null);
});
