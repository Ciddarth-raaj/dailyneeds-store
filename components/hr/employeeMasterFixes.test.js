/**
 * Employee Master — the screens behind the DN-ATTENDANCE changes.
 *
 *   node --test components/hr/employeeMasterFixes.test.js
 *
 * Source-text assertions, the way `hrScreens.test.js` works: there is no
 * React test runner here, so what these pin is that each screen is wired to
 * the one shared rule rather than to a local copy of it, and that the
 * things that must NOT happen are absent.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");

const personal = read("components/hr/profile/PersonalSection.jsx");
const photo = read("components/hr/profile/EmployeePhotoHeader.jsx");
const attendance = read("components/hr/profile/AttendanceRequiredSection.jsx");
const aadhaarSection = read("components/hr/profile/AadhaarSection.jsx");
const profile = read("pages/hr/employees/[id].jsx");
const hrHelper = read("helper/hr.js");
const hrProfileUtil = read("util/hrProfile.js");

/* ============================================= 5.4 mandatory fields */

test("Personal Details validates through the shared rule, not a local copy", () => {
  assert.match(personal, /from "\.\.\/\.\.\/\.\.\/util\/personalDetails"/);
  assert.match(personal, /validatePersonalDetails\(form\)/);
  assert.match(personal, /isRequiredField\(name, form\)/);
});

test("an invalid Personal Details save never reaches the server", () => {
  // The server re-checks the same rule; this is about not spending a round
  // trip, and about pointing at the field rather than at a sentence.
  const save = personal.slice(personal.indexOf("const save ="), personal.indexOf("const fieldProps"));
  assert.ok(save.indexOf("return;") < save.indexOf("onSave(form)"), "it returns before saving");
  assert.match(save, /setErrors\(found\)/);
});

test("validation runs on SAVE, never on opening the section", () => {
  // A 2013 profile with no father's name on file must still open, read and
  // print exactly as it always did.
  const start = personal.slice(personal.indexOf("const start ="), personal.indexOf("const set ="));
  assert.ok(!/validatePersonalDetails/.test(start), "opening the editor validates nothing");
  assert.match(start, /setErrors\(\{\}\)/, "and it clears whatever was flagged before");
});

/* ================================================= 5.2 address copy */

test("Same as Permanent Address copies once and does not bind the two", () => {
  assert.match(personal, /Same as Permanent Address/);
  assert.match(personal, /copyPermanentToResidential = \(\) => set\("residential_address", form\.permanent_address/);
  // A useEffect keeping them in step would be the bug: changing the
  // permanent address later must not silently rewrite where somebody lives.
  assert.ok(
    !/useEffect\([^)]*residential_address/.test(personal),
    "the two addresses are never synchronised"
  );
});

/* ================================================== 5.3 Aadhaar name */

test("the Aadhaar name is read from the verified identity, never from employee_name", () => {
  assert.match(personal, /aadhaar\.name_as_per_aadhaar/);
  assert.ok(
    !/name_as_per_aadhaar: form\./.test(personal),
    "the form never sends the Aadhaar name back"
  );
});

test("Name as per Aadhaar is read-only in the editor", () => {
  const field = personal.slice(personal.indexOf('label="Name as per Aadhaar"'));
  assert.match(field.slice(0, 400), /isReadOnly/);
});

test("Copy from Aadhaar Name fills the operational name and leaves it editable", () => {
  assert.match(personal, /Copy from Aadhaar Name/);
  assert.match(personal, /copyAadhaarName = \(\) => set\("employee_name", aadhaarName\)/);
  // Employee Name is never disabled or read-only: verification must not lock it.
  const nameField = personal.slice(
    personal.indexOf('label="Employee Name"'),
    personal.indexOf('label="Name as per Aadhaar"')
  );
  assert.ok(!/isReadOnly|isDisabled/.test(nameField), "Employee Name stays editable after verification");
});

test("the verified name and its status are shown on the Aadhaar section too", () => {
  assert.match(aadhaarSection, /name_as_per_aadhaar/);
});

/* ======================================================= 5.1 photo */

test("the photo writes the column that already exists, through the ordinary edit", () => {
  assert.match(photo, /employee_image/);
  assert.match(photo, /onSave\(\{ employee_image: dataUri \}\)/);
  assert.match(hrProfileUtil, /"employee_image"/, "and it is on the HR patch allowlist");
  // No new endpoint, no second place a photo can live.
  assert.ok(!/API\.post|fetch\(/.test(photo));
});

test("a chosen photo is always resized before it is sent", () => {
  assert.match(photo, /resizeToDataUri\(file\)/);
  assert.ok(!/readAsDataURL/.test(photo), "the raw file never becomes the stored value");
});

test("no photo is not an error state - the avatar falls back to the name", () => {
  assert.match(photo, /name=\{employee\.employee_name \|\| undefined\}/);
});

test("the profile header renders it, and only offers the control to an editor", () => {
  assert.match(profile, /<EmployeePhotoHeader/);
  assert.match(profile, /canEdit=\{canEdit && Boolean\(employee\)\}/);
});

/* ============================================ 3. Attendance Required */

test("the flag defaults to Yes when the record does not say otherwise", () => {
  assert.match(profile, /employee \? employee\.attendance_required !== 0 : true/);
  assert.match(attendance, /const required = value !== false/);
});

test("only an administrator is offered the switch", () => {
  assert.match(attendance, /isAdmin \? \(/);
  assert.match(profile, /isAdmin=\{isAdmin\}/);
});

test("it goes to its own admin-only endpoint, never through the ordinary edit", () => {
  assert.match(hrHelper, /\/attendance-required/);
  assert.match(profile, /HrHelper\.setAttendanceRequired\(id, required\)/);
  assert.ok(
    !/attendance_required/.test(hrProfileUtil),
    "it is not on the HR edit patch allowlist, so employee_edit cannot carry it"
  );
});

test("the card says what No does NOT mean, because Active + Not Required reads as a termination", () => {
  for (const phrase of [/payroll-eligible/i, /not a resignation/i, /salary stop/i]) {
    assert.match(attendance, phrase);
  }
});
