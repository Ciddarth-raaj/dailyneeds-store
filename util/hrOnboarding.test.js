/**
 * New Employee onboarding — the rules the manager's wizard runs on.
 *
 *   node --test util/hrOnboarding.test.js
 *
 * Three of these would be real defects rather than cosmetic ones if they ever
 * stopped holding, and they are the reason this logic is a module rather than
 * component state:
 *
 *   the create body must never carry an employee_id, and never anything
 *   sensitive - a manager is not asked for salary, bank or statutory details,
 *   so there must be nothing of the sort to send
 *
 *   Aadhaar must stay skippable - stage 1 asks for a decision, not an Aadhaar
 *
 *   a stage must judge only its own fields, or Back/Next becomes a screen
 *   that rejects answers it never asked for
 */
const test = require("node:test");
const assert = require("node:assert");

const {
  CREATE_STAGE_KEY,
  ONBOARDING_STAGES,
  applyVerifiedDemographics,
  buildCreatePayload,
  createdSummary,
  hrOnboardingBadge,
  hrOnboardingMissingLabel,
  isFinalStage,
  stageIsComplete,
  validateStage,
} = require("./hrOnboarding");

const TODAY = "2026-09-11";
const ctx = (over = {}) => ({ today: TODAY, ...over });

/**
 * A Personal stage that satisfies the mandatory rules. Blood group, email,
 * spouse name and marriage date are deliberately absent - the first two are
 * optional outright, and the second two only apply to a married employee.
 */
const personal = {
  employee_name: "Ramesh Kumar",
  father_name: "Kumar S",
  primary_contact_number: "9876543210",
  alternate_contact_number: "9876500000",
  dob: "1994-02-11",
  gender: "M",
  marital_status: "Single",
  permanent_address: "14 Bazaar Street",
  residential_address: "14 Bazaar Street",
};
const employment = {
  date_of_joining: "2026-09-01",
  store_id: "4",
  designation_id: "7",
  department_id: "2",
};

/* ================================================== the stages themselves */
test("the manager has exactly four stages, and they are the first four profile sections", () => {
  assert.deepStrictEqual(
    ONBOARDING_STAGES.map((s) => s.key),
    ["aadhaar", "personal", "employment", "education"]
  );
  // THE SAME FOUR SECTIONS AS THE PROFILE - checked as a SET.
  //
  // The profile shows Education & Experience before Employment Details. The
  // wizard cannot: its Employment stage is the one that CREATES the employee
  // and allocates the Employee ID, and its Education stage is recorded
  // against that ID through the onboarding education endpoint, so Education
  // first would be education recorded against a record that does not exist.
  // Add and Edit are still ONE employee master - one constraint, and only
  // that constraint, separates their order.
  const { EMPLOYEE_MASTER_SECTIONS } = require("./hrProfile");
  assert.deepStrictEqual(
    ONBOARDING_STAGES.map((s) => s.key).sort(),
    EMPLOYEE_MASTER_SECTIONS.slice(0, 4).map((s) => s.key).sort(),
    "Add and Edit cover the same four sections"
  );
  assert.strictEqual(CREATE_STAGE_KEY, "employment", "and this is why the wizard's order differs");
  assert.ok(isFinalStage(3));
  assert.ok(!isFinalStage(2));
});

test("NO HR-ONLY STAGE IS IN THE MANAGER'S WIZARD, not even as a future step", () => {
  // Statutory, bank and documents belong to HR and are completed on the
  // employee profile. A disabled step here would be a permission request
  // waiting to happen.
  const serialised = JSON.stringify(ONBOARDING_STAGES).toLowerCase();
  for (const forbidden of ["statutory", "bank", "payment", "document", "salary", "payroll", "pf", "esi", "uan"]) {
    assert.ok(!serialised.includes(forbidden), `${forbidden} must not be a stage of this wizard`);
  }
});

/* ============================================== M1: create at stage 3 == */
test("THE EMPLOYEE IS CREATED AT THE END OF EMPLOYMENT (STAGE 3), NOT AFTER EDUCATION", () => {
  const { isCreateStage, CREATE_STAGE_KEY, stageIndex } = require("./hrOnboarding");
  assert.strictEqual(CREATE_STAGE_KEY, "employment");
  assert.ok(isCreateStage(stageIndex("employment")));
  assert.ok(!isCreateStage(stageIndex("education")));
  assert.ok(!isFinalStage(stageIndex("employment")), "the create stage is not the last stage");
});

