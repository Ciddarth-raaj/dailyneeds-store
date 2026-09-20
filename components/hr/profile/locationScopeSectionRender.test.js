/**
 * Duty Location on the employee profile — RENDERED, and read as a person
 * reads it.
 *
 *   node --test components/hr/profile/locationScopeSectionRender.test.js
 *
 * What this defends is the WORDING, which is the whole point of the card. The
 * underlying column is called `works_all_locations`; that is a database
 * identifier and nobody setting this for a real employee should ever see it.
 * What they must see instead is what the setting means, what it does not mean,
 * and what happens to the outlet already on the record — because
 * "All Locations" beside an Active badge is exactly the kind of thing somebody
 * reads as an exemption, a transfer or a termination.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { render, textOf, unavailable } = require("../../../test_support/renderJsx");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};

const CARD = "components/hr/profile/LocationScopeSection.jsx";

const fixed = (over = {}) =>
  render(CARD, {
    value: false,
    outletName: "Warehouse",
    isAdmin: true,
    onChange: () => {},
    saving: false,
    ...over,
  });

const roaming = (over = {}) => fixed({ value: true, ...over });

/** One string, so an assertion reads the card the way a person scans it. */
const readable = (markup) => textOf(markup).join(" ");

/* ------------------------------------------------- no database vocabulary */

test("the raw column name never reaches the screen, in either state", skip, () => {
  [fixed(), roaming()].forEach((markup) => {
    const seen = readable(markup);
    assert.ok(!/works_all_locations/i.test(seen), "a column name is not a label");
    assert.ok(!/new_employee|store_id|TINYINT|tinyint/i.test(seen));
    // Nor 1/0 as a value.
    assert.ok(!/\bworks all locations\b/i.test(seen), "not the identifier spelled out either");
  });
});

/* -------------------------------------------------------- what it is called */

test("the roaming state is named in words, not as a flag", skip, () => {
  const seen = readable(roaming());
  assert.match(seen, /All Locations \/ Roaming/);
  assert.match(seen, /Duty Location/, "and the card says which question it answers");
});

test("the ordinary state names the outlet the employee is expected at", skip, () => {
  const seen = readable(fixed());
  assert.match(seen, /Fixed outlet/);
  assert.match(seen, /expected at/i);
  assert.match(seen, /Warehouse/, "the actual branch, not a placeholder");
});

test("with no outlet on record it still reads as a sentence", skip, () => {
  const seen = readable(fixed({ outletName: null }));
  assert.match(seen, /the outlet on their record/);
  assert.ok(!/undefined|null/.test(seen));
});

/* -------------------------------------- what the retained outlet still means */

test("the roaming state explains what the branch on the record is still for", skip, () => {
  const seen = readable(roaming());
  assert.match(
    seen,
    /Warehouse remains the branch that owns their record/,
    "the outlet does not disappear, and the card says so by name"
  );
});

test("and what being roaming does NOT mean", skip, () => {
  const seen = readable(roaming());
  assert.match(seen, /remains active, rostered on a shift and expected to punch/);
  assert.match(seen, /still\s+appear in attendance, in the Missing Attendance Report and in payroll/);
  assert.match(seen, /not an attendance exemption, a resignation or a salary stop/);
});

test("it says what actually changes: which outlet's staffing they count towards", skip, () => {
  const seen = readable(roaming());
  assert.match(seen, /counted in no single outlet's Expected Now/);
  assert.match(seen, /a punch at any\s+location counts as recorded IN for them/);
});

/* ------------------------------------------------------------ who may change it */

test("an administrator is offered the switch, in plain words", skip, () => {
  const seen = readable(roaming({ isAdmin: true }));
  assert.match(seen, /Set Duty Location to a fixed outlet/);
  const other = readable(fixed({ isAdmin: true }));
  assert.match(other, /Set Duty Location to All Locations/);
});

test("anybody else sees the value and is told who can change it", skip, () => {
  const seen = readable(roaming({ isAdmin: false }));
  assert.match(seen, /All Locations \/ Roaming/, "the value is not hidden");
  assert.match(seen, /Only an administrator can change this/);
  assert.ok(!/Set Duty Location/.test(seen), "and no button they would only get a 403 from");
});

/* ------------------------------------------------------- nobody is hard-coded */

test("the card names no employee and no job title", skip, () => {
  [fixed(), roaming()].forEach((markup) => {
    const seen = readable(markup);
    assert.ok(!/kumaraguru/i.test(seen));
    assert.ok(!/operations manager/i.test(seen));
  });
});
