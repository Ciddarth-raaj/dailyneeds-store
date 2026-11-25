/**
 * Branch Master's RetailPilot ID field.
 *
 *   node --test util/retailPilotId.test.js
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const {
  RETAILPILOT_ID_MAX_LENGTH,
  normalizeRetailPilotId,
  retailPilotIdError,
} = require("./retailPilotId");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("the six RetailPilot store slugs are valid as they are", () => {
  for (const slug of ["9rJMC", "huABy", "FuUGY", "sooWy", "rnMT1", "kKFom"]) {
    assert.strictEqual(retailPilotIdError(slug), "", slug);
    assert.strictEqual(normalizeRetailPilotId(slug), slug, "case is kept: slugs are case-sensitive");
  }
});

test("blank is allowed and sent as null; spaces around a slug are trimmed", () => {
  for (const blank of [null, undefined, "", "   "]) {
    assert.strictEqual(normalizeRetailPilotId(blank), null);
    assert.strictEqual(retailPilotIdError(blank), "");
  }
  assert.strictEqual(normalizeRetailPilotId(" 9rJMC "), "9rJMC");
});

test("spaces inside, punctuation and over-long values are refused with a reason", () => {
  assert.match(retailPilotIdError("9rJ MC"), /no spaces/);
  assert.match(retailPilotIdError("a;b"), /Letters, digits/);
  assert.match(retailPilotIdError("x".repeat(RETAILPILOT_ID_MAX_LENGTH + 1)), /At most 50/);
});

test("the form edits it next to GoFrugal ID and sends it on create and on edit", () => {
  const form = read("pages/master/branch/[mode].jsx");
  assert.match(form, /label="GoFrugal ID"\s+name="gofrugal_id"/, "GoFrugal ID is unchanged");
  assert.match(form, /label="RetailPilot ID"\s+name="retailpilot_id"/);
  assert.strictEqual((form.match(/retailpilot_id: normalizeRetailPilotId\(values\.retailpilot_id\)/g) || []).length, 2);
  assert.match(form, /retailpilot_id: null,/, "starts empty for a new branch");
});

test("a refused save shows the backend's reason (e.g. the ID is already on another branch)", () => {
  const form = read("pages/master/branch/[mode].jsx");
  assert.match(form, /return err\?\.msg \|\| "Error creating Outlet!"/);
  assert.match(form, /return err\?\.msg \|\| "Error updating Outlet!"/);
  assert.doesNotMatch(form, /throw err;/, "the create path no longer throws an undefined variable");
});

test("the list can show it, and the form validation checks it", () => {
  assert.match(read("pages/master/branch/index.jsx"), /field: "retailpilot_id", headerName: "RetailPilot ID"/);
  const validation = read("util/validation.js");
  assert.match(validation, /import \{ retailPilotIdError \} from "\.\/retailPilotId";/);
  assert.match(validation, /retailpilot_id: Yup\.string\(\)[\s\S]*?retailPilotIdError\(value\)/);
});