test("stage 4 (education) requires nothing - a blank education is a finished onboarding", () => {
  assert.ok(stageIsComplete("education", {}, ctx()));
});

test("the education payload carries the three education columns and nothing else, or null", () => {
  const { buildEducationPayload, EDUCATION_FIELDS } = require("./hrOnboarding");
  assert.deepStrictEqual(EDUCATION_FIELDS, ["qualification", "additional_course", "previous_experience"]);
  assert.strictEqual(buildEducationPayload({}), null);
  assert.strictEqual(buildEducationPayload({ qualification: "  " }), null);
  assert.deepStrictEqual(
    buildEducationPayload({ qualification: " B.Com ", previous_experience: "2 yrs", salary: "1", pan_no: "x" }),
    { qualification: "B.Com", previous_experience: "2 yrs" }
  );
});

/* =================================================== M1: the initial shift */
test("the initial shift is the NEW master's id, sent as a number, and omitted when not chosen", () => {
  const { WORK_SHIFT_FIELD } = require("./hrOnboarding");
  assert.strictEqual(WORK_SHIFT_FIELD, "default_work_shift_id");
  const form = { ...personal, ...employment, default_work_shift_id: "4" };
  const payload = buildCreatePayload(form, null);
  assert.strictEqual(payload.default_work_shift_id, 4);
  assert.ok(!("shift_id" in payload), "the legacy shift_id is never sent");
  const none = buildCreatePayload({ ...personal, ...employment, default_work_shift_id: "" }, null);
  assert.ok(!("default_work_shift_id" in none));
});

test("a shift is optional at create, but a non-id value is refused on stage 3", () => {
  assert.ok(stageIsComplete("employment", { ...personal, ...employment }, ctx()));
  assert.ok(stageIsComplete("employment", { ...personal, ...employment, default_work_shift_id: "12" }, ctx()));
  const errors = validateStage("employment", { ...personal, ...employment, default_work_shift_id: "GS1" }, ctx());
  assert.ok(errors.default_work_shift_id);
});

/* ============================================================= 1 Aadhaar */
test("stage 1 asks for a DECISION, and Skip for now is one of the answers", () => {
  assert.ok(!stageIsComplete("aadhaar", {}, ctx()), "an untouched stage 1 is not complete");
  assert.ok(stageIsComplete("aadhaar", {}, ctx({ aadhaarSkipped: true })));
  assert.ok(stageIsComplete("aadhaar", {}, ctx({ verification: { verification_id: 9 } })));
});

test("skipping the Aadhaar never blocks the create", () => {
  // The whole flow has to remain completable with no Aadhaar at all: a new
  // hire whose Aadhaar is not to hand still needs to be paid.
  const form = { ...personal, ...employment };
  const skipped = ctx({ aadhaarSkipped: true });
  for (const key of ["aadhaar", "personal", "employment"]) {
    assert.deepStrictEqual(validateStage(key, form, skipped), {}, `${key} must pass without Aadhaar`);
  }
  const payload = buildCreatePayload(form, null);
  assert.ok(!("aadhaar_verification_id" in payload), "nothing Aadhaar is sent when it was skipped");
});

/* ============================================================ 2 Personal */
test("stage 2 applies the Personal Details mandatory rules, and judges nothing it did not ask for", () => {
  const errors = validateStage("personal", {}, ctx());
  assert.match(errors.employee_name, /required/i);
  assert.match(errors.father_name, /required/i);
  assert.match(errors.dob, /required/i);
  assert.match(errors.gender, /required/i);
  assert.match(errors.marital_status, /required/i);
  assert.match(errors.primary_contact_number, /required/i);
  assert.match(errors.alternate_contact_number, /required/i);
  assert.match(errors.permanent_address, /required/i);
  assert.match(errors.residential_address, /required/i);
  // Not its business: the manager has not reached the employment stage.
  assert.ok(!("date_of_joining" in errors));
  assert.ok(!("store_id" in errors));
  assert.deepStrictEqual(validateStage("personal", personal, ctx()), {});
});

test("blood group and email are NOT mandatory", () => {
  assert.deepStrictEqual(
    validateStage("personal", { ...personal, blood_group: "", email_id: "" }, ctx()),
    {}
  );
});

