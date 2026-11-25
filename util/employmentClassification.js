/**
 * EMPLOYMENT TYPE AND GRADE — the two fixed dropdowns on Employment Details.
 *
 * MIRRORS `utils/employment_classification.js` IN THE BACKEND, which is where
 * the sets are defined, where the API validates them and what the ENUM columns
 * carry. Keeping the two lists identical is what makes every option offered
 * here a value the server will accept; a test asserts they agree.
 *
 * THERE IS NO MASTER SCREEN FOR EITHER, DELIBERATELY. No table to maintain, no
 * CRUD page, no fetch - the sets are fixed by the business and the controls are
 * built from these constants. Nothing anywhere accepts free text for them.
 *
 * THEY CLASSIFY, THEY DO NOT DECIDE. No screen reads either value to enable a
 * control, change a calculation, or show or hide anything. They are recorded
 * and displayed, and that is all.
 *
 * "NOT RECORDED" IS A REAL ANSWER. Most existing employees have neither, the
 * columns are nullable, and both dropdowns can be left blank - at create and
 * when editing. A blank is sent as `null`, never as an empty string, which is
 * not a member of either ENUM.
 */

/** How somebody is engaged. */
const EMPLOYMENT_TYPES = ["Permanent", "Contract"];

/** The internal band. */
const GRADES = ["A", "B", "C", "D", "E"];

/** `EditField` / `Select` options — the value is what is stored, verbatim. */
const EMPLOYMENT_TYPE_OPTIONS = EMPLOYMENT_TYPES.map((v) => ({ value: v, label: v }));
const GRADE_OPTIONS = GRADES.map((v) => ({ value: v, label: `Grade ${v}` }));

/** The two column names, so no screen spells them a second time. */
const CLASSIFICATION_FIELDS = ["employment_type", "grade"];

/**
 * What to SEND for one of them: an exact member, or `null` for "not recorded".
 * Anything else is dropped rather than sent, because the only way a value that
 * is not on the list can reach here is a bug, and a 422 is a worse way to find
 * out than simply not sending it.
 */
function classificationValueToSend(allowed, value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const text = String(value).trim();
  return allowed.includes(text) ? text : null;
}

const employmentTypeToSend = (value) =>
  classificationValueToSend(EMPLOYMENT_TYPES, value);
const gradeToSend = (value) => classificationValueToSend(GRADES, value);

module.exports = {
  EMPLOYMENT_TYPES,
  GRADES,
  EMPLOYMENT_TYPE_OPTIONS,
  GRADE_OPTIONS,
  CLASSIFICATION_FIELDS,
  classificationValueToSend,
  employmentTypeToSend,
  gradeToSend,
};
