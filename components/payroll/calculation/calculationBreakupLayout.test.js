/**
 * Payrun Calculation & Review - the employee breakup modal's LAYOUT, mounted.
 *
 *   node --test components/payroll/calculation/calculationBreakupLayout.test.js
 *
 * THE BUG THIS GUARDS. Each breakup line was a two-item row: a label allowed to
 * shrink to nothing (`min-width: 0`) beside a figure that could neither wrap
 * (`white-space: nowrap`) nor shrink. The PF ceiling rule reference -
 * "EPFO-CEILING-15000-2014-09-01+EPFO-CEILING-25000-2026-09-17", sixty
 * characters and no space - therefore ran out of the modal on a phone, and on a
 * desktop took the label's width until "PF ceiling rule" was printed one letter
 * per line (measured in Chromium: 3px wide, 13 lines). The PF scenario was the
 * raw code, "EXCLUDED>EXCLUDED|CEILING".
 *
 * WHAT IS PROVED HERE, on the real component in jsdom with the real Chakra
 * modal and the CSS emotion actually inserted:
 *
 *   the reported case (Kiruthiga S, 1355, September 2026) renders every salary,
 *     OT, adjustment, PF, ESI and final figure exactly as the server sent it;
 *   the PF scenario is words, once, with its basis and case as their own lines;
 *   a rule reference of any length is a wrappable block of its own;
 *   the layout rules that decide the narrow and wide cases: the row wraps, a
 *     label keeps a real minimum width and breaks only between words, a money
 *     figure never breaks.
 *
 * jsdom has no layout engine, so the WIDTHS themselves (360/390/768/1366 px:
 * no horizontal overflow, no collapsed label) were measured in Chromium against
 * this same component; the rules asserted here are the ones that produce them.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { mount, unavailable } = require("../../../test_support/renderJsx");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};
const MODAL = "components/payroll/calculation/CalculationBreakup.jsx";

/* ------------------------------------------------------------- fixtures */

const RULES = "EPFO-CEILING-15000-2014-09-01+EPFO-CEILING-25000-2026-09-17";

/** Kiruthiga S / 1355, September 2026, as the API returns the breakup. */
const employee1355 = (statutory = {}) => ({
  employee_id: 1355,
  employee_name: "Kiruthiga S",
  status: "READY_FOR_APPROVAL",
  status_label: "Ready for Approval",
  recalculation_reasons: [],
  attendance_pending: false,
  breakup: {
    salary: {
      monthly_gross: 11500, daily_rate: 442.31, salary_days: 26, salary_earnings: 11500,
      missing_hours: 0, missing_hours_deduction: 0, extra_days: 1, extra_day_amount: 442.31,
    },
    ot: {
      approved_ot_hours: 2, effective_nrm_minutes: 480, effective_nrm_source: "SHIFT",
      ot_hourly_rate: 55.29, ot_amount: 110.58,
      ot_groups: [{ nrm_minutes: 480, nrm_source: "SHIFT", approved_ot_hours: 2, ot_hourly_rate: 55.29, ot_amount: 110.58 }],
    },
    adjustments: { incentive: 774.04, bonus: 0, arrears: 0, advance_recovery: 0, shortage_recovery: 0, balance_advance: 0 },
    statutory: {
      pf_wage: 0, employee_pf: 0, employer_epf: 0, employer_eps: 0, eps_wage: 0, edli: 0, edli_wage: 0,
      pf_segments: [
        { from: "2026-09-01", to: "2026-09-16", calendar_days: 16, state: "EXCLUDED", employee_pf: 0, employer_eps: 0, monthly_wage_ceiling: 15000, applied_wage_ceiling: 8000, pf_wage: 0, eps_wage: 0 },
        { from: "2026-09-17", to: "2026-09-30", calendar_days: 14, state: "EXCLUDED", employee_pf: 0, employer_eps: 0, monthly_wage_ceiling: 25000, applied_wage_ceiling: 11666.67, pf_wage: 0, eps_wage: 0 },
      ],
      pf_ceiling_version: RULES,
      pf_scenario: "EXCLUDED>EXCLUDED|CEILING",
      pf_exact: { total_remittance: 0, employee_pf: 0, employer_eps: 0, employer_epf: 0, edli: 0, pf_admin_charge: 0 },
      esi_wage: 0, employee_esi: 0, employer_esi: 0,
      ...statutory,
    },
    final: { total_earnings: 12827, total_employee_deductions: 0, net_pay_rounding: 0, net_pay: 12827, pay_type: "BANK" },
    unresolved: [],
    errors: [],
  },
});

