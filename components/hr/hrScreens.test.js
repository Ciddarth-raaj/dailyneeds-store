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

  // What the helper calls, with the :id segments generalised.
  const called = [...helper.matchAll(/API\.(?:get|post)\(`?"?\/hr([^"`,)]*)/g)]
    .map((m) => m[1])
    .map((p) => p.replace(/\$\{[^}]+\}/g, ":employee_id"))
    .map((p) => p.replace(/\/$/, ""));

  assert.ok(called.length >= 12, `expected the full surface, found ${called.length}`);

  for (const p of called) {
    // The router mounts at /hr, so its own paths omit the prefix.
    const routerPath = p === "" ? "/" : p;
    assert.ok(
      router.includes(`"${routerPath}"`),
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
  const payload = add.slice(add.indexOf("const payload = {"), add.indexOf("const res = await HrHelper.createEmployee"));
  assert.ok(!/employee_id:/.test(payload), "a client-supplied employee_id is refused by the backend");
  assert.match(payload, /aadhaar_verification_id/, "a verified Aadhaar is attached at create time");
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
  assert.match(profile, /encrypted and is not shown/, "and the profile says so plainly");
});

/* ==================================================== permission gating = */
test("the profile decides actions from the shared rules, not ad hoc checks", () => {
  assert.match(profile, /lifecycleActions\(/);
  assert.match(bankCard, /canVerifyBank\(/);
  assert.match(bankCard, /canConfirmBankName\(/);
  assert.match(bankCard, /canOverrideDuplicateBank\(/);
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
  assert.match(profile, /usePermissions\(\["employee_edit"\]\)/);
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
  assert.match(add, /Preferred, but not required/);
  // The required-fields gate is name and joining date. Nothing Aadhaar.
  assert.match(add, /const required = form\.employee_name\.trim\(\) && form\.date_of_joining/);
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
  for (const handler of ["onChanged={load}", "onDone={load}"]) {
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

test("the two new columns are compact, and the list did not become a dashboard", () => {
  const heading = list.slice(list.indexOf("const heading = {"), list.indexOf("const tableRows"));
  assert.match(heading, /aadhaar: "Aadhaar"/);
  assert.match(heading, /bank: "Bank"/);
  // Two columns added, and no more.
  const columns = (heading.match(/^\s+\w+:/gm) || []).length;
  assert.ok(columns <= 11, `the list has ${columns} columns; it is meant to stay compact`);
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
