/**
 * EMPLOYMENT TYPE AND GRADE on the Employee Master, from the screens' side.
 *
 *   node --test util/employmentClassification.test.js
 *
 * What is pinned here: the two sets are the backend's sets, both fields are
 * saved through the EXISTING employee edit (no new permission, no second
 * endpoint), a blank is null rather than "", an existing employee with neither
 * is untouched by a save of anything else, and nothing free-text can be
 * offered for either.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  EMPLOYMENT_TYPES,
  GRADES,
  EMPLOYMENT_TYPE_OPTIONS,
  GRADE_OPTIONS,
  employmentTypeToSend,
  gradeToSend,
} = require("./employmentClassification");
const { HR_EDITABLE_FIELDS, buildHrPatch, changesPlacement } = require("./hrProfile");
const { buildCreatePayload, validateStage } = require("./hrOnboarding");

/** The backend's own definition, when this checkout has it beside us. */
const BACKEND = path.join(__dirname, "../../dailyneeds-store-backend/utils/employment_classification.js");
const backendAvailable = fs.existsSync(BACKEND);

/* --------------------------------------------------------------- the sets */

test("the two fixed lists are exactly what the business named", () => {
  assert.deepEqual(EMPLOYMENT_TYPES, ["Permanent", "Contract"]);
  assert.deepEqual(GRADES, ["A", "B", "C", "D", "E"]);
});

test("they are the SAME lists the backend validates against", { skip: !backendAvailable }, () => {
  const backend = require(BACKEND);
  assert.deepEqual(EMPLOYMENT_TYPES, backend.EMPLOYMENT_TYPES);
  assert.deepEqual(GRADES, backend.GRADES);
});

test("every option offered is a value the API accepts - no free text anywhere", () => {
  for (const o of EMPLOYMENT_TYPE_OPTIONS) assert.ok(EMPLOYMENT_TYPES.includes(o.value));
  for (const o of GRADE_OPTIONS) assert.ok(GRADES.includes(o.value));
  assert.equal(EMPLOYMENT_TYPE_OPTIONS.length, 2);
  assert.equal(GRADE_OPTIONS.length, 5);
});

test("a value that is not on the list is never sent", () => {
  assert.equal(employmentTypeToSend("Temporary"), null);
  assert.equal(employmentTypeToSend("permanent"), null, "the stored value is exact, case and all");
  assert.equal(gradeToSend("F"), null);
  assert.equal(gradeToSend("Grade A"), null, "the LABEL is not the value");
  assert.equal(employmentTypeToSend("Contract"), "Contract");
  assert.equal(gradeToSend("E"), "E");
});

/* ------------------------------------------------------------------- edit */

test("both are ordinary editable fields, saved through the existing employee edit", () => {
  assert.ok(HR_EDITABLE_FIELDS.includes("employment_type"));
  assert.ok(HR_EDITABLE_FIELDS.includes("grade"));
});

test("the edit sends only what changed", () => {
  const employee = { employment_type: "Permanent", grade: "A", employee_name: "A" };
  assert.deepEqual(buildHrPatch(employee, { employment_type: "Permanent", grade: "A" }), {});
  assert.deepEqual(buildHrPatch(employee, { grade: "C" }), { grade: "C" });
});

test("an emptied dropdown clears the field to NULL, never to an empty string", () => {
  const patch = buildHrPatch({ employment_type: "Contract", grade: "B" }, { employment_type: "", grade: "" });
  assert.deepEqual(patch, { employment_type: null, grade: null });
  assert.notEqual(patch.grade, "", "'' is not a member of either ENUM");
});

test("an existing employee with neither is untouched by a save of another field", () => {
  const legacy = { employee_id: 12, employee_name: "Old", employment_type: null, grade: null };
  const patch = buildHrPatch(legacy, { employee_name: "Older" });
  assert.deepEqual(patch, { employee_name: "Older" });
  assert.ok(!("employment_type" in patch));
  assert.ok(!("grade" in patch));
});