/* --------------------------------------------------------------- harness */

/*
 * Chakra's open modal schedules its focus with requestAnimationFrame, which
 * jsdom does not provide; the DOM exists only once something is mounted, so a
 * closed modal is mounted first and the frame supplied as a timer.
 */
if (!unavailable) {
  test.before(() => {
    mount(MODAL, { isOpen: false, onClose: () => {}, employee: null }).unmount();
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
  });
}

let mounted = null;
test.afterEach(() => {
  if (mounted) mounted.unmount();
  mounted = null;
});

function open(employee) {
  mounted = mount(MODAL, { isOpen: true, onClose: () => {}, employee, loading: false, error: null });
  const dialog = document.body.querySelector("[role=dialog]");
  assert.ok(dialog, "the modal opened");
  return dialog;
}

const clean = (el) => (el ? el.textContent.replace(/\s+/g, " ").trim() : null);

/** Every breakup line as [label, value] in document order. */
function pairs(dialog) {
  return [...dialog.querySelectorAll("[data-breakup-line]")].map((line) => [
    clean(line.querySelector("[data-breakup-label]")),
    clean(line.querySelector("[data-breakup-value]")),
  ]);
}

const lineOf = (dialog, label) =>
  [...dialog.querySelectorAll("[data-breakup-line]")].find(
    (line) => clean(line.querySelector("[data-breakup-label]")) === label
  );

/**
 * THE CSS AN ELEMENT ACTUALLY GETS: every declaration of every rule in the
 * document's style sheets whose selector matches it, later rules winning -
 * which is how emotion's generated classes cascade. Read from the sheets
 * rather than from props, so a style that never reached the element fails.
 */
function cssOf(el) {
  const out = {};
  for (const sheet of [...document.styleSheets]) {
    let rules;
    try {
      rules = [...sheet.cssRules];
    } catch (err) {
      continue;
    }
    for (const rule of rules) {
      if (!rule.selectorText || !rule.style) continue;
      let matches = false;
      try {
        matches = el.matches(rule.selectorText);
      } catch (err) {
        matches = false;
      }
      if (!matches) continue;
      for (let i = 0; i < rule.style.length; i += 1) {
        const prop = rule.style[i];
        out[prop] = rule.style.getPropertyValue(prop).trim();
      }
    }
  }
  return out;
}

/* ========================================================== the 1355 case */

test("1. PF-excluded employee (Kiruthiga S, 1355): every figure renders exactly as sent", skip, () => {
  const dialog = open(employee1355());
  const got = Object.fromEntries(pairs(dialog).filter(([, v]) => v !== null));
  const expected = {
    "Monthly Gross": "₹11,500.00",
    "Daily Rate": "₹442.31",
    "Salary Days": "26",
    "Salary Earnings": "₹11,500.00",
    "Missing Hours": "0",
    "Missing Hours Deduction": "₹0.00",
    "Extra Days": "1",
    "Extra Day Amount": "₹442.31",
    "Approved OT Hours": "2",
    "Effective NRM": "480 min",
    "OT Hourly Rate": "₹55.29",
    "OT Amount": "₹110.58",
    Incentive: "₹774.04",
    Bonus: "₹0.00",
    Arrears: "₹0.00",
    "Advance Recovery": "₹0.00",
    "Shortage Recovery": "₹0.00",
    "Balance Advance (Informational)": "₹0.00",
    "PF Wage": "₹0.00",
    "Employee PF": "₹0.00",
    "Employer EPF": "₹0.00",
    "Employer EPS": "₹0.00",
    "EPS Wage": "₹0.00",
    "EDLI (Employer)": "₹0.00",
    "PF 2026-09-01 to 2026-09-16": "Excluded",
    "PF 2026-09-17 to 2026-09-30": "Excluded",
    "PF Scenario": "Excluded",
    "PF Contribution Basis": "Wage ceiling",
    "PF Exact (before rounding)": "₹0.00",
    "ESI Wage": "₹0.00",
    "Employee ESI": "₹0.00",
    "Employer ESI": "₹0.00",
    "Total Earnings": "₹12,827.00",
    "Total Employee Deductions": "₹0.00",
    "Net Pay Rounding": "₹0.00",
    "Net Pay": "₹12,827.00",
    "Pay Type": "BANK",
  };
  assert.deepEqual(got, expected);
  // The per-period figures moved into the note; the amounts are the server's.
  assert.match(
    clean(lineOf(dialog, "PF 2026-09-17 to 2026-09-30")),
    /EE ₹0\.00 · EPS ₹0\.00 · Ceiling ₹25,000\.00 \(applied ₹11,666\.67 for 14 days\) · PF wage ₹0\.00 · EPS wage ₹0\.00/
  );
});

