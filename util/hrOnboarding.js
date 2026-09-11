/**
 * New Employee onboarding — the FOUR stages a STORE MANAGER completes, and
 * the rules each one is judged by.
 *
 * WHY THIS IS A SEPARATE MODULE. There is no React test runner in this repo,
 * so logic left inside the screen is logic that cannot be tested. Everything
 * here is a pure function over the form, which is what lets
 * `hrOnboarding.test.js` pin the rules that would be real defects if they
 * drifted: what the create sends to the backend, what each stage is allowed
 * to insist on, and at which stage the employee is created.
 *
 * THE FLOW, and why it is in this order (M1 - it is the same order the
 * profile shows an existing employee in; there is ONE employee master
 * information architecture, not one for Add and another for Edit):
 *
 *   1  Aadhaar      identity FIRST, because the cheapest moment to discover
 *                   that somebody already has an employee ID is before a
 *                   second one exists. The Aadhaar OTP flow already answers
 *                   "already employed" and "should rejoin" - see
 *                   `aadhaarOutcome` in util/hrStatus.js - so asking here
 *                   turns a permanent duplicate into a redirect.
 *   2  Personal     who they are.
 *   3  Employment   where they work, and on which shift - and the ONLY point
 *                   at which an employee record is created and an Employee
 *                   ID allocated. THE ID IS CREATED HERE, NOT AFTER STAGE 4.
 *   4  Education    completed against the Employee ID that now exists, by the
 *                   same `employee_create` holder, through the onboarding
 *                   education endpoint (not the profile's `employee_edit`).
 *
 * WHAT A MANAGER NEVER SEES: Payment Details, Statutory Details, Payroll and
 * Documents. Those are sections 5-8 of the employee master, each behind its
 * own designation right, completed on the employee profile - and they are not
 * in this file even as a disabled future step: a step somebody cannot take is
 * a step they will ask to be given.
 *
 * SALARY IS NOT PART OF THE EMPLOYEE MASTER and appears nowhere here.
 */

/** The manager's four stages, in order. Nothing else is a stage. */
const ONBOARDING_STAGES = [
  {
    key: "aadhaar",
    label: "Aadhaar",
    title: "Aadhaar Verification",
    blurb:
      "Verify Aadhaar to identify existing/rejoining employees and avoid duplicate Employee IDs.",
  },
  {
    key: "personal",
    label: "Personal",
    title: "Personal details",
    blurb: "Who the employee is. Only a name is required to go on.",
  },
  {
    key: "employment",
    label: "Employment",
    title: "Employment details",
    blurb:
      "Where they work and their shift. Finishing this stage creates the employee and allocates the Employee ID.",
  },
  {
    key: "education",
    label: "Education",
    title: "Education & Experience",
    blurb: "Qualification and previous experience, recorded against the new Employee ID. Optional.",
  },
];

const STAGE_KEYS = ONBOARDING_STAGES.map((s) => s.key);

/** The stage whose completion creates the employee. NOT the last one. */
const CREATE_STAGE_KEY = "employment";

const stageAt = (index) => ONBOARDING_STAGES[index] || null;
const stageIndex = (key) => STAGE_KEYS.indexOf(key);
const isFinalStage = (index) => index === ONBOARDING_STAGES.length - 1;
/** True for the stage that creates the employee and allocates the ID. */
const isCreateStage = (index) => index === stageIndex(CREATE_STAGE_KEY);

/* ------------------------------------------------------------ validation */

const text = (value) => String(value === undefined || value === null ? "" : value).trim();
const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(text(value));

/**
 * Today, as the browser's own calendar day. Used ONLY to reject a future
 * date, never as a value: the backend refuses a future joining date because
 * C2 applies a transition immediately and has no scheduler, and a manager
 * should hear that here rather than as a 422 after filling in three stages.
 */
