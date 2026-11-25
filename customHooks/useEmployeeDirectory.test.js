/**
 * The accounts form gets its employee names from the directory endpoint.
 *
 *   node --test customHooks/useEmployeeDirectory.test.js
 *
 * The regression: B2 gated /employee/employees on `view_employees`, which
 * accounts and outlet staff do not hold, so the cashier dropdown on
 * /accounts/create came back empty. The fix is a narrower endpoint, and what
 * these tests protect is that the form actually uses it - a change that
 * quietly reinstated `useEmployees` would restore the bug without failing
 * anything else.
 *
 * There is no React test runner in this repo, so the form and the hook are
 * checked as source, and the parts that are plain logic - the sort, the
 * refusal handling - are executed.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const form = read("components/accounts/NormalOutletForm/AccountForm.jsx");
const hook = read("customHooks/useEmployeeDirectory.js");
const helper = read("helper/employee.js");
const unwrapList = require("../util/apiList");

test("the accounts form uses the directory, not the HR endpoint", () => {
  assert.match(form, /useEmployeeDirectory/);
  assert.ok(
    !/customHooks\/useEmployees"/.test(form),
    "AccountForm must not import useEmployees - it calls the view_employees-gated route"
  );
  assert.ok(!/useEmployees\(/.test(form));
});

test("both employee dropdowns are fed from the same directory list", () => {
  // the Cashier menu
  assert.match(form, /const EMPLOYEES_MENU = allEmployees/);
  // and person_type 5, the employee option in the people dropdown
  const personType5 = form.match(/if \(personType == 5\) \{[\s\S]*?\}/);
  assert.ok(personType5, "the person_type 5 branch must still exist");
  assert.match(personType5[0], /allEmployees\.map/);
});

test("the helper calls /employee/directory and sends nothing with it", () => {
  const fn = helper.match(/getDirectory:[\s\S]*?\}\),/);
  assert.ok(fn, "getDirectory must exist");
  assert.match(fn[0], /API\.get\("\/employee\/directory"\)/);
  // No store_id from the client: a normal user's would be ignored by the
  // server anyway, and sending one would imply otherwise.
  assert.ok(!/store_id/.test(fn[0]));
  // the HR endpoint is still available for the screens entitled to it
  assert.match(helper, /\/employee\/employees\?/);
});

test("the hook sorts by name, so callers need not remember to", () => {
  assert.match(hook, /localeCompare/);
  const rows = [
    { employee_id: 3, employee_name: "Zara" },
    { employee_id: 1, employee_name: "amit" },
    { employee_id: 2, employee_name: "Bala" },
  ];
  const sorted = [...rows].sort((a, b) =>
    ("" + a.employee_name).localeCompare(b.employee_name)
  );
  assert.deepStrictEqual(
    sorted.map((r) => r.employee_name),
    ["amit", "Bala", "Zara"],
    "case-insensitive alphabetical, as localeCompare gives"
  );
});

test("the hook sorts a copy, never the array it was handed", () => {
  // `.sort()` mutates; sorting the response in place would reorder whatever
  // else held a reference to it.
  assert.match(hook, /\[\.\.\.result\.items\]\.sort/);
});

test("a refusal or a bad payload cannot crash the dropdown", () => {
  assert.match(hook, /unwrapList/);
  for (const body of [
    { code: 403, msg: "You do not have permission to perform this action" },
    { code: 500, msg: "An error occurred !" },
    null,
    { not: "a list" },
  ]) {
    const { items } = unwrapList(body);
    assert.ok(Array.isArray(items));
    assert.doesNotThrow(() =>
      [...items]
        .sort((a, b) => ("" + a.employee_name).localeCompare(b.employee_name))
        .map((i) => ({ id: i.employee_id, value: i.employee_name }))
    );
  }
});

test("the rest of the accounts form is untouched", () => {
  // The things the form does besides listing employees must still be there:
  // people, denominations, the cashier field, submit and reset.
  for (const marker of [
    "usePeople",
    "PAYMENT_TYPES_ACCOUNTS",
    "isDenominationOpen",
    "Cashier *",
    "handleSubmit",
    "resetForm",
    "getAmmountDifference",
  ]) {
    assert.ok(form.includes(marker), `${marker} must still be present`);
  }
});

test("nothing is left over from the old store-filtered call", () => {
  // storeId existed only to build the store_ids filter for useEmployees; the
  // server derives the outlet from the session now, so a leftover would be
  // dead code implying the client still chooses.
  assert.ok(!/storeId/.test(form));
  assert.ok(!/store_ids/.test(form));
});