test("a married employee must give a spouse name and a marriage date; nobody else must", () => {
  const married = validateStage("personal", { ...personal, marital_status: "Married" }, ctx());
  assert.match(married.spouse_name, /required/i);
  assert.match(married.marriage_date, /required/i);
  assert.deepStrictEqual(
    validateStage(
      "personal",
      { ...personal, marital_status: "Married", spouse_name: "Anitha", marriage_date: "2019-05-02" },
      ctx()
    ),
    {}
  );
  for (const status of ["Single", "Widowed", "Divorced"]) {
    assert.deepStrictEqual(validateStage("personal", { ...personal, marital_status: status }, ctx()), {}, status);
  }
});

test("a field that is filled in is still judged on its FORMAT, not only its presence", () => {
  const bad = validateStage(
    "personal",
    { ...personal, primary_contact_number: "98765", dob: "2030-01-01", email_id: "nope" },
    ctx()
  );
  assert.match(bad.primary_contact_number, /10 digits/);
  assert.match(bad.dob, /future/);
  assert.match(bad.email_id, /email/);
});

test("a mobile typed with spaces or dashes is judged on its digits", () => {
  const errors = validateStage(
    "personal",
    { ...personal, primary_contact_number: "98765 43210" },
    ctx()
  );
  assert.deepStrictEqual(errors, {});
});

/* ========================================================== 3 Employment */
test("stage 3 requires exactly what the backend requires of a create", () => {
  const errors = validateStage("employment", {}, ctx());
  assert.deepStrictEqual(Object.keys(errors).sort(), [
    "date_of_joining",
    "department_id",
    "designation_id",
    "store_id",
  ]);
  assert.deepStrictEqual(validateStage("employment", employment, ctx()), {});
});

test("a future joining date is refused here rather than by a 422 afterwards", () => {
  // C2 applies a transition immediately and has no scheduler, so the backend
  // refuses it. Saying so on the form is the same rule, said earlier.
  const errors = validateStage("employment", { ...employment, date_of_joining: "2026-12-01" }, ctx());
  assert.match(errors.date_of_joining, /future/);
  // Today itself is fine.
  assert.deepStrictEqual(
    validateStage("employment", { ...employment, date_of_joining: TODAY }, ctx()),
    {}
  );
});

/* ============================================================== the create */
test("THE CREATE NEVER SENDS AN EMPLOYEE_ID - the database allocates it", () => {
  const payload = buildCreatePayload({ ...personal, ...employment, employee_id: 999 }, null);
  assert.ok(!("employee_id" in payload), "a client-supplied employee_id is refused by the backend");
});

test("the create carries nothing sensitive - a manager is never asked for any of it", () => {
  const payload = buildCreatePayload(
    {
      ...personal,
      ...employment,
      // None of these is on the wizard; if one ever appeared on the form it
      // must still not reach the request.
      salary: 25000,
      account_no: "123456789012",
      ifsc: "HDFC0001234",
      pan_no: "ABCDE1234F",
      uan: "100200300400",
      pf_applicable: 1,
      esi_applicable: 1,
    },
    null
  );
  for (const forbidden of [
    "salary",
    "account_no",
    "ifsc",
    "bank_name",
    "pan_no",
    "uan",
    "pf",
    "pf_applicable",
    "pf_number",
    "esi",
    "esi_applicable",
    "esi_number",
    "aadhaar_number",
  ]) {
    assert.ok(!(forbidden in payload), `${forbidden} must never be sent by this screen`);
  }
});

test("a verified Aadhaar is attached at create time, by its opaque id alone", () => {
  const payload = buildCreatePayload(
    { ...personal, ...employment },
    { verification_id: 42, aadhaar_last4: "8899" }
  );
  assert.strictEqual(payload.aadhaar_verification_id, 42);
  assert.ok(!("aadhaar_last4" in payload));
  // Not even the last four digits travel with the create: the opaque id is
  // the whole of what the backend needs to attach the verified identity.
  assert.ok(!JSON.stringify(payload).includes("8899"));
});

test("the ids go as numbers and a blank optional field is omitted, not blanked", () => {
  const payload = buildCreatePayload(
    { ...personal, ...employment, father_name: "   ", gender: "", blood_group: "B+" },
    null
  );
  assert.strictEqual(payload.store_id, 4);
  assert.strictEqual(payload.designation_id, 7);
  assert.strictEqual(payload.department_id, 2);
  assert.ok(!("father_name" in payload), "a blank field stays NULL rather than becoming ''");
  assert.ok(!("gender" in payload));
  assert.strictEqual(payload.blood_group, "B+");
  assert.strictEqual(payload.employee_name, "Ramesh Kumar");
});

