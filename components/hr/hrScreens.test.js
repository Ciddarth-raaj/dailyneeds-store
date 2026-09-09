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
  // The card now asks `bankActions`, which composes `canVerifyBank` rather
  // than restating it - so the card and the editor cannot disagree about
  // whether this user may run the paid check.
  assert.match(bankCard, /bankActions\(/);
  assert.match(bankCard, /canConfirmBankName\(/);
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
const compensation = read("components/hr/profile/CompensationSection.jsx");
const education = read("components/hr/profile/EducationSection.jsx");
const documents = read("components/hr/profile/DocumentsSection.jsx");
const bankEditor = read("components/hr/profile/BankDetailsEditor.jsx");

test("THE PROFILE COVERS EVERYTHING THE OLD FORM DID", () => {
  // The regression this section exists to prevent: the old /employee/[id]
  // form was the only editor for these, and deleting it removed them.
  for (const section of [
    "PersonalSection", "EmploymentSection", "StatutorySection",
    "CompensationSection", "EducationSection", "DocumentsSection",
  ]) {
    assert.ok(profile.includes(`<${section}`), `the profile must render ${section}`);
  }
  // And the C2/C3 flows that were already there are untouched.
  for (const kept of ["<BankCard", "<AadhaarVerifyModal", "<LifecycleTimeline", "<ResignModal", "<RejoinModal"]) {
    assert.ok(profile.includes(kept), `${kept} must still be rendered`);
  }
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
  assert.match(code, /canEditSensitive\(actor\)/);
  for (const section of ["StatutorySection", "CompensationSection"]) {
    const block = profile.slice(profile.indexOf(`<${section}`), profile.indexOf(`<${section}`) + 320);
    assert.match(block, /canView=\{mayViewSensitive\}/, `${section} must gate viewing`);
    assert.match(block, /canEdit=\{mayEditSensitive/, `${section} must gate editing`);
  }
});

test("a section the caller may not see says so, rather than looking empty", () => {
  // B3 removes the keys entirely, so a blank field and a hidden one are
  // indistinguishable from the data - the UI must not imply "no PAN".
  const shell = read("components/hr/profile/SectionCard.jsx");
  assert.match(shell, /\{!canView \? \([\s\S]{0,200}deniedMessage/, "a locked section renders its reason");
  assert.match(statutory, /deniedMessage="You do not have permission to view this employee's statutory/);
  assert.match(compensation, /deniedMessage="You do not have permission to view this employee's salary/);
  assert.match(documents, /deniedMessage="You do not have permission to view this employee's documents/);
});

test("STATUTORY IDENTIFIERS ARE MASKED WHEN DISPLAYED", () => {
  assert.match(statutory, /maskIdentifier\(employee\.pan_no\)/);
  assert.match(statutory, /maskIdentifier\(employee\.uan\)/);
  assert.match(statutory, /maskIdentifier\(employee\.pf_number\)/);
  assert.match(statutory, /maskIdentifier\(employee\.esi_number\)/);
  // The raw value appears only inside the editor, for whoever may change it.
  const readMode = statutory.slice(statutory.indexOf("} else {") >= 0 ? statutory.indexOf("} else {") : 0);
  assert.ok(!/value=\{employee\.pan_no\}/.test(readMode), "the full PAN is not rendered as text");
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
  for (const placement of ["store_id", "department_id", "designation_id", "shift_id"]) {
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

test("FAMILY IS DEFERRED, AND THE SCREEN SAYS WHY", () => {
  assert.match(education, /Family details are not shown here/);
  assert.match(education, /permanent employee ID/);
  assert.ok(!/FamilyHelper/.test(profile), "the name-keyed family API is not used");
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
  assert.match(profile, /canEditSensitive=\{mayEditSensitive\}/);
  assert.match(profile, /onEditDetails=\{\(\) => setBankEditOpen\(true\)\}/);
  // Changing the account invalidates the verification, and it says so first.
  assert.match(bankEditor, /back to <strong>Pending<\/strong>/);
  assert.match(bankEditor, /account_no/);
  assert.match(bankEditor, /ifsc/);
});

test("nothing in the new sections renders a secret", () => {
  const sections = { personal, employment, statutory, compensation, education, documents, bankEditor };
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

test("documents rely on B3 rather than re-deciding what to hide", () => {
  const code = codeOf(documents);
  assert.ok(!/card_no|card_number/.test(code), "a document number is never printed");
  assert.match(code, /SENSITIVE_CARD_TYPES/, "Aadhaar and PAN are marked");
  assert.ok(!/updateStatus|approveDocument/.test(code), "the section is read-only");
});

test("THE SALARY MASTER STORES A FIGURE; IT DOES NOT CALCULATE PAYROLL", () => {
  // Prose may name payroll concepts to explain the boundary - the section
  // says so on screen deliberately. What must not exist is the arithmetic:
  // no derived amount, no month, no second implementation of a payslip.
  const code = codeOf(compensation);

  // The only employee fields it touches are the two master columns.
  const reads = [...code.matchAll(/employee\.(\w+)/g)].map((m) => m[1]);
  assert.deepStrictEqual([...new Set(reads)].sort(), ["payment_type", "salary"]);

  // No computed money anywhere.
  for (const derived of ["gross_", "net_pay", "total_deduction", "payslip", "esi_amount", "pf_amount"]) {
    assert.ok(!new RegExp(derived, "i").test(code), `${derived} belongs to Payroll, not HR`);
  }
  assert.ok(!/salary\s*[*+\-/]/.test(code), "the master figure is stored, never arithmetic");
  assert.match(compensation, /Payroll calculates/i, "and the boundary is stated on screen");
});
