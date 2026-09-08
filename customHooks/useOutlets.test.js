/**
 * The outlet pickers get their list from the directory endpoint.
 *
 *   node --test customHooks/useOutlets.test.js
 *
 * The regression: B2 gated `GET /outlet` on `view_stores`, which is right -
 * that route returns the whole outlet record, IP policy included. But every
 * outlet dropdown was reading it, so Accounts Executive (designation 15, which
 * holds `view_purchases` but not `view_stores`) got an empty selector on
 * /purchase and could not scope purchases to any branch.
 *
 * The fix is a narrower endpoint, and what these tests protect is that the
 * pickers actually use it: a change that quietly reinstated the default
 * `useOutlets()` would restore the bug without failing anything else. They
 * also pin that the default is UNCHANGED, so the many other consumers keep the
 * full record and the permission that guards it.
 *
 * There is no React test runner in this repo, so the components and the hook
 * are checked as source, and the plain logic - the refusal handling - is run.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const hook = read("customHooks/useOutlets.js");
const helper = read("helper/outlets.js");
const fromTo = read("components/DateOutletPicker/FromToDateOutletPicker.jsx");
const picker = read("components/DateOutletPicker/index.jsx");
const purchasePage = read("pages/purchase/index.jsx");
const unwrapList = require("../util/apiList");

test("the helper calls the directory endpoint, and it is the two-column one", () => {
  assert.match(helper, /getOutletDirectory/);
  assert.match(helper, /API\.get\("\/outlet\/directory"\)/);
});

test("both outlet pickers ask for the directory", () => {
  for (const [name, src] of [
    ["FromToDateOutletPicker", fromTo],
    ["DateOutletPicker", picker],
  ]) {
    assert.match(src, /useOutlets\(\{ directory: true \}\)/, `${name} must use the directory`);
    assert.ok(
      !/useOutlets\(\)/.test(src),
      `${name} must not call the default useOutlets() - that is the view_stores route`
    );
  }
});

test("the purchase page renders the picker that was fixed", () => {
  // If the page ever stops using this picker, these tests would keep passing
  // while /purchase broke again.
  assert.match(purchasePage, /FromToDateOutletPicker/);
});

test("the pickers only ever needed an id and a name", () => {
  // Which is why returning less is a fix and not a compromise.
  for (const src of [fromTo, picker]) {
    const list = src.slice(src.indexOf("OUTLETS_LIST"), src.indexOf("return ("));
    const fields = [...list.matchAll(/item\.(\w+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(fields)].sort(), ["outlet_id", "outlet_name"]);
  }
});

test("the default is unchanged, so other consumers keep the full record", () => {
  assert.match(hook, /directory = false/, "directory must be opt-in");
  // The full-record call is still there for callers that need it.
  assert.match(hook, /BranchHelper\.getOutlet\(\)/);
  assert.match(hook, /BranchHelper\.getOutletDirectory\(\)/);
});

test("no other consumer was switched to the directory", () => {
  // Only the two pickers opted in. Everything else still gets the full record,
  // so this change cannot have widened or narrowed anything else by accident.
  const roots = ["pages", "components", "customHooks"];
  const optedIn = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(__dirname, "..", dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (
        /\.(js|jsx)$/.test(entry.name) &&
        !entry.name.endsWith(".test.js") &&
        // The hook itself documents the option; it is not a consumer of it.
        rel.replace(/\\/g, "/") !== "customHooks/useOutlets.js"
      ) {
        if (/useOutlets\(\{[^)]*directory: true/.test(read(rel))) {
          optedIn.push(rel.replace(/\\/g, "/"));
        }
      }
    }
  };
  roots.forEach(walk);
  assert.deepEqual(optedIn.sort(), [
    "components/DateOutletPicker/FromToDateOutletPicker.jsx",
    "components/DateOutletPicker/index.jsx",
  ]);
});

test("a permission refusal is still surfaced, not shown as an empty list", () => {
  // The directory needs no permission, so this should not happen any more -
  // but the hook must keep telling the difference if it ever does.
  const denied = unwrapList({
    code: 403,
    msg: "You do not have permission to perform this action",
  });
  assert.deepEqual(denied.items, []);
  assert.strictEqual(denied.accessDenied, true);
  assert.strictEqual(denied.error, false);

  const ok = unwrapList([{ outlet_id: 1, outlet_name: "One" }]);
  assert.strictEqual(ok.accessDenied, false);
  assert.strictEqual(ok.items.length, 1);
});

test("the hook re-fetches if the mode changes, rather than serving a stale list", () => {
  assert.match(hook, /\}, \[directory\]\);/);
});