test("the name is trimmed, and the required pair is always present", () => {
  const payload = buildCreatePayload({ ...personal, employee_name: "  Asha  ", ...employment }, null);
  assert.strictEqual(payload.employee_name, "Asha");
  assert.strictEqual(payload.date_of_joining, "2026-09-01");
});

/* ================================================== verified demographics */
test("the verified name and DOB fill only what was left blank", () => {
  const decision = { suggested_employee_fields: { employee_name: "RAMESH KUMAR", dob: "1994-02-11" } };
  const blank = applyVerifiedDemographics({ employee_name: "", dob: "" }, decision);
  assert.strictEqual(blank.employee_name, "RAMESH KUMAR");
  assert.strictEqual(blank.dob, "1994-02-11");

  const typed = applyVerifiedDemographics({ employee_name: "Ramesh K", dob: "1994-02-11" }, decision);
  assert.strictEqual(typed.employee_name, "Ramesh K", "what the manager typed is never overwritten");
});

/* ============================================================ after stage 3 */
test("the success state leads with the Employee ID and says HR is not finished", () => {
  const summary = createdSummary({ code: 200, employee_id: 631, aadhaar_status: "PENDING" });
  assert.strictEqual(summary.employeeId, 631);
  assert.match(summary.title, /631/);
  assert.match(summary.title, /HR onboarding pending/i);
  assert.match(summary.aadhaarNote, /pending/i);
  assert.match(summary.hrNote, /payment, statutory, payroll and document/i);

  const verified = createdSummary({ employee_id: 632, aadhaar_status: "VERIFIED" });
  assert.match(verified.aadhaarNote, /verified/i);
  assert.strictEqual(createdSummary(null), null);
  assert.strictEqual(createdSummary({ code: 422, msg: "no" }), null);
});

/* ================================================= the HR-pending badge == */
test("NOT KNOWN IS NOT THE SAME AS COMPLETE", () => {
  // A summary that has not loaded, or a server that cannot derive the flag,
  // must show nothing rather than claim the record is finished.
  assert.strictEqual(hrOnboardingBadge(undefined), null);
  assert.strictEqual(hrOnboardingBadge(null), null);
  assert.strictEqual(hrOnboardingBadge(true).label, "HR pending");
  assert.strictEqual(hrOnboardingBadge(false).label, "Complete");
  assert.strictEqual(hrOnboardingBadge(true).colorScheme, "orange");
});

test("the outstanding sections read as a sentence, and an empty list says nothing", () => {
  assert.strictEqual(hrOnboardingMissingLabel([]), "");
  assert.match(hrOnboardingMissingLabel(["bank"]), /payment details/);
  assert.match(hrOnboardingMissingLabel(["statutory", "bank"]), /statutory details and payment details/);
  assert.strictEqual(hrOnboardingMissingLabel(undefined), "");
});

test("AN UNVERIFIED AADHAAR IS SOMETHING HR GETS VERIFIED, NOT SOMETHING IT RECORDS", () => {
  // A different verb from the other two, because it is a different task:
  // statutory and bank details are typed in, an Aadhaar means going back to
  // the employee. "Record the Aadhaar verification" would describe the wrong
  // job to whoever is chasing it.
  assert.match(hrOnboardingMissingLabel(["aadhaar"]), /get the Aadhaar verified/);
  assert.ok(!/record the Aadhaar/.test(hrOnboardingMissingLabel(["aadhaar"])));

  // Combined, each reason is said once, and the Aadhaar leads - it is the
  // order the backend sends them in.
  const both = hrOnboardingMissingLabel(["aadhaar", "statutory"]);
  assert.match(both, /get the Aadhaar verified/);
  assert.match(both, /record the statutory details/);
  assert.ok(both.indexOf("Aadhaar") < both.indexOf("statutory"));

  const all = hrOnboardingMissingLabel(["aadhaar", "statutory", "bank"]);
  assert.match(all, /get the Aadhaar verified/);
  assert.match(all, /statutory details and payment details/);
  assert.strictEqual((all.match(/Aadhaar/g) || []).length, 1, "no reason is said twice");
});