function todayIso(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Digits only, so a number typed with spaces or dashes is judged fairly. */
const digitsOf = (value) => text(value).replace(/\D/g, "");

/**
 * What is wrong with ONE stage, as `{ field: message }`. An empty object
 * means the stage may be left.
 *
 * EACH STAGE IS JUDGED ON ITS OWN FIELDS AND NOTHING ELSE. Stage 2 does not
 * complain about a missing joining date, because the manager has not been
 * asked for one yet, and a form that rejects an answer it never requested is
 * how people learn to distrust the whole screen.
 */
function validateStage(key, form = {}, context = {}) {
  const errors = {};
  const today = context.today || todayIso();

  if (key === "aadhaar") {
    // Aadhaar is NOT required to create an employee, and this does not make
    // it so: what stage 1 asks for is a DECISION - verified, or explicitly
    // skipped - so that skipping is a choice somebody made rather than a
    // question that scrolled past. "Aadhaar Pending" is unchanged, and holds
    // up nothing downstream.
    if (!context.verification && !context.aadhaarSkipped) {
      errors.aadhaar = "Verify the Aadhaar, or choose Skip for now to carry on without it.";
    }
    return errors;
  }

  if (key === "personal") {
    if (!text(form.employee_name)) errors.employee_name = "A name is required.";
    const mobile = digitsOf(form.primary_contact_number);
    if (mobile && (mobile.length < 10 || mobile.length > 15)) {
      errors.primary_contact_number = "A mobile number is 10 digits.";
    }
    if (text(form.dob)) {
      if (!isIsoDate(form.dob)) errors.dob = "Use a full date.";
      else if (text(form.dob) > today) errors.dob = "A date of birth cannot be in the future.";
    }
    if (text(form.email_id) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(form.email_id))) {
      errors.email_id = "That does not look like an email address.";
    }
    if (text(form.marriage_date) && !isIsoDate(form.marriage_date)) {
      errors.marriage_date = "Use a full date.";
    }
    return errors;
  }

  if (key === "employment") {
    if (!text(form.date_of_joining)) errors.date_of_joining = "A joining date is required.";
    else if (!isIsoDate(form.date_of_joining)) errors.date_of_joining = "Use a full date.";
    else if (text(form.date_of_joining) > today) {
      errors.date_of_joining = "A joining date cannot be in the future.";
    }
    // All three are required by POST /hr/employee itself. Asking here is not
    // a new rule - it is the same rule, said before the request rather than
    // after it.
    if (!text(form.store_id)) errors.store_id = "Choose the outlet they work at.";
    if (!text(form.designation_id)) errors.designation_id = "Choose a designation.";
    if (!text(form.department_id)) errors.department_id = "Choose a department.";
    // The shift is OPTIONAL at create - a new hire can be put on a shift from
    // Employee Shift Assignment later - but when one is chosen it must be a
    // real id from the work shift options.
    if (text(form.default_work_shift_id) && !/^\d+$/.test(text(form.default_work_shift_id))) {
      errors.default_work_shift_id = "Choose a shift from the list.";
    }
    return errors;
  }

  if (key === "education") {
    // Nothing is required. Education is recorded when it is known, and a
    // blank stage 4 is a finished onboarding, not a failed one.
    return errors;
  }

  return errors;
}

const stageIsComplete = (key, form, context) =>
  Object.keys(validateStage(key, form, context)).length === 0;

/* --------------------------------------------------------------- payload */

/**
 * Personal fields the create endpoint accepts. Its Joi schema is
 * `.unknown(false)`, so a key it has not declared is a 422 rather than a
 * quietly ignored field - which is why this is an allowlist copied from the
 * schema and not "everything on the form".
 */
const PERSONAL_FIELDS = [
  "primary_contact_number",
  "alternate_contact_number",
  "father_name",
  "dob",
  "gender",
  "marital_status",
  "marriage_date",
  "spouse_name",
  "permanent_address",
  "residential_address",
  "email_id",
  "blood_group",
];

/** Employment fields that are ids, and are sent as numbers. */
const EMPLOYMENT_IDS = ["store_id", "designation_id", "department_id"];

/**
 * The NEW work shift master's id, sent as a number when chosen and omitted
 * when not. Never `shift_id`: that is the legacy `shift_master` column, which
 * this screen does not read or write.
 */
const WORK_SHIFT_FIELD = "default_work_shift_id";

/** The three education columns, stage 4's whole vocabulary. */
const EDUCATION_FIELDS = ["qualification", "additional_course", "previous_experience"];

/**
 * The body of POST /hr/employee.
 *
 * `employee_id` IS DELIBERATELY ABSENT AND MUST STAY ABSENT. The database
 * allocates it with AUTO_INCREMENT; a client-supplied id is what would make
 * identity guessable, and the backend refuses one outright.
 *
 * Nothing sensitive is here either - no salary, no bank, no PF, ESI, UAN or
 * PAN. A manager is not asked for them, so there is nothing to send, and B3
 * would refuse the request if there were.
 *
 * Blank optional fields are omitted rather than sent as "", so a field the
 * manager left alone stays NULL instead of becoming an empty string that
 * later reads as "recorded".
 */
