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

/**
 * THE EDIT CONTROL IS GATED ON THE EDIT PERMISSION, NOT ON THE SECTION
 * LOADING.
 *
 * This became load-bearing when the Aadhaar STATUS read moved off
 * `view_employee_lifecycle` onto its own `view_employee_aadhaar`: a store
 * manager can now SEE the section who previously could not, so "the section
 * rendered" must not be mistaken for "you may change it".
 *
 * The page passes `canEdit` - `employee_edit`, which is exactly the key the
 * backend's attach route demands - and the card additionally requires the
 * SERVER's `can_verify_now`. Backend remains authoritative either way: a
 * button rendered in error still meets a 403.
 */
test("the Verify action is gated on employee_edit, not on the section loading", () => {
  assert.match(page, /<AadhaarSection\s+aadhaarOutcome=\{aadhaarOutcome\}\s+canVerify=\{canEdit\}/);
  // `canEdit` is the employee_edit decision, and nothing looser.
  assert.match(page, /const canEdit = canEditEmployee\(actor\)/);
  const profileUtil = read("util/hrProfile.js");
  const rule = profileUtil.slice(profileUtil.indexOf("function canEditEmployee"));
  assert.match(rule.slice(0, 200), /has\(permissions, "employee_edit"\)/);

  // And the card will not offer it on the strength of having rendered.
  assert.match(aadhaarCard, /canVerify && view\.canOfferVerify/);
  assert.ok(
    !/view\.showIdentity \? \(?\s*<Button/.test(aadhaarCard),
    "the button must not hang off the section having loaded"
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
