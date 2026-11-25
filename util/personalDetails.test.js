/**
 * Personal Details mandatory rules — the browser's copy.
 *
 *   node --test util/personalDetails.test.js
 *
 * THE TABLE BELOW IS THE CONTRACT WITH THE SERVER. The same rows are spelled
 * out literally in `utils/personal_details.test.js` in the backend repo.
 * Neither side can import the other, so what keeps them in step is that
 * changing the rule here fails this suite until this table is changed too,
 * and the table is the thing a reviewer compares against the other one.
 *
 * The negative rows matter most: Blood Group and Email are optional, and
 * Spouse Name and Marriage Date are optional for anybody who is not married.
 */
const test = require("node:test");
const { describe, it } = test;
const assert = require("node:assert/strict");
const v = require("./personalDetails");

/** field -> when it is mandatory. Compare with the backend's copy. */
const SHARED_REQUIREMENT_TABLE = [
  ["employee_name", "always"],
  ["father_name", "always"],
  ["dob", "always"],
  ["gender", "always"],
  ["marital_status", "always"],
  ["primary_contact_number", "always"],
  ["alternate_contact_number", "always"],
  ["permanent_address", "always"],
  ["residential_address", "always"],
  ["spouse_name", "married"],
  ["marriage_date", "married"],
  ["blood_group", "never"],
  ["email_id", "never"],
];

const complete = () => ({
  employee_name: "Anitha R",
  father_name: "Ramesh",
  dob: "1994-02-11",
  gender: "F",
  marital_status: "Single",
  primary_contact_number: "9876543210",
  alternate_contact_number: "9876500000",
  permanent_address: "12 Main Street",
  residential_address: "12 Main Street",
});

describe("the shared requirement table", () => {
  it("covers every field the section owns, and nothing else", () => {
    assert.deepEqual(
      SHARED_REQUIREMENT_TABLE.map(([f]) => f).sort(),
      [...v.PERSONAL_DETAIL_FIELDS].sort()
    );
  });

  it("matches isRequiredField, for a single and for a married employee", () => {
    for (const [field, when] of SHARED_REQUIREMENT_TABLE) {
      assert.equal(
        v.isRequiredField(field, { marital_status: "Single" }),
        when === "always",
        `${field} when single`
      );
      assert.equal(
        v.isRequiredField(field, { marital_status: "Married" }),
        when === "always" || when === "married",
        `${field} when married`
      );
    }
  });
});

describe("validatePersonalDetails", () => {
  it("passes a complete unmarried record", () => {
    assert.deepEqual(v.validatePersonalDetails(complete()), {});
  });

  it("names every always-mandatory field that is blank, keyed by field", () => {
    const errors = v.validatePersonalDetails({});
    for (const [field, when] of SHARED_REQUIREMENT_TABLE) {
      if (when === "always") assert.ok(errors[field], `${field} should be flagged`);
      else assert.ok(!errors[field], `${field} should not be flagged`);
    }
  });

  it("treats whitespace as blank", () => {
    assert.ok(v.validatePersonalDetails({ ...complete(), father_name: "  " }).father_name);
  });

  it("never flags blood group or email", () => {
    const errors = v.validatePersonalDetails({ ...complete(), blood_group: "", email_id: "" });
    assert.deepEqual(errors, {});
  });

  it("requires the married pair only when married, however it is cased", () => {
    for (const status of ["Married", "married", " MARRIED "]) {
      const errors = v.validatePersonalDetails({ ...complete(), marital_status: status });
      assert.ok(errors.spouse_name, status);
      assert.ok(errors.marriage_date, status);
    }
    for (const status of ["Single", "Widowed", "Divorced"]) {
      assert.deepEqual(v.validatePersonalDetails({ ...complete(), marital_status: status }), {}, status);
    }
  });
});

describe("summarizeErrors", () => {
  it("names the missing fields in one sentence", () => {
    const msg = v.summarizeErrors(v.validatePersonalDetails({ ...complete(), dob: "" }));
    assert.match(msg, /Date of Birth/);
    assert.match(msg, /incomplete/i);
  });

  it("is null when nothing is missing", () => {
    assert.equal(v.summarizeErrors({}), null);
  });
});
