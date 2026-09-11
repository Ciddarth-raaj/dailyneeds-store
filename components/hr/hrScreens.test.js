/**
 * Stage 0C / C3 — the HR screens are wired to the real contracts.
 *
 *   node --test components/hr/hrScreens.test.js
 *
 * There is no React test runner in this repo, so the screens are checked as
 * source. That is weaker than rendering them, but it catches the failures that
 * actually happen in this codebase: a screen calling an endpoint that does not
 * exist, a screen quietly rendering something it must not, and a screen
 * offering an action the backend will refuse.
 *
 * The endpoint list below is checked against the BACKEND ROUTER, not against a
 * list I typed - so if a path is renamed on the server, this fails rather than
 * the UI 404ing in production.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const helper = read("helper/hr.js");
const list = read("pages/hr/employees/index.jsx");
const add = read("pages/hr/employees/new.jsx");
const profile = read("pages/hr/employees/[id].jsx");
const bankCard = read("components/hr/BankCard.jsx");
const aadhaarModal = read("components/hr/AadhaarVerifyModal.jsx");
const lifecycleModals = read("components/hr/LifecycleActionModals.jsx");
const timeline = read("components/hr/LifecycleTimeline.jsx");

/* ============================================== the contracts are real == */
const BACKEND_ROUTER = path.join(ROOT, "..", "dailyneeds-store-backend", "routes", "employee_master.js");
const backendAvailable = fs.existsSync(BACKEND_ROUTER);

test("every /hr path the helper calls exists in the backend router", { skip: !backendAvailable }, () => {
  const router = fs.readFileSync(BACKEND_ROUTER, "utf8");

  // Parameters are generalised on BOTH sides rather than assumed to be an
  // employee id: `/bank/ifsc/:ifsc` is parameterised too, and comparing a
  // frontend `${code}` against a literal `:employee_id` would either miss a
  // real route or demand the wrong name for one.
  const generalise = (p) => p.replace(/\$\{[^}]+\}/g, ":param").replace(/:[A-Za-z_]\w*/g, ":param");

  const called = [...helper.matchAll(/API\.(?:get|post)\(`?"?\/hr([^"`,)]*)/g)]
    .map((m) => m[1])
    .map((p) => p.replace(/\/$/, ""))
    .map(generalise);

  assert.ok(called.length >= 12, `expected the full surface, found ${called.length}`);

  // Every path string the router declares, likewise generalised.
  const declared = new Set(
    [...router.matchAll(/router\.(?:get|post|put|delete)\(\s*"([^"]+)"/g)].map((m) => generalise(m[1]))
  );

  for (const p of called) {
    // The router mounts at /hr, so its own paths omit the prefix.
    const routerPath = p === "" ? "/" : p;
    assert.ok(
      declared.has(routerPath),
      `${routerPath} is called by the frontend but not declared in employee_master.js`
    );
  }
});

test("the helper covers the whole workflow", () => {
  for (const method of [
    "createEmployee",
    "editEmployee",
    "resignEmployee",
    "rejoinEmployee",
    "getLifecycle",
    "checkDuplicate",
    "initiateAadhaar",
    "verifyAadhaarOtp",
    "getAadhaarStatus",
    "attachAadhaar",
    "getBankStatus",
    "verifyBank",
    "confirmBankName",
    "overrideDuplicateBank",
  ]) {
    assert.match(helper, new RegExp(`\\b${method}:`), `helper/hr.js must expose ${method}`);
  }
});

test("the create never sends an employee_id - the database allocates it", () => {
  // The body is built by `util/hrOnboarding.js` rather than inline, so that
  // what it contains can be asserted directly - see hrOnboarding.test.js,
  // which pins both halves of this: no employee_id, and nothing sensitive.
  const payload = read("util/hrOnboarding.js");
  const builder = payload.slice(payload.indexOf("function buildCreatePayload"));
  assert.ok(!/employee_id:/.test(builder), "a client-supplied employee_id is refused by the backend");
  assert.match(builder, /aadhaar_verification_id/, "a verified Aadhaar is attached at create time");
  assert.match(add, /buildCreatePayload\(form, verification\)/, "the screen builds it no other way");
});

/* ================================================= nothing secret leaks = */
/** Comments may NAME a secret field to explain why it is absent; code may not. */
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("no screen renders a full Aadhaar, an account number or a fingerprint", () => {
  const screens = { list, add, profile, bankCard, aadhaarModal, timeline };
  for (const [name, src] of Object.entries(screens)) {
    const code = codeOf(src);
    for (const forbidden of [
      "account_no",
      "account_fingerprint",
      "aadhaar_fingerprint",
      "aadhaar_ciphertext",
      "BANK_FINGERPRINT_KEY",
      "AADHAAR_ENCRYPTION_KEY",
    ]) {
      assert.ok(!new RegExp(`\\b${forbidden}\\b`).test(code), `${name} must not reference ${forbidden}`);
    }
  }
});

test("`aadhaar_number` appears ONLY as the outbound request field, never rendered", () => {
  // The modal has to send it once. What it must never do is put it in JSX, in
  // state that outlives the request, or in a URL.
  const code = codeOf(aadhaarModal);
  const uses = code.match(/aadhaar_number/g) || [];
  assert.strictEqual(uses.length, 1, "exactly one use: the POST payload");
  assert.match(code, /aadhaar_number: aadhaar\.replace/);

  // The typed number is bound to its own <Input> - that is the controlled
  // input, and is both necessary and safe. What must never happen is the
  // number appearing anywhere else in the JSX, i.e. rendered back as text.
  const bindings = code.match(/value=\{aadhaar\}/g) || [];
  assert.strictEqual(bindings.length, 1, "exactly one controlled input holds the number");
  const withoutBinding = code.replace(/value=\{aadhaar\}/g, "");
  assert.ok(
    !/\{aadhaar\}/.test(withoutBinding),
    "the number is never interpolated into the page as text"
  );

  // And no other screen mentions it at all.
  for (const [name, src] of Object.entries({ list, add, profile, bankCard, timeline })) {
    assert.ok(!/aadhaar_number/.test(codeOf(src)), `${name} must not reference aadhaar_number`);
  }
});

test("the Aadhaar number and OTP are sent, never stored or logged", () => {
  // The modal holds both in local state only long enough to POST them.
  assert.match(aadhaarModal, /aadhaar_number: aadhaar\.replace/);
  assert.match(aadhaarModal, /setAadhaar\(""\)/, "the number is dropped once the OTP is sent");
  assert.match(aadhaarModal, /setOtp\(""\)/, "and the OTP once it is verified");
  assert.ok(!/console\.log/.test(aadhaarModal), "nothing here is logged");
  assert.ok(!/localStorage/.test(aadhaarModal), "and nothing is persisted");
});

test("there is no full-Aadhaar reveal anywhere - the permission is granted to nobody", () => {
  for (const src of [list, add, profile, bankCard, aadhaarModal]) {
    const code = codeOf(src);
    assert.ok(!/view_aadhaar_full/.test(code), "C3 must not build for a permission nobody has");
    assert.ok(!/aadhaar\/full/.test(code), "and must not call the full-number endpoint");
  }
  assert.match(read("components/hr/profile/AadhaarSection.jsx"), /encrypted and is not shown/, "and the profile says so plainly");
});

