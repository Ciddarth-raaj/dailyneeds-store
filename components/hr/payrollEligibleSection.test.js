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

test("Yes, for a non-administrator: the value, the exact help text, and no control", skip, () => {
  const html = render("components/hr/profile/PayrollEligibleSection.jsx", { value: true, isAdmin: false, onChange: () => {} });
  assert.match(html, /Payroll Eligible/);
  assert.match(html, />Yes</);
  assert.match(html, /No excludes this employee from future payroll months\. Attendance remains active\./);
  assert.match(html, /Only an administrator can change this/);
  assert.ok(!/aria-pressed/.test(html), "no Yes / No control");
});

test("an administrator gets the Yes / No control with the current value pressed", skip, () => {
  const yes = render("components/hr/profile/PayrollEligibleSection.jsx", { value: true, isAdmin: true, onChange: () => {} });
  assert.match(yes, /aria-pressed="true"[^>]*>Yes</);
  assert.match(yes, /aria-pressed="false"[^>]*>No</);
  const no = render("components/hr/profile/PayrollEligibleSection.jsx", { value: false, isAdmin: true, onChange: () => {} });
  assert.match(no, /aria-pressed="false"[^>]*>Yes</);
  assert.match(no, /aria-pressed="true"[^>]*>No</);
  assert.match(no, /No excludes this employee from future payroll months\. Attendance remains active\./);
  assert.ok(!/Only an administrator/.test(no));
});

test("the help text is exactly the approved sentence", () => {
  assert.match(section, /PAYROLL_ELIGIBLE_HELP = "No excludes this employee from future payroll months\. Attendance remains active\.";/);
});

test("Yes -> No re-reads the server and warns, with confirm / cancel, when a month is already initialized", () => {
  assert.match(section, /if \(!next\) \{[\s\S]*const fresh = await refresh\(\);[\s\S]*fresh\.initialized_months[\s\S]*setConfirmMonths\(months\);\s+return;/);
  assert.match(section, /Those\s+months are not affected/);
  assert.match(section, />\s*Set to No\s*</);
  assert.match(section, />\s*Cancel\s*</);
  assert.match(profile, /loadDetails=\{loadPayrollEligible\}/);
  assert.match(profile, /const loadPayrollEligible = useCallback\(\(\) => \(id \? HrHelper\.getPayrollEligible\(id\) : Promise\.resolve\(null\)\), \[id\]\);/);
});

test("No -> Yes saves straight away, with no warning", () => {
  const choose = section.slice(section.indexOf("const choose"), section.indexOf("const history"));
  assert.match(choose, /if \(!next\)/, "only the change to No can stop at a warning");
  assert.match(choose, /await save\(next\);/);
});

test("the server's audit history is shown on the card", () => {
  assert.match(section, /Change history/);
  assert.match(section, /details\.history/);
  assert.match(section, /yesNo\(h\.old_value\)\} → \{yesNo\(h\.new_value\)\}/);
});

test("the card states the administrator rule and that the UI is not the control", () => {
  assert.match(section, /ADMINISTRATORS ONLY, AND THE UI IS NOT THE CONTROL/);
});
