/**
 * THE PROFILE'S WIRING, asserted against the source.
 *
 *   node --test components/hr/employeeProfileWiring.test.js
 *
 * `util/employeeMasterStatus.test.js` proves the RULES are right. This proves
 * the screen is actually plugged into them - which is where both reported
 * defects lived: the rules were fine, the card was reading the wrong field
 * and the page was throwing the reason away.
 *
 * Source-text assertions, in the style of `hrScreens.test.js`, because these
 * are Chakra/Next components with no React test runner in this repository.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(repoRoot, p), "utf8");

/**
 * Source with comments removed - the same helper `hrScreens.test.js` uses.
 *
 * Load-bearing here: the fixed files EXPLAIN the old pattern in their
 * comments, quoting it verbatim, so an "it is gone" assertion run against raw
 * text would match the explanation and fail. These assertions are about what
 * the code DOES.
 */
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = read("pages/hr/employees/[id].jsx");
const employmentCard = read("components/hr/profile/EmploymentSection.jsx");
const aadhaarCard = read("components/hr/profile/AadhaarSection.jsx");
const list = read("pages/hr/employees/index.jsx");

/* ------------------------------------------------- employment status ---- */

test("the Employment card resolves status through the shared rule", () => {
  assert.match(employmentCard, /currentEmploymentStatus\(employee, lifecycle\)/);
  assert.match(employmentCard, /<EmploymentBadge status=\{employmentStatus\}/);
});

test("THE OLD FALLBACK IS GONE", () => {
  assert.ok(
    !/lifecycle\.status\s*\?\?\s*employee\.status/.test(codeOf(employmentCard)),
    "reading the lifecycle first is what made status depend on view_employee_lifecycle"
  );
});

test("the list and the profile read the same field of the same record", () => {
  // The list has always been right; this is what the profile now agrees with.
  assert.match(list, /<EmploymentBadge status=\{e\.status\}/);
  assert.match(employmentCard, /currentEmploymentStatus/);
});

test("the Employment card resolves PLACEMENT through the shared rule too", () => {
  assert.match(employmentCard, /currentPlacement\(employee, lifecycle\)/);
  for (const field of ["placement.outlet", "placement.department_name", "placement.designation_name"]) {
    assert.ok(employmentCard.includes(field), `${field} must come from the shared rule`);
  }
  assert.match(employmentCard, /const joiningDate = placement\.date_of_joining/);
});

test("THE LIFECYCLE-FIRST PLACEMENT READS ARE GONE", () => {
  // Fixing the status badge and leaving these was fixing one column and
  // leaving the same ambiguity in the others: HR saw the outlet NICKNAME and
  // a store manager the full NAME, and a rejoined employee's joining date
  // moved between the current period's start and their master column.
  const code = codeOf(employmentCard);
  for (const inverted of [
    /current\.outlet_nickname \|\| employee\.outlet_name/,
    /current\.department_name \|\| employee\.department_name/,
    /current\.designation_name \|\| employee\.designation_name/,
    /current\.date_of_joining \|\| employee\.date_of_joining/,
  ]) {
    assert.ok(!inverted.test(code), `${inverted} reads the lifecycle before the master`);
  }
  assert.ok(
    !/const current = lifecycle\.current/.test(code),
    "the card no longer keeps a lifecycle-first shorthand to fall back into"
  );
});

/* --------------------------------------------------------------- bank --- */

test("the Payment card can tell a refusal from an outage", () => {
  const payment = read("components/hr/profile/PaymentDetailsSection.jsx");
  assert.match(payment, /bankOutcome/);
  assert.match(payment, /bankOutcome && bankOutcome\.denied/);
  assert.match(payment, /could not be loaded/);
  assert.match(page, /bankOutcome=\{bankOutcome\}/);
  assert.match(page, /setBankOutcome\(bk\)/);
});

test("the bank card's identity comes from the employee master", () => {
  // Both props came from the lifecycle read, which a store manager is
  // refused - so the card was handed `undefined` for the employee it acts on.
  const payment = codeOf(read("components/hr/profile/PaymentDetailsSection.jsx"));
  assert.match(payment, /employeeId=\{employee\.employee_id \?\? lifecycle\.employee_id\}/);
  assert.match(payment, /employeeName=\{employee\.employee_name \?\? lifecycle\.employee_name\}/);
});

