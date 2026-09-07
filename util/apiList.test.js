/**
 * A permission denial must not crash the page.
 *
 *   node --test util/apiList.test.js
 *
 * The bug this pins: `/outlet` is B2-gated, the backend answered a valid
 * `{ code: 403, msg: "You do not have permission to perform this action" }`,
 * `helper/outlets.js#getOutlet` resolved that body as if it were data,
 * `useOutlets` stored it, and the `.filter` in its `useMemo` threw during
 * render. React unwound to the Next.js `/_error` page, so a legitimate
 * authorisation refusal was displayed as "Something Went Wrong".
 *
 * The last group is the one that matters: every response shape is run through
 * the array operations the hooks actually perform, and none of them may throw.
 */
const test = require("node:test");
const assert = require("node:assert");

const unwrapList = require("./apiList");
const { PERMISSION_DENIED_MSG, isPermissionDenied } = unwrapList;
const classify403 = require("./handle403");

// The exact bodies the backend sends.
const permissionDenied = { code: 403, msg: PERMISSION_DENIED_MSG };
const accessDenied = { code: 403, msg: "Access Denied" }; // authentication, not permission
const serverError = { code: 500, msg: "An error occurred !" };
const rows = [{ outlet_id: 1, outlet_name: "A" }, { outlet_id: 2, outlet_name: "B" }];

test("1. a normal array response is passed through untouched", () => {
  const r = unwrapList(rows);
  assert.strictEqual(r.items, rows);
  assert.strictEqual(r.accessDenied, false);
  assert.strictEqual(r.error, false);
  assert.strictEqual(r.message, null);
});

test("2. an empty array is success, not an error", () => {
  const r = unwrapList([]);
  assert.deepStrictEqual(r.items, []);
  assert.strictEqual(r.accessDenied, false);
  assert.strictEqual(r.error, false);
});

test("3. a permission refusal is reported as accessDenied, with an empty list", () => {
  const r = unwrapList(permissionDenied);
  assert.deepStrictEqual(r.items, []);
  assert.strictEqual(r.accessDenied, true);
  assert.strictEqual(r.error, false);
  assert.strictEqual(r.message, PERMISSION_DENIED_MSG);
});

test("4. an error-shaped body is an error, NOT an access denial", () => {
  for (const body of [serverError, { code: 422, msg: "bad" }, { code: 401 }]) {
    const r = unwrapList(body);
    assert.deepStrictEqual(r.items, [], JSON.stringify(body));
    assert.strictEqual(r.accessDenied, false, JSON.stringify(body));
    assert.strictEqual(r.error, true, JSON.stringify(body));
  }
});

test("5. malformed and non-array payloads fall back safely", () => {
  for (const body of [null, undefined, {}, "text", 42, true, { data: rows }]) {
    const r = unwrapList(body);
    assert.ok(Array.isArray(r.items), `items must be an array for ${JSON.stringify(body)}`);
    assert.deepStrictEqual(r.items, []);
    assert.strictEqual(r.accessDenied, false);
    assert.strictEqual(r.error, true);
  }
});

test("6. a 403 never logs the user out", () => {
  // util/api.js decides that, and it must keep returning the body rather than
  // redirecting - otherwise the session dies before this helper is reached.
  assert.strictEqual(classify403(permissionDenied, "/master/branch").href, null);
  // The authentication refusal is a different thing and must still redirect.
  assert.strictEqual(classify403(accessDenied, "/master/branch").href, "/login");
});

test("7. the three states are distinguishable, so a denial is never shown as no data", () => {
  const empty = unwrapList([]);
  const denied = unwrapList(permissionDenied);
  const failed = unwrapList(serverError);

  assert.deepStrictEqual(
    [empty.accessDenied, empty.error],
    [false, false],
    "empty data"
  );
  assert.deepStrictEqual([denied.accessDenied, denied.error], [true, false], "denied");
  assert.deepStrictEqual([failed.accessDenied, failed.error], [false, true], "failed");
});

test("8. an authentication refusal is not mistaken for a permission refusal", () => {
  // Both are `code: 403` with no `error` field; only the message separates them.
  assert.strictEqual(isPermissionDenied(permissionDenied), true);
  assert.strictEqual(isPermissionDenied(accessDenied), false);
  assert.strictEqual(unwrapList(accessDenied).accessDenied, false);
  assert.strictEqual(unwrapList(accessDenied).error, true);
});

test("9. no response shape can make the hooks' array operations throw", () => {
  const shapes = [
    rows, [], permissionDenied, accessDenied, serverError,
    null, undefined, {}, "text", 42, true, { data: rows }, { code: 200 },
  ];
  for (const shape of shapes) {
    const { items } = unwrapList(shape);
    const label = JSON.stringify(shape) ?? String(shape);

    // useOutlets
    assert.doesNotThrow(
      () => items.filter((o) => ![3].includes(o.outlet_id)),
      `filter threw for ${label}`
    );
    // useProductDepartments
    assert.doesNotThrow(
      () => items.map((d) => ({ id: d.id || d.department_id })),
      `map threw for ${label}`
    );
    // the other shapes a caller might reach for
    assert.doesNotThrow(() => items.length, `length threw for ${label}`);
    assert.doesNotThrow(() => items.find((x) => x), `find threw for ${label}`);
    assert.doesNotThrow(() => items.reduce((a) => a, null), `reduce threw for ${label}`);
  }
});

test("10. the exact pre-fix crash is reproduced, and the fix removes it", () => {
  // What the old useOutlets did: store the body, then filter it in render.
  assert.throws(
    () => permissionDenied.filter((o) => o.outlet_id),
    /is not a function/,
    "the original crash must still be demonstrable"
  );
  // What it does now.
  assert.doesNotThrow(() => unwrapList(permissionDenied).items.filter((o) => o.outlet_id));
});
