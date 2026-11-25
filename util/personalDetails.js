/**
 * Employee Master — Personal Details, and what must be filled in.
 *
 * A DELIBERATE TRANSCRIPTION of `utils/personal_details.js` on the server,
 * field for field and rule for rule. The two cannot import one another - one
 * runs in a browser bundle and the other in Node behind the API - so what
 * keeps them honest is that each side's own test spells the table out
 * literally (`util/personalDetails.test.js` here,
 * `utils/personal_details.test.js` there). Changing the rule on one side
 * fails that side's suite until the table is changed too, and the table is
 * the thing a reviewer compares. Keep the two in step.
 *
 * THIS IS NOT THE BOUNDARY. The server re-checks every one of these rules on
 * every write; what happens here is the courtesy of saying so before the
 * round trip, and of pointing at the field rather than at a sentence.
 *
 * WHEN IT APPLIES. When the Personal Details section is being created or
 * SAVED - never on reading an employee and never on editing another section.
 * A great many historical profiles are missing a father's name or a date of
 * birth, and they stay viewable, payable and editable elsewhere.
 */

/** Every field the Personal Details section owns. */
const PERSONAL_DETAIL_FIELDS = [
  "employee_name",
  "father_name",
  "dob",
  "gender",
  "blood_group",
  "marital_status",
  "marriage_date",
  "spouse_name",
  "primary_contact_number",
  "alternate_contact_number",
  "email_id",
  "permanent_address",
  "residential_address",
];

/** Always mandatory, with the wording the screen shows. */
const ALWAYS_REQUIRED = [
  ["employee_name", "Employee Name"],
  ["father_name", "Father's Name"],
  ["dob", "Date of Birth"],
  ["gender", "Gender"],
  ["marital_status", "Marital Status"],
  ["primary_contact_number", "Mobile"],
  ["alternate_contact_number", "Alternate / Emergency Contact"],
  ["permanent_address", "Permanent Address"],
  ["residential_address", "Residential Address"],
];

/** Mandatory only when Marital Status is Married. */
const MARRIED_REQUIRED = [
  ["spouse_name", "Spouse Name"],
  ["marriage_date", "Marriage Date"],
];

/** Never mandatory. Named, so the rule is readable rather than inferred. */
const NEVER_REQUIRED = ["blood_group", "email_id"];

const isBlank = (value) =>
  value === null || value === undefined || String(value).trim() === "";

const isMarried = (status) => String(status || "").trim().toLowerCase() === "married";

/** Is this field mandatory for a row in this state? Drives the * on the label. */
function isRequiredField(field, form = {}) {
  if (ALWAYS_REQUIRED.some(([key]) => key === field)) return true;
  if (MARRIED_REQUIRED.some(([key]) => key === field)) return isMarried(form.marital_status);
  return false;
}

/**
 * `{field: message}` for everything still missing, empty when complete.
 *
 * Keyed by field rather than returned as a list, because the form marks the
 * control that is wrong; the server returns the same rule as one sentence,
 * which is what a caller that is not this form needs.
 */
function validatePersonalDetails(form = {}) {
  const errors = {};
  ALWAYS_REQUIRED.forEach(([field, label]) => {
    if (isBlank(form[field])) errors[field] = `${label} is required`;
  });
  if (isMarried(form.marital_status)) {
    MARRIED_REQUIRED.forEach(([field, label]) => {
      if (isBlank(form[field])) errors[field] = `${label} is required for a married employee`;
    });
  }
  return errors;
}

/** One sentence naming everything missing, for a toast. */
function summarizeErrors(errors) {
  const keys = Object.keys(errors || {});
  if (keys.length === 0) return null;
  const labels = keys.map((k) => {
    const row =
      ALWAYS_REQUIRED.find(([key]) => key === k) || MARRIED_REQUIRED.find(([key]) => key === k);
    return row ? row[1] : k;
  });
  return `Personal Details is incomplete: ${labels.join(", ")} ${
    labels.length === 1 ? "is" : "are"
  } required`;
}

module.exports = {
  PERSONAL_DETAIL_FIELDS,
  ALWAYS_REQUIRED,
  MARRIED_REQUIRED,
  NEVER_REQUIRED,
  isBlank,
  isMarried,
  isRequiredField,
  validatePersonalDetails,
  summarizeErrors,
};