/* ------------------------------------------------------------ Aadhaar --- */

test("the Aadhaar card is handed the OUTCOME, not a bare payload", () => {
  assert.match(page, /<AadhaarSection\s+aadhaarOutcome=\{aadhaarOutcome\}/);
  assert.match(aadhaarCard, /function AadhaarSection\(\{ aadhaarOutcome/);
  assert.match(aadhaarCard, /aadhaarSectionView\(aadhaarOutcome\)/);
});

test("THE HARDCODED PENDING FALLBACK IS GONE", () => {
  const card = codeOf(aadhaarCard);
  assert.ok(
    !/aadhaar \? aadhaar\.aadhaar_status : "PENDING"/.test(card),
    "a failed read must never be rendered as PENDING"
  );
  assert.ok(
    !/No Aadhaar on record/.test(card),
    "the card no longer hardcodes that sentence; only a server PENDING produces it"
  );
});

test("the card renders only what the view rule allows", () => {
  // Identity fields sit behind `view.showIdentity`, which is false for every
  // non-OK outcome, so a refusal cannot reach them.
  assert.match(aadhaarCard, /view\.showIdentity \?/);
  assert.match(aadhaarCard, /\{view\.message\}/);
  assert.match(aadhaarCard, /canVerify && view\.canOfferVerify/);
});

/* --------------------------------------------------------- page load ---- */

test("every section read is classified rather than swallowed", () => {
  for (const call of [
    "loadSection(HrHelper.getLifecycle(id))",
    "loadSection(EmployeeHelper.getEmployeeByID(id))",
    "loadSection(HrHelper.getAadhaarStatus(id))",
    "loadSection(HrHelper.getBankStatus(id))",
  ]) {
    assert.ok(page.includes(call), `${call} must go through loadSection`);
  }
});

test("THE `catch(() => null)` PATTERN IS GONE FROM THE PROFILE LOAD", () => {
  const load = codeOf(
    page.slice(page.indexOf("const load = useCallback"), page.indexOf("useEffect(() => {"))
  );
  assert.ok(
    !/catch\(\(\)\s*=>\s*null\)/.test(load),
    "collapsing every failure into null is what let a refusal become a business state"
  );
  assert.ok(
    !/const usable = /.test(load),
    "`usable` treated any coded response as absent, losing the reason with it"
  );
});

test("a refused section does not blank the page, and does not read as an error", () => {
  // The page-level error is set ONLY when NEITHER read produced anything. It
  // used to fire whenever the lifecycle read failed, which is the ordinary
  // case for a store manager.
  const load = codeOf(
    page.slice(page.indexOf("const load = useCallback"), page.indexOf("useEffect(() => {"))
  );
  assert.match(load, /if \(!lc\.ok && !emp\.ok\)/);
  assert.ok(!/if \(!usable\(lc\)\)/.test(load));
});

test("only the successful payloads reach state; the Aadhaar outcome is kept whole", () => {
  assert.match(page, /setLifecycle\(dataOf\(lc\)\)/);
  assert.match(page, /setEmployee\(unwrapEmployee\(dataOf\(emp\)\)\)/);
  assert.match(page, /setBank\(dataOf\(bk\)\)/);
  assert.match(page, /setAadhaarOutcome\(aa\)/);
});

/* ------------------------------------------------ nothing was widened --- */

test("NO PERMISSION IS GRANTED OR BYPASSED BY THIS FIX", () => {
  // The screen must not have started asking for, or assuming, any new right.
  // `view_employee_lifecycle` is still read for the timeline and nothing else.
  assert.match(page, /usePermissions\(\["view_employee_lifecycle"\]\)/);
  for (const forbidden of [
    "employee_scope_all_branches",
    "view_aadhaar_full",
    "view_employee_sensitive\"]);",
  ]) {
    assert.ok(
      !page.includes(`usePermissions(["${forbidden}`),
      `the profile must not start claiming ${forbidden}`
    );
  }
});

test("the Aadhaar card still never renders a full number or ciphertext", () => {
  for (const forbidden of ["aadhaar_number", "aadhaar_ciphertext", "aadhaar_fingerprint"]) {
    assert.ok(!aadhaarCard.includes(forbidden), `the card must not render ${forbidden}`);
  }
});