function buildCreatePayload(form = {}, verification = null) {
  const payload = {
    employee_name: text(form.employee_name),
    date_of_joining: text(form.date_of_joining),
  };
  for (const field of PERSONAL_FIELDS) {
    const value = text(form[field]);
    if (value) payload[field] = value;
  }
  for (const field of EMPLOYMENT_IDS) {
    const value = text(form[field]);
    if (value) payload[field] = Number(value);
  }
  const shift = text(form[WORK_SHIFT_FIELD]);
  if (shift) payload[WORK_SHIFT_FIELD] = Number(shift);
  if (verification && verification.verification_id) {
    payload.aadhaar_verification_id = verification.verification_id;
  }
  return payload;
}

/**
 * The body of POST /hr/employee/:id/onboarding-education, or null when the
 * manager typed nothing - in which case there is nothing to send and stage 4
 * simply finishes. Only the three education columns, ever.
 */
function buildEducationPayload(form = {}) {
  const payload = {};
  for (const field of EDUCATION_FIELDS) {
    const value = text(form[field]);
    if (value) payload[field] = value;
  }
  return Object.keys(payload).length === 0 ? null : payload;
}

/**
 * What the Aadhaar verification is allowed to fill in on the manager's
 * behalf: the verified name and date of birth, and only where the manager has
 * left the field blank. Typed-in values are never overwritten - the manager
 * is looking at the person.
 */
function applyVerifiedDemographics(form = {}, decision = null) {
  const suggested = (decision && decision.suggested_employee_fields) || {};
  const next = { ...form };
  for (const field of ["employee_name", "dob"]) {
    if (!text(next[field]) && text(suggested[field])) next[field] = suggested[field];
  }
  return next;
}

/* ------------------------------------------------------------ after Stage 3 */

/**
 * What the success screen says. The Employee ID is the point of it: it is
 * permanent, it is what every other screen refers to this person by, and the
 * manager needs to be able to read it out.
 *
 * IT ALSO SAYS WHAT IS NOT DONE. The record is operational immediately -
 * attendance, shifts and the profile all work - but the statutory and bank
 * sections belong to HR and are still outstanding, so the manager is told
 * that plainly instead of being left to assume onboarding is finished.
 */
function createdSummary(result) {
  if (!result || !result.employee_id) return null;
  const verified = String(result.aadhaar_status).toUpperCase() === "VERIFIED";
  return {
    employeeId: result.employee_id,
    aadhaarVerified: verified,
    title: `Employee ${result.employee_id} created — HR onboarding pending`,
    aadhaarNote: verified
      ? "Aadhaar verified and attached."
      : "Aadhaar is pending. It can be verified later from the employee's profile, and holds nothing up.",
    hrNote:
      "Payment, statutory, payroll and document details are completed on this same employee record by whoever holds those rights. Nothing further is needed from the store.",
  };
}

/**
 * The list badge for an employee HR has not finished onboarding.
 *
 * `undefined` is not a state: a summary that has not loaded, or a server that
 * cannot derive the flag, must read as nothing at all rather than as "done".
 */
function hrOnboardingBadge(pending) {
  if (pending === undefined || pending === null) return null;
  return pending
    ? { label: "HR pending", colorScheme: "orange" }
    : { label: "Complete", colorScheme: "green" };
}

/** The outstanding sections, in words, for a tooltip or a profile line. */
function hrOnboardingMissingLabel(missing) {
  const names = { statutory: "statutory details", bank: "payment details" };
  const parts = (Array.isArray(missing) ? missing : []).map((m) => names[m] || m);
  if (parts.length === 0) return "";
  if (parts.length === 1) return `HR still has to record the ${parts[0]}.`;
  return `HR still has to record the ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}.`;
}

module.exports = {
  ONBOARDING_STAGES,
  STAGE_KEYS,
  CREATE_STAGE_KEY,
  stageAt,
  stageIndex,
  isFinalStage,
  isCreateStage,
  buildEducationPayload,
  EDUCATION_FIELDS,
  WORK_SHIFT_FIELD,
  validateStage,
  stageIsComplete,
  buildCreatePayload,
  applyVerifiedDemographics,
  createdSummary,
  hrOnboardingBadge,
  hrOnboardingMissingLabel,
  todayIso,
  PERSONAL_FIELDS,
  EMPLOYMENT_IDS,
};
