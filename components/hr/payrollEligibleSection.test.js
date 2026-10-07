/**
 * Payroll Eligible (Salary Not Applicable) on the employee profile.
 *
 *   node --test components/hr/payrollEligibleSection.test.js
 *
 * The rule itself is the server's (the payroll population and the insert
 * guard, in the backend). What is defended here: the profile shows the value
 * to everybody, offers the switch to administrators only, calls the
 * dedicated admin-only endpoint, and says plainly that No is not a
 * resignation or an attendance switch.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { render, unavailable } = require("../../test_support/renderJsx");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const section = read("components/hr/profile/PayrollEligibleSection.jsx");
const profile = read("pages/hr/employees/[id].jsx");
const hrHelper = read("helper/hr.js");
const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};

test("the profile reads payroll_eligible, defaulting to Yes, and saves through the dedicated endpoint", () => {
  assert.match(profile, /<PayrollEligibleSection\s+value=\{employee \? employee\.payroll_eligible !== 0 : true\}/);
  assert.match(profile, /isAdmin=\{isAdmin\}\s+onChange=\{savePayrollEligible\}/);
  assert.match(profile, /HrHelper\.setPayrollEligible\(id, eligible\)/);
  assert.match(hrHelper, /API\.post\(`\/hr\/employee\/\$\{employeeId\}\/payroll-eligible`, \{\s+payroll_eligible: Boolean\(payrollEligible\),/);
  assert.match(hrHelper, /API\.get\(`\/hr\/employee\/\$\{employeeId\}\/payroll-eligible`\)/);
});

test("it is not written through the ordinary profile save", () => {
  const ordinary = profile.slice(profile.indexOf("const saveOrdinary"), profile.indexOf("const saveOrdinary") + 1500);
  assert.ok(!/payroll_eligible/.test(ordinary));
});

test("Yes: no switch for a non-administrator, and the plain payroll sentence", skip, () => {
  const html = render("components/hr/profile/PayrollEligibleSection.jsx", { value: true, isAdmin: false, onChange: () => {} });
  assert.match(html, /Payroll Eligible/);
  assert.match(html, />Yes</);
  assert.match(html, /Only an administrator can change this/);
  assert.ok(!/Set Payroll Eligible/.test(html));
});

test("No: says Salary Not Applicable, what it leaves out, and that attendance and status are unaffected", skip, () => {
  const html = render("components/hr/profile/PayrollEligibleSection.jsx", { value: false, isAdmin: true, onChange: () => {} });
  assert.match(html, /No — Salary Not Applicable/);
  assert.match(html, /left out of payroll entirely/);
  assert.match(html, /their attendance works as normal/);
  assert.match(html, /not a resignation or an inactive status/);
  assert.match(html, /Set Payroll Eligible to Yes/);
});

test("the card states the administrator rule and that the UI is not the control", () => {
  assert.match(section, /ADMINISTRATORS ONLY, AND THE UI IS NOT THE CONTROL/);
});