/* ======================================================= the PF scenario */

test("6. PF Scenario is shown once, in words - not the concatenated code", skip, () => {
  const dialog = open(employee1355());
  const labels = pairs(dialog).map(([l]) => l);
  assert.equal(labels.filter((l) => /^PF Scenario$/i.test(l)).length, 1, "one PF Scenario line");
  assert.equal(clean(lineOf(dialog, "PF Scenario").querySelector("[data-breakup-value]")), "Excluded");
  const text = dialog.textContent;
  for (const raw of ["EXCLUDED>EXCLUDED", "EXCLUDED›EXCLUDED", "|CEILING", "Excluded, then Excluded"]) {
    assert.ok(!text.includes(raw), `the raw or repeated scenario is on screen: ${raw}`);
  }
});

test("6b. a split scenario names each period's state, its basis and its EPFO case on separate lines", skip, () => {
  const dialog = open(employee1355({ pf_scenario: "FAQ_B:EPF_ONLY>EPF_EPS|ACTUAL_WAGE" }));
  const got = Object.fromEntries(pairs(dialog));
  assert.equal(got["PF Scenario"], "EPF only, then EPF + EPS");
  assert.equal(got["PF Contribution Basis"], "Actual wage");
  assert.equal(got["PF Case"], "EPFO FAQ case B");
  assert.ok(!dialog.textContent.includes("FAQ_B:"), "the code itself is not printed");
});

/* ================================================= long rule identifiers */

test("2. a very long PF rule identifier is its own wrappable block under its label", skip, () => {
  const long = "EPFO-CEILING-REVISED-WITH-A-VERY-LONG-UNBROKEN-IDENTIFIER-0000000000000000000000";
  const dialog = open(employee1355({ pf_ceiling_version: `${RULES}+${long}` }));
  const line = lineOf(dialog, "PF ceiling rules");
  assert.ok(line, "the rules have their own labelled line");
  const refs = [...line.querySelectorAll("[data-breakup-reference]")];
  assert.deepEqual(
    refs.map((r) => r.textContent),
    ["EPFO-CEILING-15000-2014-09-01", "EPFO-CEILING-25000-2026-09-17", long],
    "one reference per line, each exactly as stored"
  );
  for (const ref of refs) {
    // A break opportunity after every separator - it wraps at EPFO- / CEILING- first.
    assert.equal(ref.querySelectorAll("wbr").length, ref.textContent.split("-").length);
    const css = cssOf(ref);
    assert.equal(css["overflow-wrap"], "anywhere", "and may break anywhere rather than overflow");
    assert.notEqual(css["white-space"], "nowrap");
  }
  // Nothing that holds the identifier is forbidden to wrap.
  for (const el of dialog.querySelectorAll("*")) {
    if (el.textContent.includes("EPFO-CEILING") && el.children.length === 0) {
      assert.notEqual(cssOf(el)["white-space"], "nowrap", "an identifier sits in a nowrap element");
    }
  }
});

test("2b. a single rule reference is labelled in the singular, and no rule means no line", skip, () => {
  let dialog = open(employee1355({ pf_ceiling_version: "EPFO-CEILING-15000-2014-09-01" }));
  assert.ok(lineOf(dialog, "PF ceiling rule"));
  mounted.unmount();
  dialog = open(employee1355({ pf_ceiling_version: null }));
  assert.ok(!dialog.textContent.includes("PF ceiling rule"));
});

/* ============================================ the layout at either width */

test("3. narrow / mobile width: a line wraps its figure BELOW the label instead of squeezing the label", skip, () => {
  const dialog = open(employee1355());
  const lines = [...dialog.querySelectorAll("[data-breakup-line]")].filter((l) => l.querySelector("[data-breakup-value]"));
  assert.ok(lines.length > 30);
  for (const line of lines) {
    const row = cssOf(line);
    assert.equal(row["flex-wrap"], "wrap", `${clean(line.querySelector("[data-breakup-label]"))}: the row wraps`);
    const label = cssOf(line.querySelector("[data-breakup-label]"));
    // Never narrower than 10rem - or the whole line, when the line is narrower.
    assert.equal(label["min-width"], "min(10rem, 100%)");
    assert.match(label.flex || label["flex-basis"] || "", /10rem/);
  }
});

