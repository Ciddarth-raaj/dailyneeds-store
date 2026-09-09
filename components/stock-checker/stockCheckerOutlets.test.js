/**
 * Stock Checker — where the branch list comes from.
 *
 *   node --test components/stock-checker/stockCheckerOutlets.test.js
 *
 * ============================================== THE DEFECT THESE PIN =======
 *
 * Every Stock Checker screen read its branch list from `useOutlets({ skipIds:
 * [1] })`, the default mode, which calls `GET /outlet`. That route is gated on
 * `view_stores` - the permission for ADMINISTERING branches, which returns the
 * whole outlet record including its IP policy.
 *
 * Holding `view_stores` was never a prerequisite for CHECKING STOCK in a
 * branch. A user with `view_stock_checker` and without it received
 * `{ code: 403 }`, `unwrapList` turned that into an empty array, and the grid
 * rendered "No Rows To Show" - indistinguishable from a company with no
 * branches, and with nothing on screen saying otherwise. An administrator saw
 * everything, so it looked like the feature worked.
 *
 * All four callers use an outlet id and a name and nothing else, so they read
 * `/outlet/directory` instead - the two-column list behind no permission. This
 * is the same fix `/purchase` and the HR screens already took.
 *
 * ============================ WHAT THIS MUST NOT HAVE CHANGED ==============
 *
 * The directory contains EVERY branch name. That is not a widening, because
 * neither screen's restriction was ever the fetch: Assigned Products filters
 * the result by the user's own `storeId`, and the drawer pins and disables the
 * branch field. Both are asserted below, because "the fix accidentally showed
 * a branch user every branch" is the failure this change could plausibly
 * introduce.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const CALLERS = [
  { name: "Stock Checker View", file: "pages/stock-checker/[mode].jsx" },
  { name: "Stock Checker listing", file: "pages/stock-checker/index.jsx" },
  { name: "Assigned Products", file: "pages/stock-checker/assigned-products.jsx" },
  { name: "Item Drawer", file: "components/stock-checker/StockCheckerItemDrawer.jsx" },
];

/* ============================ every caller reads the directory =========== */

for (const c of CALLERS) {
  test(`${c.name}: READS THE DIRECTORY, NOT THE view_stores ROUTE`, () => {
    const code = strip(read(c.file));
    assert.match(
      code,
      /useOutlets\(\{ skipIds: \[1\], directory: true \}\)/,
      `${c.name} must ask for the directory`
    );
    // The default mode is the bug. Reinstating it would restore "No Rows To
    // Show" for every user without `view_stores`, silently.
    assert.ok(
      !/useOutlets\(\{ skipIds: \[1\] \}\)/.test(code),
      `${c.name} must not call the permission-gated default`
    );
    assert.ok(!/useOutlets\(\)/.test(code), `${c.name} must not call the bare default`);
  });

  test(`${c.name}: skipIds: [1] is preserved`, () => {
    // Unchanged behaviour, and the hook applies it to whichever list comes
    // back - so the directory composes with it rather than replacing it.
    assert.match(strip(read(c.file)), /skipIds: \[1\]/);
  });

  test(`${c.name}: uses only an outlet id and name`, () => {
    // Which is why reading less is a fix and not a compromise. Any other
    // column - nickname, code, address, IP policy - is absent from the
    // directory and would render as undefined.
    const code = strip(read(c.file));
    for (const richer of [
      "outlet_nickname",
      "outlet_code",
      "outlet_address",
      "outlet_phone",
      "gofrugal_id",
      "ip_restriction_enabled",
      "allowed_ips",
      "opening_cash",
    ]) {
      assert.ok(!code.includes(richer), `${c.name} must not read ${richer}`);
    }
  });
}

/* ============ the branch-user restrictions are untouched ================= */