/* ==================================================== permission gating = */
test("the profile decides actions from the shared rules, not ad hoc checks", () => {
  assert.match(profile, /lifecycleActions\(/);
  // The card now asks `bankActions`, which composes `canVerifyBank` rather
  // than restating it - so the card and the editor cannot disagree about
  // whether this user may run the paid check.
  assert.match(bankCard, /bankActions\(/);
  assert.match(bankCard, /canReviewBankName\(/);
  assert.match(bankCard, /canOverrideDuplicateBank\(/);
  const rules = read("util/hrStatus.js");
  const decision = rules.slice(rules.indexOf("function bankActions"));
  assert.match(decision.slice(0, 900), /canVerifyBank\(\{ permissions, isAdmin \}\)/);
});

test("the override button is behind the permission check, not the status alone", () => {
  const block = bankCard.slice(bankCard.indexOf("mayOverride"), bankCard.indexOf("</Stack>"));
  assert.match(bankCard, /const mayOverride = canOverrideDuplicateBank\(/);
  assert.match(block, /mayOverride/);
  // And it demands a reason before it can be submitted.
  assert.match(bankCard, /reason\.trim\(\)\.length < 3/);
});

test("the list and the add screen gate on the permissions they need", () => {
  assert.match(list, /usePermissions\(\["view_employees"\]\)/);
  assert.match(list, /usePermissions\(\["employee_create"\]\)/);
  assert.match(add, /usePermissions\(\["employee_create"\]\)/);
  // The profile now has several differently-governed sections, so it resolves
  // its rules through util/hrProfile.js rather than one usePermissions call
  // per section. The keys those rules check are pinned in hrProfile.test.js.
  assert.match(profile, /canEditEmployee\(actor\)/);
  assert.match(profile, /usePermissions\(\["view_employee_lifecycle"\]\)/);
});

test("a permission refusal is shown as a refusal, not as empty data", () => {
  assert.match(list, /do not have permission/);
  assert.match(profile, /do not have permission/);
  assert.match(list, /unwrapList/, "the B2 refusal shape is unwrapped rather than rendered");
});

/* ========================================================= the workflow = */
test("the duplicate check is advisory and cannot stop the create", () => {
  assert.match(add, /HrHelper\.checkDuplicate/);
  assert.match(add, /advice, not a block/);
  // The create button's disabled state depends only on the required fields.
  assert.match(add, /isDisabled=\{!required\}/);
  assert.ok(
    !/isDisabled=\{[^}]*duplicat/i.test(add),
    "no duplicate state may disable the create button"
  );
});

test("an inactive duplicate is offered as a Rejoin", () => {
  assert.match(add, /suggested_action === "rejoin"/);
  assert.match(add, /Rejoin this employee/);
});

test("Skip for now is a real choice, and Aadhaar is not required to create", () => {
  assert.match(add, /Skip for now/);
  assert.match(add, /Aadhaar can be completed later if skipped/);
  // The required-fields gate is name and joining date. Nothing Aadhaar.
  assert.match(add, /const required = form\.employee_name\.trim\(\) && form\.date_of_joining/);
});

/**
 * Stage 1 is two actions and nothing else. The long explanation that used to
 * sit above them - why verification matters, and what skipping does not hold
 * up - is what made the screen heavy for a store manager, and the decision it
 * asks for was being confirmed twice: once on an action, once on a Next.
 */
test("STAGE 1 IS A DECISION, AND THE DECISION IS WHAT MOVES THE MANAGER ON", () => {
  const code = codeOf(add);

  // Both answers advance by themselves.
  assert.match(code, /const leaveAadhaar = \(\) => goTo\(stage \+ 1\)/);
  assert.match(code, /const skipAadhaar = \(\) => \{[\s\S]{0,120}setAadhaarSkipped\(true\);[\s\S]{0,80}leaveAadhaar\(\)/);
  assert.match(code, /applyVerifiedDemographics\(f, decision\)\);[\s\S]{0,200}leaveAadhaar\(\)/);

  // So stage 1 offers no generic Next of its own.
  assert.match(code, /stageKey === "aadhaar" \? null : \(/);

  // Skipping still means Aadhaar Pending, and is still never required.
  assert.match(add, /Aadhaar Pending/);
  assert.ok(!/isDisabled=\{!verification/.test(code), "Aadhaar must not gate anything");
});

test("the heavy stage 1 copy is gone, and the concise copy is what is left", () => {
  const stages = read("util/hrOnboarding.js");
  const stage1 = stages.slice(stages.indexOf('key: "aadhaar"'), stages.indexOf('key: "personal"'));
  assert.match(stage1, /title: "Aadhaar Verification"/);
  assert.match(stage1, /identify existing\/rejoining employees and avoid duplicate Employee IDs/);

  // The two paragraphs the managers were reading past.
  assert.ok(!/Preferred, but not required/.test(add), "the preamble is gone");
  assert.ok(!/attendance or payroll/.test(add), "the bank/attendance/payroll paragraph is gone");
  assert.ok(
    !/keeps their original ID instead of getting a second one/.test(stages),
    "the rejoining explanation is gone from the stage blurb"
  );

  // Cancel is still there.
  assert.match(add, /<Button variant="ghost">\s*Cancel/);
});

/* ================================= the manager's onboarding wizard ====== */
/**
 * Add Employee is a staged flow, not one long form. What these defend is the
 * division of labour it exists to express: the manager does three stages and
 * stops, and HR's sections are somewhere else entirely.
 */
test("Add Employee is the four manager stages, Aadhaar first (M1)", () => {
  const stages = read("util/hrOnboarding.js");
  assert.match(stages, /key: "aadhaar"[\s\S]*key: "personal"[\s\S]*key: "employment"[\s\S]*key: "education"/);
  assert.match(add, /OnboardingStepper/, "the stages are shown as a stepper");
  // Each stage renders on its own, so this is not the old single long form
  // with Aadhaar at the bottom of it.
  assert.match(add, /stageKey === "aadhaar"/);
  assert.match(add, /stageKey === "personal"/);
  assert.match(add, /stageKey === "employment"/);
  assert.match(add, /stageKey === "education"/);
});

test("A STORE MANAGER IS NEVER SHOWN AN HR-ONLY SECTION HERE, not even disabled", () => {
  // Statutory, bank and documents are HR's, and are completed afterwards on
  // the employee profile against the same employee_id.
  const code = codeOf(add);
  for (const forbidden of [
    "StatutorySection",
    "BankDetailsEditor",
    "BankCard",
    "pf_applicable",
    "esi_applicable",
    "pf_number",
    "esi_number",
    "pan_no",
    "salary",
    "bank_name",
  ]) {
    assert.ok(!new RegExp(`\\b${forbidden}\\b`).test(code), `${forbidden} is not the manager's to see`);
  }
});

test("exactly one employee is created, and only on the EMPLOYMENT stage (M1: stage 3 of 4)", () => {
  const code = codeOf(add);
  const creates = code.match(/HrHelper\.createEmployee\(/g) || [];
  assert.strictEqual(creates.length, 1, "one create, at one point in the flow");
  // The create button exists only inside the create-stage branch - which is
  // NOT the final stage any more: Education follows, against the new ID.
  assert.match(code, /isCreateStage\(stage\)[\s\S]{0,400}onClick=\{create\}/);
  assert.ok(!/isFinalStage\(stage\)[\s\S]{0,200}onClick=\{create\}/.test(code), "the create is not on the last stage");
  assert.match(add, /Create employee &amp; generate ID/, "and it says what it does");
  // Nothing is written on the way there: no draft, no placeholder record.
  // (`editEmployee` is the profile's editor; stage 4 uses the onboarding
  // education endpoint, which is a different call under a different key.)
  for (const forbidden of ["editEmployee", "attachAadhaar", "draft"]) {
    assert.ok(!new RegExp(`\\b${forbidden}\\b`).test(code), `${forbidden} has no business in a create flow`);
  }
});

test("M1: stage 4 saves education against the created ID through the onboarding endpoint, and never re-creates", () => {
  const code = codeOf(add);
  assert.match(code, /HrHelper\.saveOnboardingEducation\(created\.employee_id, payload\)/);
  assert.match(code, /buildEducationPayload\(form\)/);
  // A blank education finishes without a request.
  assert.match(code, /if \(!payload\) \{\s*setFinished\(true\);\s*return;/);
  // Once created, Back and the stepper cannot return across the create.
  assert.match(code, /const back = \(\) => \{[\s\S]{0,200}if \(created\) return;/);
  assert.match(code, /index < stage && !created/);
  // The success screen appears after stage 4, not straight after the create.
  assert.match(code, /const success = finished \? createdSummary\(created\) : null/);
  assert.match(helper, /onboarding-education/);
});

test("M1: the initial shift on stage 3 comes from the NEW work shift master, is optional, and is never the legacy shift_id", () => {
  const code = codeOf(add);
  assert.match(code, /useWorkShiftOptions\(canCreate\)/);
  assert.match(code, /default_work_shift_id/);
  assert.ok(!/\bshift_id\b/.test(code), "the legacy column is never named");
  assert.ok(!/useShifts|helper\/shift"/.test(code), "the legacy /shift master is not loaded");
  assert.match(code, /Select shift \(optional\)/);
  // A failed options read does not stop the create.
  assert.match(add, /The employee can still be created and assigned a shift later/);
  const helperWs = read("helper/employeeWorkShift.js");
  assert.match(helperWs, /\/hr\/work-shift-assignments\/options/);
});

test("Back preserves what was entered - it moves the stage and nothing else", () => {
  const code = codeOf(add);
  const backFn = code.slice(code.indexOf("const back = ()"), code.indexOf("const create = async"));
  assert.match(backFn, /setStage\(/);
  assert.ok(!/setForm\(/.test(backFn), "going back must never clear the form");
  assert.ok(!/setVerification\(/.test(backFn), "nor throw away a verified Aadhaar");
});

test("Next validates the stage in front of the manager, and only that one", () => {
  const code = codeOf(add);
  assert.match(code, /validateStage\(stageKey, form, stageContext\)/);
  // The create re-checks its own stage rather than trusting the walk here.
  assert.match(code, /validateStage\("employment", form, stageContext\)/);
});

test("the success state shows the Employee ID and says HR onboarding is pending", () => {
  assert.match(add, /createdSummary\(created\)/);
  assert.match(add, /Employee ID <strong>\{success\.employeeId\}<\/strong>/);
  const rules = read("util/hrOnboarding.js");
  const summary = rules.slice(rules.indexOf("function createdSummary"));
  assert.match(summary.slice(0, 900), /HR onboarding pending/);
});

test("verifying later attaches to the same employee, and never creates one", () => {
  assert.match(profile, /HrHelper\.attachAadhaar\(lifecycle\.employee_id/);
  assert.ok(!/createEmployee/.test(profile), "the profile must never create an employee");
  assert.match(profile, /already belongs to employee/, "a clash names the holder");
});

test("resign and rejoin keep the permanent employee ID, and invent no dates", () => {
  assert.match(lifecycleModals, /HrHelper\.resignEmployee\(employee\.employee_id/);
  assert.match(lifecycleModals, /HrHelper\.rejoinEmployee\(employee\.employee_id/);
  assert.match(lifecycleModals, /is kept\./, "resigning says the ID survives");
  assert.match(lifecycleModals, /same employee ID/, "rejoining says so too");
  assert.match(lifecycleModals, /NO DATE IS EVER INVENTED/);
  // The previous-end field appears only when the backend genuinely needs it.
  assert.match(lifecycleModals, /rejoinNeedsPreviousEnd\(lifecycle\)/);
  assert.match(lifecycleModals, /it is not guessed for you/);
});

test("the timeline shows every period, and marks the ones that could not be dated", () => {
  assert.match(timeline, /periods\.map/);
  assert.match(timeline, /needs_review/);
  assert.match(timeline, /not recorded/);
});

test("the profile reloads after every action rather than guessing the new state", () => {
  for (const handler of ["onBankChanged={load}", "onDone={load}"]) {
    assert.ok(profile.includes(handler), `${handler} must refresh from the server`);
  }
});

/* ============================ C3: the list's Aadhaar and Bank columns == */
test("the status summary is fetched ONCE, never once per employee", () => {
  const code = codeOf(list);

  // Exactly one call site, and it is not inside anything that maps over the
  // employees. This is the whole reason the bulk endpoint exists.
  const calls = code.match(/HrHelper\.getStatusSummary\(/g) || [];
  assert.strictEqual(calls.length, 1, "one call for the whole list");

  // The per-employee reads belong to the profile, not here.
  for (const perEmployee of ["getAadhaarStatus", "getBankStatus"]) {
    assert.ok(
      !new RegExp(`HrHelper\\.${perEmployee}\\(`).test(code),
      `the list must not call ${perEmployee} - that is 630 requests`
    );
  }

  // And the call is not reachable from inside a .map(...) over the rows.
  const mapBodies = code.split(/\.map\(/).slice(1);
  for (const body of mapBodies) {
    assert.ok(
      !body.slice(0, body.indexOf("})")).includes("getStatusSummary"),
      "the summary must not be fetched per row"
    );
  }
});

test("the helper's summary path is the one the backend declares", { skip: !backendAvailable }, () => {
  const router = fs.readFileSync(BACKEND_ROUTER, "utf8");
  assert.match(helper, /getStatusSummary:/);
  assert.match(helper, /API\.get\("\/hr\/employees\/status-summary"/);
  assert.ok(
    router.includes('"/employees/status-summary"'),
    "the frontend calls a path the backend does not declare"
  );
  // And the backend gates it on the list's own permission.
  const route = router.slice(router.indexOf('"/employees/status-summary"'));
  assert.match(route.slice(0, 200), /P\.VIEW_EMPLOYEES/);
});

test("the statuses are merged by employee_id, through the shared index", () => {
  const code = codeOf(list);
  assert.match(code, /statusSummaryIndex\(/, "the merge rule is shared, not re-typed here");
  assert.match(code, /statuses\[String\(e\.employee_id\)\]/, "merged by id, not by row order");
});

test("the columns use the shared badges rather than their own mapping", () => {
  const code = codeOf(list);
  assert.match(code, /<AadhaarListBadge status=\{s\.aadhaar_status\}/);
  assert.match(code, /<BankListBadge status=\{s\.bank_status\} payrollReady=\{s\.bank_payroll_ready\}/);
  // No colour or label decided in the page itself.
  assert.ok(!/colorScheme="(green|red|orange|yellow)"/.test(code), "badge colours belong in hrStatus");
});

test("A FAILED SUMMARY LEAVES THE EMPLOYEE LIST INTACT", () => {
  const code = codeOf(list);

  // The summary lives in its own effect, and its failure path touches only
  // the status state - never `setRows`, which is what would empty the page.
  const effect = code.slice(code.indexOf("getStatusSummary"), code.indexOf("const filtered"));
  assert.ok(!/setRows\(/.test(effect), "a status failure must never touch the employee rows");
  assert.match(effect, /catch/, "and it must catch");
  assert.match(effect, /setStatuses\(\{\}\)/, "falling back to no statuses");
  assert.match(effect, /setStatusUnavailable\(true\)/);

  // A B2 refusal arrives as an object, not a list, and is handled as such.
  assert.match(effect, /Array\.isArray\(summary\)/, "the 403 shape is not rendered as data");
});

test("the status columns are compact, and the list did not become a dashboard", () => {
  const heading = list.slice(list.indexOf("const heading = {"), list.indexOf("const tableRows"));
  assert.match(heading, /aadhaar: "Aadhaar"/);
  assert.match(heading, /bank: "Bank"/);
  // The third is the HR-onboarding one, and it is headed with two letters for
  // the same reason the other two are one word: this is a list to scan.
  assert.match(heading, /hr_onboarding: "HR"/);
  const columns = (heading.match(/^\s+\w+:/gm) || []).length;
  assert.ok(columns <= 12, `the list has ${columns} columns; it is meant to stay compact`);
});

test("the HR column says a section is outstanding, never anything in one", () => {
  const code = codeOf(list);
  assert.match(code, /<HrOnboardingBadge pending=\{s\.hr_onboarding_pending\}/);
  // The flag and the section names are all the list receives; the values
  // behind them are sensitive and stay on the server.
  for (const forbidden of ["pf_applicable", "esi_applicable", "pf_number", "esi_number", "uan", "pan_no"]) {
    assert.ok(!new RegExp(`\\b${forbidden}\\b`).test(code), `the list must not reference ${forbidden}`);
  }
});

test("the summary carries no sensitive value into the list", () => {
  const code = codeOf(list);
  for (const forbidden of [
    "aadhaar_number", "aadhaar_last4", "account_no", "account_last4",
    "account_fingerprint", "aadhaar_fingerprint", "aadhaar_ciphertext",
    "ifsc", "name_at_bank", "verification_id",
  ]) {
    assert.ok(!new RegExp(forbidden).test(code), `the list must not reference ${forbidden}`);
  }
  // What it does read is exactly the three status fields.
  assert.match(code, /s\.aadhaar_status/);
  assert.match(code, /s\.bank_status/);
  assert.match(code, /s\.bank_payroll_ready/);
});

/* ================================ C3 revision: Card view and the toggle = */
const card = read("components/hr/EmployeeCard.jsx");

test("the list opens in CARD view by default", () => {
  const code = codeOf(list);
  assert.match(code, /useState\("card"\)/, "cards are the default, not the fallback");
  // And the default is a literal, not read from storage during render - doing
  // that server-side and client-side gives two different first renders.
  const initial = code.slice(code.indexOf('useState("card")'), code.indexOf('useState("card")') + 40);
  assert.ok(!/localStorage/.test(initial), "the first render must not read storage");
  assert.match(code, /useEffect\(\(\) => \{[\s\S]{0,200}localStorage\.getItem/, "it is read after mount");
});

test("both views are offered, and the choice is remembered", () => {
  const code = codeOf(list);
  assert.match(code, /chooseView\("card"\)/);
  assert.match(code, /chooseView\("list"\)/);
  assert.match(code, /localStorage\.setItem\(VIEW_STORAGE_KEY/);
  // Storage being unavailable must not stop the toggle working.
  const chooser = code.slice(code.indexOf("const chooseView"), code.indexOf("const [search"));
  assert.match(chooser, /try \{/);
  assert.match(chooser, /catch/);
  assert.ok(chooser.indexOf("setView(next)") < chooser.indexOf("localStorage"), "the view changes first");
});

test("the two views share one data set, so switching cannot change the answer", () => {
  const code = codeOf(list);
  // Both render from `filtered`; neither re-fetches or re-filters.
  assert.match(code, /filtered\.slice\(0, cardsShown\)\.map/, "cards come from the filtered rows");
  assert.match(code, /view !== "list" \? \[\] : filtered\.map/, "so does the table");
  const fetches = (code.match(/EmployeeHelper\.getEmployee\(/g) || []).length;
  assert.strictEqual(fetches, 1, "one fetch, whichever view is showing");
});

test("THE CARD SHOWS THE EIGHT THINGS THAT MATTER, AND NOT THE REST", () => {
  const code = codeOf(card);
  for (const field of [
    "employee.employee_name",
    "employee.designation_name",
    "employee.store_name",
    "employee.department_name",
    "employee.employee_id",
    "employee.status",
    "status.aadhaar_status",
    "status.bank_status",
  ]) {
    assert.ok(code.includes(field), `the card must show ${field}`);
  }
  // Detail belongs in the list view and on the profile, not on a card meant
  // to be scanned.
  for (const notOnACard of ["primary_contact_number", "date_of_joining", "shift", "salary"]) {
    assert.ok(!code.includes(notOnACard), `${notOnACard} does not belong on the card`);
  }
});

test("the card renders nothing sensitive, and reuses the shared badges", () => {
  const code = codeOf(card);
  for (const forbidden of [
    "aadhaar_number", "aadhaar_last4", "account_no", "account_last4",
    "ifsc", "fingerprint", "ciphertext", "name_at_bank",
  ]) {
    assert.ok(!new RegExp(forbidden).test(code), `the card must not render ${forbidden}`);
  }
  assert.match(code, /<AadhaarListBadge/);
  assert.match(code, /<BankListBadge/);
  assert.match(code, /<EmploymentBadge/);
});

test("every card opens that employee's profile", () => {
  assert.match(codeOf(card), /href=\{`\/hr\/employees\/\$\{employee\.employee_id\}`\}/);
});

test("the list view keeps the detail a card leaves off", () => {
  const heading = list.slice(list.indexOf("const heading = {"), list.indexOf("const tableRows"));
  for (const detail of ["primary_contact_number", "date_of_joining"]) {
    assert.ok(heading.includes(detail), `the table is for bulk scanning; it keeps ${detail}`);
  }
  assert.match(heading, /aadhaar: "Aadhaar"/);
  assert.match(heading, /bank: "Bank"/);
});

test("the card grid is paged, so 630 employees do not all mount at once", () => {
  const code = codeOf(list);
  assert.match(code, /const CARD_PAGE = \d+/);
  assert.match(code, /Showing \{cardsShown\} of \{filtered\.length\}/, "the true total stays visible");
  // A new filter is a new question and starts from the first page.
  assert.match(code, /setCardsShown\(CARD_PAGE\)/);
});

/* ============================== the complete employee master profile ==== */
const personal = read("components/hr/profile/PersonalSection.jsx");
const employment = read("components/hr/profile/EmploymentSection.jsx");
const statutory = read("components/hr/profile/StatutorySection.jsx");
const education = read("components/hr/profile/EducationSection.jsx");
const bankEditor = read("components/hr/profile/BankDetailsEditor.jsx");

test("THE PROFILE STILL EDITS EVERY FIELD THE OLD FORM OWNED", () => {
  // The regression this section exists to prevent: the old /employee/[id]
  // form was the only editor for these, and deleting it removed them.
  for (const section of [
    "PersonalSection", "EmploymentSection", "StatutorySection", "EducationSection",
  ]) {
    assert.ok(profile.includes(`<${section}`), `the profile must render ${section}`);
  }
  // And the C2/C3 flows that were already there are untouched. The bank card
  // now lives inside Payment Details (M1), unchanged.
  for (const kept of ["<PaymentDetailsSection", "<AadhaarVerifyModal", "<LifecycleTimeline", "<ResignModal", "<RejoinModal"]) {
    assert.ok(profile.includes(kept), `${kept} must still be rendered`);
  }
  assert.match(read("components/hr/profile/PaymentDetailsSection.jsx"), /<BankCard/, "the bank card is rendered by Payment Details");
});

/* ================================================ M1: the eight sections == */
test("M1: THE PROFILE RENDERS THE EIGHT SECTIONS IN THE ONE ORDER, AND NO LEGACY LAYOUT REMAINS", () => {
  const order = [
    "<AadhaarSection",
    "<PersonalSection",
    "<EmploymentSection",
    "<EducationSection",
    "<PaymentDetailsSection",
    "<StatutorySection",
    "<PayrollSection",
    "<DocumentsSection",
  ];
  const positions = order.map((tag) => profile.indexOf(tag));
  for (let i = 0; i < order.length; i += 1) {
    assert.ok(positions[i] >= 0, `${order[i]} must be rendered`);
    if (i > 0) assert.ok(positions[i] > positions[i - 1], `${order[i]} must come after ${order[i - 1]}`);
  }
  // Same order as the wizard's stages, which are the first four.
  const { EMPLOYEE_MASTER_SECTIONS } = require("../../util/hrProfile");
  const { ONBOARDING_STAGES } = require("../../util/hrOnboarding");
  assert.deepStrictEqual(ONBOARDING_STAGES.map((s) => s.key), EMPLOYEE_MASTER_SECTIONS.slice(0, 4).map((s) => s.key));
  // Aadhaar is a full-width first section, not a half-width card beside Statutory.
  assert.ok(!/SimpleGrid/.test(codeOf(profile)), "no side-by-side grid on the profile");
  // The old /employee/[id] form is not resurrected as an edit layout: that
  // route is a redirect to the canonical profile and renders no employee.
  const legacy = codeOf(read("pages/employee/[id].jsx"));
  assert.match(legacy, /canonicalPathFor/);
  assert.ok(!/EmployeeHelper|Formik|<Form\b|updateEmployeeDetails/.test(legacy), "the legacy route renders no form");
});

test("M1: each section is gated on the right it needs, and employee_create opens nothing on the profile", () => {
  const code = codeOf(profile);
  assert.match(code, /const mayEditPayment = canEditPaymentDetails\(actor\)/);
  assert.match(code, /const mayEditStatutory = canEditStatutoryDetails\(actor\)/);
  assert.match(code, /const mayAssignShift = canAssignShift\(actor\)/);
  assert.match(code, /const mayViewDocuments = canViewDocuments\(actor\)/);
  const block = (tag) => profile.slice(profile.indexOf(tag), profile.indexOf(tag) + 700);
  assert.match(block("<PaymentDetailsSection"), /canView=\{mayViewSensitive\}/);
  assert.match(block("<PaymentDetailsSection"), /canEdit=\{mayEditPayment/);
  assert.match(block("<PaymentDetailsSection"), /canEditBank=\{mayEditPayment\}/);
  assert.match(block("<StatutorySection"), /canView=\{mayViewSensitive\}/);
  assert.match(block("<StatutorySection"), /canEdit=\{mayEditStatutory/);
  assert.match(block("<EmploymentSection"), /canAssignShift=\{mayAssignShift\}/);
  assert.match(block("<DocumentsSection"), /canView=\{mayViewDocuments\}/);
  assert.ok(!/employee_create/.test(code), "the onboarding key is not a profile right");
});

test("M1: Payment Details is Cash / Bank, asks for the bank only when Bank, and never shows a store manager the choice", () => {
  const payment = read("components/hr/profile/PaymentDetailsSection.jsx");
  assert.match(payment, /title="Payment Details"/);
  assert.match(payment, /PAYMENT_TYPE_OPTIONS/);
  assert.match(payment, /isBankPayment\(type\)/);
  assert.match(payment, /Paid in cash\. No bank account is required\./);
  // Existing bank behaviour is reused, not rebuilt.
  assert.match(payment, /<BankCard/);
  assert.ok(!/account_no|ifsc/.test(codeOf(payment)), "the account fields stay in the existing editor");
  // Not in the wizard, not on the Employment section.
  assert.ok(!/payment_type|PaymentDetails|PAYMENT_TYPE/.test(codeOf(add)), "a store manager is never asked Cash/Bank");
  assert.ok(!/payment_type/.test(codeOf(employment)), "Payment Type is not on Employment Details");
  // Stored as the legacy values, through the sensitive path.
  const rules = read("util/hrProfile.js");
  assert.match(rules, /payment_type: "payment_type"/);
  assert.match(rules, /\{ value: 1, label: "Bank" \}/);
  assert.match(rules, /\{ value: 2, label: "Cash" \}/);
});

test("M3: Payroll holds its place and is READ-ONLY; Documents is last and read-only", () => {
  // M1 put the section in the order and left it empty; M3 fills it with the
  // current approved salary and NOTHING ELSE. What is defended here is the
  // half that did not change: it still offers no way to write pay.
  // The figures themselves are pinned in components/hr/payrollSection.test.js.
  const payroll = codeOf(read("components/hr/profile/PayrollSection.jsx"));
  assert.ok(!/EditField|onSave|onEdit|canEdit|editing/.test(payroll), "no editor of any kind");
  assert.ok(!/HrHelper|EmployeeHelper|updateEmployeeDetails/.test(payroll), "no employee write path");
  const documents = read("components/hr/profile/DocumentsSection.jsx");
  assert.match(documents, /DocumentHelper\.getDocType\(employeeId\)/, "the existing read is reused");
  assert.ok(!/upload|approveDocument|updateStatus|EditField|onSave/.test(codeOf(documents)), "read-only");
  assert.match(documents, /maskIdentifier\(d\.card_number\)/, "numbers are masked");
  const sections = read("util/hrProfile.js");
  assert.match(sections, /\{ key: "payroll", title: "Payroll" \},\s*\{ key: "documents", title: "Documents" \},\s*\]/);
});

test("SALARY IS GONE FROM THE PROFILE, NOT MERELY HIDDEN", () => {
  // Salary belongs to Payroll, which owns the structure and the payslip; one
  // editable figure here was a second, quieter place to change pay. The M1
  // Payroll section is position only - see the M1 tests above.
  const profileCode = codeOf(profile);
  for (const gone of ["CompensationSection", "Salary Master"]) {
    assert.ok(!profileCode.includes(gone), `${gone} must not be rendered or imported`);
  }
  assert.ok(!fs.existsSync(path.join(ROOT, "components/hr/profile/CompensationSection.jsx")));
  // Documents (M1, section 8) is read-only: no upload was built on the profile.
  for (const forbidden of ["uploadDocument", "approveDocument"]) {
    assert.ok(!profileCode.includes(forbidden), `${forbidden} must not appear on the profile`);
  }
});

test("EMPLOYMENT HISTORY APPEARS ONLY WHERE THERE IS A HISTORY", () => {
  // One period repeated the joining date the Employment card already carries,
  // so the screen said the same thing twice. Two periods means a resign and a
  // rejoin - the service record the panel exists for.
  assert.match(profile, /const hasEmploymentHistory = periodCount > 1/);
  assert.match(profile, /canViewLifecycle && hasEmploymentHistory/);
  // And the Employment card no longer repeats the count or the start date.
  const code = codeOf(employment);
  assert.ok(!/employment period/i.test(code), "the period badge is gone");
  assert.ok(!/Current period began/.test(code), "and so is the redundant start date");
});

test("THE SHIFT SHOWN IS THE NEW ASSIGNMENT, NOT THE LEGACY DEFAULT - and changed only under the assignment pair (M1)", () => {
  const code = codeOf(employment);
  assert.match(code, /label="Shift"/);
  assert.match(code, /currentShiftLabel\(currentShift\)/);
  // Not merely relabelled: the legacy column is neither read nor written.
  assert.ok(!/(?<!work_)shift_id/.test(code), "the legacy shift_id must not appear");
  // The dropdown exists ONLY behind `canAssignShift`, and saving goes through
  // the existing single assign - the same act as Employee Shift Assignment.
  assert.match(code, /\{canAssignShift \? \(\s*<EditField\s+label="Shift"/);
  assert.match(code, /onAssignShift\(Number\(work_shift_id\)\)/);
  assert.match(codeOf(profile), /EmployeeWorkShiftHelper\.assignWorkShift\(\[Number\(id\)\], workShiftId\)/);
  // The profile reads it through the new endpoint's hook, not `/shift`.
  assert.match(profile, /useCurrentWorkShift\(id, shiftVersion\)/);
  assert.ok(!/useShifts/.test(codeOf(profile)), "the legacy shift master is not loaded here");
});

test("each section saves through the path its fields actually belong to", () => {
  const code = codeOf(profile);
  // Ordinary fields: the C2 lifecycle-aware editor.
  assert.match(code, /const saveOrdinary[\s\S]{0,400}HrHelper\.editEmployee\(id, patch\)/);
  // Sensitive fields: the only route that writes those columns.
  assert.match(code, /const saveSensitive[\s\S]{0,500}EmployeeHelper\.updateEmployeeDetails\(payload\)/);
  // The mapping is shared, not restated per section.
  assert.match(code, /buildHrPatch\(/);
  assert.match(code, /buildSensitivePayload\(/);
});

test("AN EMPTY UPDATE IS NEVER SENT", () => {
  // `UPDATE new_employee SET ?` with {} is invalid SQL, and the HR editor
  // refuses "nothing to change" - so both are stopped before the request.
  const code = codeOf(profile);
  assert.match(code, /if \(Object\.keys\(patch\)\.length === 0\) return nothingToSave\(\)/);
  assert.match(code, /if \(!payload\) return nothingToSave\(\)/);
});

test("the sensitive sections are gated on BOTH viewing and editing", () => {
  const code = codeOf(profile);
  assert.match(code, /canViewSensitive\(actor\)/);
  // M1: editing is per section, and each section rule builds on the
  // sensitive pair - pinned in hrProfile.test.js.
  assert.match(code, /canEditStatutoryDetails\(actor\)/);
  assert.match(code, /canEditPaymentDetails\(actor\)/);
  for (const section of ["StatutorySection"]) {
    const block = profile.slice(profile.indexOf(`<${section}`), profile.indexOf(`<${section}`) + 320);
    assert.match(block, /canView=\{mayViewSensitive\}/, `${section} must gate viewing`);
    assert.match(block, /canEdit=\{mayEditStatutory/, `${section} must gate editing`);
  }
});

test("a section the caller may not see says so, rather than looking empty", () => {
  // B3 removes the keys entirely, so a blank field and a hidden one are
  // indistinguishable from the data - the UI must not imply "no PAN".
  const shell = read("components/hr/profile/SectionCard.jsx");
  assert.match(shell, /\{!canView \? \([\s\S]{0,200}deniedMessage/, "a locked section renders its reason");
  assert.match(statutory, /deniedMessage="You do not have permission to view this employee's statutory/);
});

test("STATUTORY IDENTIFIERS ARE MASKED WHEN DISPLAYED", () => {
  assert.match(statutory, /maskIdentifier\(employee\.pan_no\)/);
  // The scheme-bound numbers go through `statutoryValue`, which masks them
  // exactly as before whenever it shows them at all.
  for (const field of ["uan", "pf_number", "esi_number"]) {
    assert.match(
      statutory,
      new RegExp(`statutoryValue\\((employee\\.pf_applicable|employee\\.esi_applicable), employee\\.${field}\\)`),
      `${field} must be shown through statutoryValue`
    );
  }
  const rules = read("util/hrProfile.js");
  const fn = rules.slice(rules.indexOf("function statutoryValue"));
  assert.match(fn.slice(0, 300), /return maskIdentifier\(value\)/, "and statutoryValue masks");
  // The raw value appears only inside the editor, for whoever may change it.
  const readMode = statutory.slice(statutory.indexOf("} else {") >= 0 ? statutory.indexOf("} else {") : 0);
  assert.ok(!/value=\{employee\.pan_no\}/.test(readMode), "the full PAN is not rendered as text");
});

test("NOT APPLICABLE AND NOT RECORDED ARE DIFFERENT ANSWERS", () => {
  // The whole reason the flags exist. Running the two together made a
  // finished record indistinguishable from an outstanding chase, for good.
  const { statutoryValue, applicabilityLabel } = require(path.join(ROOT, "util/hrProfile.js"));
  assert.strictEqual(statutoryValue(0, ""), "Not applicable");
  assert.strictEqual(statutoryValue(0, "PF-9"), "Not applicable");
  // In the scheme with the number still pending is a real and common state,
  // and it must keep reading as outstanding rather than as finished.
  assert.strictEqual(statutoryValue(1, ""), null);
  // Nobody has said yet - which is every employee on file today.
  assert.strictEqual(statutoryValue(null, ""), null);
  assert.strictEqual(applicabilityLabel(null), null);
  assert.strictEqual(applicabilityLabel(1), "Yes");
  assert.strictEqual(applicabilityLabel(0), "No");

  // And the flags are editable Yes/No, not free text.
  for (const flag of ["pf_applicable", "esi_applicable"]) {
    assert.match(statutory, new RegExp(`name="${flag}"`), `${flag} must be editable`);
  }
  assert.match(statutory, /options=\{APPLICABILITY_OPTIONS\}/);
});

test("employee ID, joining date and status are never editable", () => {
  const code = codeOf(employment);
  // They are rendered as read-only Fields, never as EditFields.
  assert.match(code, /<Field label="Employee ID"/);
  assert.match(code, /<Field\s+label="Joining date"/);
  for (const owned of ["employee_id", "date_of_joining", "status"]) {
    assert.ok(
      !new RegExp(`EditField[^>]*name="${owned}"`).test(code),
      `${owned} is lifecycle or database state, not a form field`
    );
  }
});

test("a transfer edits the one record and warns that authorisation changes", () => {
  const code = codeOf(employment);
  for (const placement of ["store_id", "department_id", "designation_id"]) {
    assert.ok(new RegExp(`name="${placement}"`).test(code), `${placement} must be editable`);
  }
  assert.ok(!/createEmployee/.test(code), "changing branch must never create an employee");
  assert.match(employment, /sign in again/, "the re-authorisation is stated before saving");
});

test("the emergency contact is the existing column, labelled honestly", () => {
  assert.match(personal, /label="Alternate \/ Emergency Contact"/);
  assert.match(personal, /name="alternate_contact_number"/);
  assert.match(personal, /no separate emergency-contact field/);
  // No invented column.
  assert.ok(!/emergency_contact/.test(codeOf(personal)), "no field that does not exist");
});

test("FAMILY IS STILL DEFERRED, AND THE SCREEN NO LONGER EXPLAINS THE SCHEMA", () => {
  // The deferral is unchanged and correct. What went is the blue panel that
  // explained a VARCHAR key to HR, who cannot act on it and did not ask.
  const code = codeOf(education);
  assert.ok(!/Family details are not shown here/.test(education), "the warning is gone");
  // The reason survives in the file's own comment, where developers read it -
  // it is the rendered panel that had no business being on an HR screen.
  assert.ok(!/employee_family|VARCHAR|schema change/i.test(code), "and so is the schema talk");
  assert.ok(!/<Alert/.test(code), "there is no technical notice left in the section");
  assert.ok(!/FamilyHelper/.test(profile), "the name-keyed family API is still not used");
  // Education itself is safe - plain columns on the employee master.
  for (const field of ["qualification", "additional_course", "previous_experience"]) {
    assert.ok(education.includes(field), `${field} belongs in Education`);
  }
});

test("bank details can be entered, which is what makes C2 verification possible", () => {
  assert.match(profile, /<BankDetailsEditor/);
  // Entry is still gated on the B3 sensitive permission; the button moved into
  // the bank card's action row, so the gate travels as a prop rather than
  // wrapping a second button under the card.
  assert.match(profile, /canEditBank=\{mayEditPayment\}/);
  assert.match(profile, /onEditBankDetails=\{\(\) => setBankEditOpen\(true\)\}/);
  assert.match(read("components/hr/profile/PaymentDetailsSection.jsx"), /canEditSensitive=\{canEditBank\}/);
  // Changing the account invalidates the verification, and it says so first.
  assert.match(bankEditor, /back to <strong>Pending<\/strong>/);
  assert.match(bankEditor, /account_no/);
  assert.match(bankEditor, /ifsc/);
});

test("nothing in the new sections renders a secret", () => {
  const sections = { personal, employment, statutory, education, bankEditor };
  for (const [name, src] of Object.entries(sections)) {
    const code = codeOf(src);
    for (const forbidden of [
      "aadhaar_number", "aadhaar_ciphertext", "aadhaar_fingerprint",
      "account_fingerprint", "BANK_FINGERPRINT_KEY", "AADHAAR_ENCRYPTION_KEY",
      "view_aadhaar_full",
    ]) {
      assert.ok(!new RegExp(forbidden).test(code), `${name} must not reference ${forbidden}`);
    }
  }
  // The account number is entered in the editor and never displayed back.
  assert.ok(!/masked_account.*account_no/.test(codeOf(bankEditor)));
  assert.match(bankEditor, /never shown again in full/);
});

test("NO PAY AND NO DOCUMENT WORKFLOW LIVES ON THIS PROFILE", () => {
  // What the two removed cards used to guard, now guarded at the profile
  // rather than inside them: no salary figure, no arithmetic on one, and no
  // proof-document handling of any kind. Employee details are verified
  // separately, so a second upload path here would duplicate that and hold
  // the scans for the privilege.
  const code = codeOf(profile);
  // Payment Type (Cash / Bank) is Payment Details' (M1) and lives in its own
  // section; the salary figure stays with Payroll.
  for (const field of ["salary"]) {
    assert.ok(!new RegExp(`\\b${field}\\b`).test(code), `${field} belongs to Payroll`);
  }
  for (const derived of ["gross_", "net_pay", "total_deduction", "payslip", "esi_amount", "pf_amount"]) {
    assert.ok(!new RegExp(derived, "i").test(code), `${derived} belongs to Payroll, not HR`);
  }
  for (const doc of ["card_type", "card_no", "uploadDocument", "aadhaar_card_image", "s3"]) {
    assert.ok(!new RegExp(doc, "i").test(code), `${doc} is not part of the employee profile`);
  }
  // The mapping refuses to carry salary either, so a future component cannot
  // reopen the write path by accident.
  const rules = read("util/hrProfile.js");
  const map = rules.slice(rules.indexOf("const SENSITIVE_FIELD_API_KEY"));
  assert.ok(!/salary/.test(map.slice(0, 600)), "salary has no sensitive-field mapping any more");
});

test("M1 review fix: NO Employee Master screen can write salary, anywhere on the surface", () => {
  // The backend removed `salary` from /employee/updatedata's schema, so the
  // column is not writable through the Employee Master at all - it belongs to
  // the dedicated Payroll / Salary Revision system. This sweeps the WHOLE M1
  // surface rather than the profile alone, so a new section or a new stage
  // cannot quietly reintroduce the field.
  const surface = [
    "pages/hr/employees/[id].jsx",
    "pages/hr/employees/new.jsx",
    "util/hrProfile.js",
    "util/hrOnboarding.js",
    "helper/hr.js",
    ...fs
      .readdirSync(path.join(ROOT, "components/hr/profile"))
      .filter((f) => f.endsWith(".jsx"))
      .map((f) => `components/hr/profile/${f}`),
  ];

  for (const file of surface) {
    const code = codeOf(read(file));
    // A payload key, an assignment or a form field - the three shapes a write
    // would actually take. Prose about Payroll is fine and is stripped by
    // `codeOf` anyway.
    assert.ok(
      !/\bsalary\b\s*[:=]/.test(code),
      `${file} must not put salary into a payload or form state`
    );
    assert.ok(
      !/name=["']salary["']/.test(code),
      `${file} must not render an editable salary field`
    );
  }

  // And the editable-field contract itself never names it.
  const rules = read("util/hrProfile.js");
  const editable = rules.slice(
    rules.indexOf("const HR_EDITABLE_FIELDS"),
    rules.indexOf("const NUMERIC_HR_FIELDS")
  );
  assert.ok(!/"salary"/.test(editable), "salary is not an HR-editable field");
});

/* ---------------------- M2. Existing / Previous PF Member ----------------- */

test("M2 — Previous PF Member is on Statutory Details, as a tri-state", () => {
  // The ONLY frontend change in M2. It is a third statutory fact, not a
  // rewording of PF applicable and not the legacy free-text `pf` column.
  assert.match(statutory, /name="previous_pf_member"/, "it is editable");
  assert.match(
    statutory,
    /label="Existing \/ Previous PF member"/,
    "labelled as the approved rule names it"
  );

  // Yes / No / blank, through the same dropdown the other two flags use. The
  // blank option is what records "not known" - and the backend depends on it,
  // because it reports an unrecorded membership as an UNRESOLVED EPS split
  // rather than guessing. A two-state control would force an answer nobody has.
  const block = statutory.slice(statutory.indexOf('name="previous_pf_member"'));
  assert.match(block.slice(0, 400), /options=\{APPLICABILITY_OPTIONS\}/);

  // Read mode shows Yes / No / not recorded.
  assert.match(
    statutory,
    /applicabilityLabel\(employee\.previous_pf_member\)/,
    "displayed as a standalone fact"
  );

  // NOT through `statutoryValue`: that reads "Not applicable" the moment the
  // PF flag is off, which would erase an answer somebody actually gave about
  // a previous employer's scheme.
  assert.ok(
    !/statutoryValue\([^)]*employee\.previous_pf_member\)/.test(statutory),
    "it is a history, not an identifier waiting on this employer"
  );
});

test("M2 — Previous PF Member is sent as a tri-state number, under the statutory right", () => {
  const {
    buildSensitivePayload,
    canEditStatutoryDetails,
  } = require(path.join(ROOT, "util/hrProfile.js"));

  // Yes and No go as numbers, because the backend's Joi schema says so.
  assert.deepStrictEqual(
    buildSensitivePayload(5, { previous_pf_member: null }, { previous_pf_member: 1 }),
    { employee_id: 5, employee_details: { previous_pf_member: 1 } }
  );
  assert.deepStrictEqual(
    buildSensitivePayload(5, { previous_pf_member: 1 }, { previous_pf_member: 0 }),
    { employee_id: 5, employee_details: { previous_pf_member: 0 } }
  );

  // AN EMPTIED DROPDOWN CLEARS IT TO null, NOT TO 0. This is the assertion
  // that matters most on this field: 0 means "first-time member", which is a
  // statutory position, and null means nobody has said.
  assert.deepStrictEqual(
    buildSensitivePayload(5, { previous_pf_member: 1 }, { previous_pf_member: "" }),
    { employee_id: 5, employee_details: { previous_pf_member: null } }
  );

  // Unchanged means nothing is sent - that endpoint turns an empty body into
  // invalid SQL, and resending rewrites an audit trail for an edit nobody made.
  assert.strictEqual(
    buildSensitivePayload(5, { previous_pf_member: 1 }, { previous_pf_member: 1 }),
    null
  );

  // It travels on the SENSITIVE path (so B3 and the section key apply), never
  // on the ordinary HR editor patch.
  assert.strictEqual(typeof canEditStatutoryDetails, "function");
  const rules = read("util/hrProfile.js");
  const editable = rules.slice(rules.indexOf("HR_EDITABLE_FIELDS"), rules.indexOf("NUMERIC_HR_FIELDS"));
  assert.ok(
    !/previous_pf_member/.test(editable),
    "it must not be in the ordinary editable list - it is sensitive"
  );
});

/* --------------------- M2 review fix. Previous EPS Member ----------------- */

test("M2 review fix — Previous EPS Member is its OWN tri-state field", () => {
  // Official EPFO Form 11 asks about previous EPF membership and previous EPS
  // membership separately, because the answers differ: somebody can have been
  // in a previous employer's provident fund without ever having been in the
  // pension scheme. Two fields, not one reused.
  assert.match(statutory, /name="previous_eps_member"/, "it is editable");
  assert.match(
    statutory,
    /label="Existing \/ Previous EPS member"/,
    "labelled as the approved rule names it"
  );
  assert.match(statutory, /name="previous_pf_member"/, "and the PF fact is still there");

  const block = statutory.slice(statutory.indexOf('name="previous_eps_member"'));
  assert.match(block.slice(0, 400), /options=\{APPLICABILITY_OPTIONS\}/);

  // Read mode shows Yes / No / not recorded, as its own answer.
  assert.match(
    statutory,
    /applicabilityLabel\(employee\.previous_eps_member\)/,
    "displayed as a standalone fact"
  );

  // NOT through `statutoryValue`, for the same reason as its neighbour: that
  // reads "Not applicable" the moment the PF flag is off.
  assert.ok(
    !/statutoryValue\([^)]*employee\.previous_eps_member\)/.test(statutory),
    "it is a history, not an identifier waiting on this employer"
  );

  // AND IT IS NEVER FILLED IN FROM THE PF ANSWER. The whole point of the fix:
  // the screen may not quietly copy one answer into the other field.
  assert.ok(
    !/previous_eps_member:\s*(employee|form)\.previous_pf_member/.test(statutory),
    "the EPS answer is never seeded from the PF one"
  );
  assert.ok(
    !/previous_pf_member:\s*(employee|form)\.previous_eps_member/.test(statutory),
    "nor the other way round"
  );
});

test("M2 review fix — Previous EPS Member is sent as a tri-state number, under the statutory right", () => {
  const {
    buildSensitivePayload,
  } = require(path.join(ROOT, "util/hrProfile.js"));

  assert.deepStrictEqual(
    buildSensitivePayload(5, { previous_eps_member: null }, { previous_eps_member: 1 }),
    { employee_id: 5, employee_details: { previous_eps_member: 1 } }
  );
  assert.deepStrictEqual(
    buildSensitivePayload(5, { previous_eps_member: 1 }, { previous_eps_member: 0 }),
    { employee_id: 5, employee_details: { previous_eps_member: 0 } }
  );

  // AN EMPTIED DROPDOWN CLEARS IT TO null, NOT TO 0. 0 means "never an EPS
  // member", which files a third of the employer contribution; null means
  // nobody has said, and the backend keeps reporting the split as unresolved.
  assert.deepStrictEqual(
    buildSensitivePayload(5, { previous_eps_member: 1 }, { previous_eps_member: "" }),
    { employee_id: 5, employee_details: { previous_eps_member: null } }
  );

  assert.strictEqual(
    buildSensitivePayload(5, { previous_eps_member: 1 }, { previous_eps_member: 1 }),
    null
  );

  // THE TWO FACTS TRAVEL INDEPENDENTLY. Changing one must not send the other,
  // and both may be sent together with different answers.
  assert.deepStrictEqual(
    buildSensitivePayload(
      5,
      { previous_pf_member: 1, previous_eps_member: 1 },
      { previous_pf_member: 1, previous_eps_member: 0 }
    ),
    { employee_id: 5, employee_details: { previous_eps_member: 0 } }
  );
  assert.deepStrictEqual(
    buildSensitivePayload(
      5,
      { previous_pf_member: null, previous_eps_member: null },
      { previous_pf_member: 1, previous_eps_member: 0 }
    ),
    { employee_id: 5, employee_details: { previous_pf_member: 1, previous_eps_member: 0 } }
  );

  // It travels on the SENSITIVE path, never on the ordinary HR editor patch.
  const rules = read("util/hrProfile.js");
  const editable = rules.slice(rules.indexOf("HR_EDITABLE_FIELDS"), rules.indexOf("NUMERIC_HR_FIELDS"));
  assert.ok(
    !/previous_eps_member/.test(editable),
    "it must not be in the ordinary editable list - it is sensitive"
  );
});

test("M3 — the Payroll section is the ONLY salary surface, and it is a read", () => {
  // M2's rule 14 kept the card a placeholder because the view was M3's. Now
  // that it exists, what still has to hold is the boundary either side of it:
  // no Salary Revision, Approval or Bulk Upload UI anywhere, and no second
  // place for a salary to be typed.
  const payroll = read("components/hr/profile/PayrollSection.jsx");
  const code = payroll.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
  for (const forbidden of [
    "EditField",
    "onSave",
    "Save",
    "revision",
    "approve",
    "reject",
    "preview",
    "upload",
  ]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`, "i").test(code),
      `the Payroll card must not carry ${forbidden}`
    );
  }
  // It reads through the one hook, which calls the one endpoint.
  assert.match(code, /useCurrentSalary\(employeeId, canView\)/);
  assert.ok(!/axios|API\./.test(code), "the card does not call the API itself");
});