test("neither field re-issues the employee's authorisation", () => {
  // `changesPlacement` is what warns about a sign-out. Classification is not
  // a placement change and must not be treated as one.
  assert.equal(changesPlacement({ employment_type: "Contract", grade: "D" }), false);
  assert.equal(changesPlacement({ store_id: 3 }), true);
});

/* ----------------------------------------------------------------- create */

test("Add Employee sends both when they are chosen", () => {
  const payload = buildCreatePayload({
    employee_name: "A",
    date_of_joining: "2026-01-05",
    store_id: "1",
    designation_id: "2",
    department_id: "3",
    employment_type: "Permanent",
    grade: "B",
  });
  assert.equal(payload.employment_type, "Permanent");
  assert.equal(payload.grade, "B");
});

test("Add Employee omits them when they are left blank - both are optional", () => {
  const payload = buildCreatePayload({
    employee_name: "A",
    date_of_joining: "2026-01-05",
    store_id: "1",
    employment_type: "",
    grade: "",
  });
  assert.ok(!("employment_type" in payload), "an omitted field stays NULL, not ''");
  assert.ok(!("grade" in payload));
});

test("the Employment stage is complete without them, and refuses a value off the list", () => {
  const stage = {
    date_of_joining: "2026-01-05",
    store_id: "1",
    designation_id: "2",
    department_id: "3",
  };
  assert.deepEqual(validateStage("employment", stage, {}), {});
  assert.deepEqual(validateStage("employment", { ...stage, employment_type: "Permanent", grade: "A" }, {}), {});
  assert.ok(validateStage("employment", { ...stage, employment_type: "Intern" }, {}).employment_type);
  assert.ok(validateStage("employment", { ...stage, grade: "Z" }, {}).grade);
});

/* ------------------------------------------------------------ the screens */

const employmentSection = fs.readFileSync(
  path.join(__dirname, "../components/hr/profile/EmploymentSection.jsx"),
  "utf8"
);

test("Employment Details shows both fields, and the layout stays as it is", () => {
  assert.match(employmentSection, /label="Employment Type"/);
  assert.match(employmentSection, /label="Grade"/);
  // The read-only pair is in the documented order:
  //   Branch / Outlet | Department, Designation | Employment Type, Grade | Shift
  const readOnly = employmentSection.slice(employmentSection.lastIndexOf('<Field label="Branch / Outlet"'));
  const order = [...readOnly.matchAll(/<Field label="([^"]+)"/g)].map((m) => m[1]).slice(0, 6);
  assert.deepEqual(order, [
    "Branch / Outlet",
    "Department",
    "Designation",
    "Employment Type",
    "Grade",
    "Shift",
  ]);
});

test("the dropdowns are built from the shared lists, never typed into", () => {
  assert.match(employmentSection, /EMPLOYMENT_TYPE_OPTIONS/);
  assert.match(employmentSection, /GRADE_OPTIONS/);
  // `EditField` renders a <Select> when it is given options and an <Input>
  // otherwise, so passing options IS the guarantee that there is no free text.
  assert.match(employmentSection, /name="employment_type"[\s\S]{0,200}options=\{EMPLOYMENT_TYPE_OPTIONS\}/);
  assert.match(employmentSection, /name="grade"[\s\S]{0,200}options=\{GRADE_OPTIONS\}/);
});

test("no master screen, table or endpoint was introduced for either", () => {
  const pages = path.join(__dirname, "../pages");
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/employment-type|employmenttype|grades?\.(js|jsx)$/i.test(entry.name)) found.push(full);
    }
  };
  walk(pages);
  assert.deepEqual(found, [], "these are fixed dropdowns; they have no master");
  const helper = fs.readFileSync(path.join(__dirname, "../helper/hr.js"), "utf8");
  assert.ok(
    !/employment.type|\/grade/i.test(helper),
    "both ride the existing employee create and edit calls"
  );
});