test("4. desktop width: label left, figure right on the same line; a money figure never breaks", skip, () => {
  const dialog = open(employee1355());
  for (const label of ["Monthly Gross", "Daily Rate", "PF Wage", "ESI Wage", "Net Pay"]) {
    const value = cssOf(lineOf(dialog, label).querySelector("[data-breakup-value]"));
    assert.equal(value["white-space"], "nowrap", `${label}: the figure stays whole`);
    assert.equal(value["margin-left"], "auto", `${label}: and sits at the right`);
    assert.equal(value["text-align"], "right");
    assert.match(value.flex || "", /^0 0 auto$/, `${label}: and is neither grown nor shrunk`);
  }
  // Notes take the full width under the line rather than a narrow column.
  const note = lineOf(dialog, "Daily Rate").querySelector("[data-breakup-note]");
  assert.equal(cssOf(note)["flex-basis"], "100%");
});

test("5. long text never forces a label into character-by-character wrapping", skip, () => {
  const dialog = open(
    employee1355({
      pf_ceiling_version: `${RULES}+EPFO-CEILING-REVISED-WITH-A-VERY-LONG-UNBROKEN-IDENTIFIER-0000000000000000000000`,
    })
  );
  const labels = [...dialog.querySelectorAll("[data-breakup-label]")];
  assert.ok(labels.length >= 30, `the breakup's labels were found (${labels.length})`);
  // The reported case: "PF ceiling rule" printed one letter per line.
  const ceiling = labels.find((l) => /^PF ceiling rules?$/.test(clean(l)));
  assert.ok(ceiling, "the PF ceiling rule label is rendered");
  assert.notEqual(cssOf(ceiling)["min-width"], "0px");
  assert.ok(
    !ceiling.parentElement.querySelector("[data-breakup-value]"),
    "the rule reference is not a figure squeezed beside its label"
  );
  for (const label of labels) {
    const css = cssOf(label);
    const name = clean(label);
    // A label may not shrink to nothing, and may break only between words.
    assert.notEqual(css["min-width"], "0", `${name}: label allowed to shrink to zero`);
    assert.notEqual(css["min-width"], "0px", `${name}: label allowed to shrink to zero`);
    assert.notEqual(css["word-break"], "break-all", `${name}: label breaks between letters`);
    assert.notEqual(css["overflow-wrap"], "anywhere", `${name}: label breaks between letters`);
  }
  // A long VALUE (over 24 characters) wraps inside its own line instead of pushing the label.
  const longValue = [...dialog.querySelectorAll("[data-breakup-value]")].find((v) => clean(v).length > 24);
  if (longValue) {
    const css = cssOf(longValue);
    assert.equal(css["white-space"], "normal");
    assert.equal(css["overflow-wrap"], "anywhere");
  }
});

/* ===================================================== the display helper */

test("describePfScenario: words for each part, nothing decided, unknown codes verbatim", () => {
  const { describePfScenario, pfRuleReferences, identifierPieces } = require("../../../util/pfScenarioDisplay");
  assert.deepEqual(describePfScenario("EXCLUDED>EXCLUDED|CEILING"), {
    status: "Excluded",
    periods: ["Excluded", "Excluded"],
    basis: "Wage ceiling",
    faq: null,
    code: "EXCLUDED>EXCLUDED|CEILING",
  });
  assert.equal(describePfScenario("EPF_EPS|CEILING").status, "EPF + EPS");
  assert.equal(describePfScenario("FAQ_A:EXCLUDED>EPF_EPS|CEILING").status, "Excluded, then EPF + EPS");
  assert.equal(describePfScenario("FAQ_A:EXCLUDED>EPF_EPS|CEILING").faq, "EPFO FAQ case A");
  assert.equal(describePfScenario("SOMETHING_NEW|OTHER").status, "SOMETHING_NEW");
  assert.equal(describePfScenario("SOMETHING_NEW|OTHER").basis, "OTHER");
  assert.equal(describePfScenario(null), null);
  assert.equal(describePfScenario(""), null);
  assert.deepEqual(pfRuleReferences(RULES), ["EPFO-CEILING-15000-2014-09-01", "EPFO-CEILING-25000-2026-09-17"]);
  assert.deepEqual(pfRuleReferences(null), []);
  assert.deepEqual(identifierPieces("EPFO-CEILING-15000"), ["EPFO-", "CEILING-", "15000"]);
  assert.equal(identifierPieces("ABC_DEF-1").join(""), "ABC_DEF-1");
});
