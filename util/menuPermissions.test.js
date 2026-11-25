/**
 * The navigation's permission condition.
 *
 *   node --test util/menuPermissions.test.js
 *
 * This replaced four inline copies of the same `permission_key ==` lookup -
 * two in sideBar.js, two in sideBarMobile.js - so the first thing worth
 * proving is that the single-key behaviour is byte-for-byte what those did.
 * The array form is new, and exists because Reports needs a PREREQUISITE as
 * well as its own key.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const hasMenuPermission = require("./menuPermissions");

const granted = (...keys) => keys.map((permission_key) => ({ permission_key }));

/* ================================ unchanged for every existing entry ==== */

test("a single key behaves exactly as it did before", () => {
  const user = granted("view_employees", "view_department");
  assert.strictEqual(hasMenuPermission("view_employees", user), true);
  assert.strictEqual(hasMenuPermission("view_designation", user), false);
});

test("no permission means no requirement", () => {
  // Section headers and a few entries carry no `permission` at all, and have
  // always rendered for everybody.
  for (const empty of [undefined, null, ""]) {
    assert.strictEqual(hasMenuPermission(empty, granted()), true);
    assert.strictEqual(hasMenuPermission(empty, null), true);
  }
});

test("an absent or malformed permission list refuses rather than throwing", () => {
  // `filteredData` is null while the designation's permissions are loading.
  // Rendering nothing for that moment is right; throwing during render is not.
  assert.strictEqual(hasMenuPermission("view_employees", null), false);
  assert.strictEqual(hasMenuPermission("view_employees", undefined), false);
  assert.strictEqual(hasMenuPermission("view_employees", "nonsense"), false);
  assert.strictEqual(hasMenuPermission("view_employees", [null, undefined]), false);
});

/* ============================================== the new array form ====== */

test("AN ARRAY MEANS ALL OF THEM, NOT ANY", () => {
  // AND, deliberately. An array meaning "any of these" would make a list of
  // keys WEAKEN a condition as it grew - the opposite of how anyone reads it,
  // and the same trap `permissions.require(a, b)` sets on the server, where
  // `requireAll` exists for exactly this reason.
  const both = granted("view_reports", "view_employees");
  const capabilityOnly = granted("view_reports");
  const datasetOnly = granted("view_employees");

  const condition = ["view_reports", "view_employees"];
  assert.strictEqual(hasMenuPermission(condition, both), true);
  assert.strictEqual(hasMenuPermission(condition, capabilityOnly), false);
  assert.strictEqual(hasMenuPermission(condition, datasetOnly), false);
  assert.strictEqual(hasMenuPermission(condition, granted()), false);
});

test("a one-element array is the same as the bare key", () => {
  assert.strictEqual(hasMenuPermission(["view_employees"], granted("view_employees")), true);
  assert.strictEqual(hasMenuPermission(["view_employees"], granted("view_reports")), false);
});

test("an empty array is no requirement, not an impossible one", () => {
  assert.strictEqual(hasMenuPermission([], granted()), true);
});

test("extra permissions the user holds are irrelevant", () => {
  const user = granted("view_reports", "view_employees", "export_reports", "add_employees");
  assert.strictEqual(hasMenuPermission(["view_reports", "view_employees"], user), true);
});

/* ============================================== one implementation ====== */

test("THE SIDEBARS NO LONGER CARRY THEIR OWN COPY OF THIS", () => {
  // Four inline copies meant an AND condition would have had to be added four
  // times, and would have been added three.
  for (const rel of ["components/sideBar/sideBar.js", "components/sideBarMobile/sideBarMobile.js"]) {
    const src = fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
    assert.ok(
      !/permission_key ==/.test(src),
      `${rel} still compares permission keys itself`
    );
    assert.match(src, /hasMenuPermission/, `${rel} must use the shared helper`);
  }
});

test("the menu can express a conjunction, and one entry does", () => {
  const menus = fs.readFileSync(path.join(__dirname, "..", "constants", "menus.js"), "utf8");
  assert.match(menus, /permission: \["view_reports", "view_employees"\]/);
});

/* ============================================== the hook's AND option === */

test("usePermissions KEEPS ANY AS ITS DEFAULT, AND OFFERS ALL", () => {
  // Every existing caller means ANY and relies on it; changing that default
  // would silently tighten dozens of screens. The option is opt-in.
  const hook = fs.readFileSync(
    path.join(__dirname, "..", "customHooks", "usePermissions.js"),
    "utf8"
  );
  assert.match(hook, /function usePermissions\(permissions = \[\], \{ all = false \} = \{\}\)/);
  assert.match(hook, /if \(all\) \{[\s\S]{0,120}\.every\(/);
});