test("ASSIGNED PRODUCTS STILL SHOWS A BRANCH USER ONLY THEIR OWN OUTLET", () => {
  // The restriction is applied to the RESULT, and always was. The directory
  // returning every branch name does not widen it: this filter runs after.
  const code = strip(read("pages/stock-checker/assigned-products.jsx"));
  const scoped = code.slice(code.indexOf("const branchesForUser"));
  const body = scoped.slice(0, scoped.indexOf("const rowData"));

  assert.match(body, /if \(storeId != null && storeId !== ""\)/);
  assert.match(
    body,
    /all\.filter\(\(o\) => String\(o\.outlet_id \?\? o\.id\) === String\(storeId\)\)/
  );
  // And with no storeId, every applicable outlet - unchanged.
  assert.match(body, /return all;/);
  assert.match(code, /const \{ storeId \} = useUser\(\)\.userConfig/);
});

test("THE DRAWER STILL PINS AND DISABLES THE BRANCH FOR A storeId USER", () => {
  const code = strip(read("components/stock-checker/StockCheckerItemDrawer.jsx"));

  // preselectedBranchId wins, then storeId - the order is the contract.
  const initial = code.slice(code.indexOf("const initialBranchId"), code.indexOf("const isBranchDisabled"));
  const preselectAt = initial.indexOf("preselectedBranchId");
  const storeAt = initial.indexOf("storeId");
  assert.ok(preselectAt > -1 && storeAt > -1);
  assert.ok(preselectAt < storeAt, "preselectedBranchId must be checked first");

  // Disabled for either, so a branch user cannot pick another branch.
  assert.match(
    code,
    /const isBranchDisabled =\s*\(preselectedBranchId != null && preselectedBranchId !== ""\) \|\|\s*\(storeId != null && storeId !== ""\)/
  );
});

test("NEITHER SCREEN DERIVES AUTHORIZATION FROM THE FETCH", () => {
  // The point of the audit: the fetch was never the restriction, so changing
  // which endpoint it uses cannot have loosened one. A guard written in terms
  // of the outlet list would be exactly that mistake.
  for (const file of [
    "pages/stock-checker/assigned-products.jsx",
    "components/stock-checker/StockCheckerItemDrawer.jsx",
  ]) {
    const code = strip(read(file));
    assert.ok(
      !/outlets\.length\s*[=><]/.test(code),
      `${file} must not gate on how many outlets came back`
    );
    assert.ok(!/accessDenied/.test(code), `${file} must not treat a refusal as authorization`);
  }
});

/* ============================ scope guards ============================== */

test("NO PERMISSION WAS ADDED, REMOVED OR HARD-CODED", () => {
  // `view_stores` must not be requested anywhere in Stock Checker, and the
  // module's own permissions must be untouched.
  for (const c of CALLERS) {
    const code = strip(read(c.file));
    assert.ok(!code.includes("view_stores"), `${c.name} must not ask for view_stores`);
    for (const bad of [/user_id\s*===\s*\d/, /designation_id\s*===\s*\d/, /isAdmin\s*=\s*true/]) {
      assert.ok(!bad.test(code), `${c.name}: hard-coded identity ${bad}`);
    }
  }
  // The listing still gates Add on its own key, as before.
  assert.match(strip(read("pages/stock-checker/index.jsx")), /usePermissions\("add_stock_checker"\)/);
});

test("THE EXPIRY CHECKER WAS NOT TOUCHED", () => {
  // It has the same shape and the same latent problem, but it is a different
  // module and was not in scope. Changing it here would be an unrelated
  // refactor riding along in a fix.
  for (const file of [
    "pages/products/expiry-checker/[mode].jsx",
    "pages/products/expiry-checker/index.jsx",
    "pages/products/expiry-checker/assigned-products.jsx",
    "components/products-expiry-checker/ExpiryCheckerItemDrawer.jsx",
  ]) {
    assert.match(
      strip(read(file)),
      /useOutlets\(\{ skipIds: \[1\] \}\)/,
      `${file} must be left exactly as it was`
    );
  }
});

test("no new outlet fetching was invented", () => {
  // The hook already had the capability; a second fetch path would be two
  // things to keep in step.
  for (const c of CALLERS) {
    const code = strip(read(c.file));
    assert.ok(!/getOutletDirectory/.test(code), `${c.name} must go through the hook`);
    assert.ok(!/BranchHelper/.test(code), `${c.name} must not call the helper directly`);
  }
});
