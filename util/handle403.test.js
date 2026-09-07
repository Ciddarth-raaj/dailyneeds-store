/**
 * Which 403s end the session, and which are ordinary answers.
 *
 *   node --test util/handle403.test.js
 *
 * The case that made this file necessary: Stage 0B / B2 refuses a valid
 * session that lacks a permission with `{ code: 403, msg: "You do not have
 * permission to perform this action" }` and NO `error` field. The deployed
 * transformer redirected on any 403 it did not recognise, so an ordinary
 * non-HR user would have been logged out of the whole application by a
 * dropdown that happens to call an HR endpoint. Telling the two apart by
 * "has no error field" would have been just as wrong: an authentication
 * refusal has no `error` in most of its branches either. The `msg` is the
 * discriminator, and these tests pin both sides of it.
 */
const test = require("node:test");
const assert = require("node:assert");

const classify403 = require("./handle403");
const { PERMISSION_DENIED_MSG } = classify403;

// The exact bodies the backend sends, copied from middlewares/permissions.js
// and middlewares/auth.js.
const permissionDenied = { code: 403, msg: PERMISSION_DENIED_MSG };
const accessDenied = { code: 403, msg: "Access Denied" };

test("B2 permission denial does not redirect", async (t) => {
  await t.test("on an ordinary page the session survives", () => {
    assert.strictEqual(classify403(permissionDenied, "/employees").href, null);
  });

  await t.test("the same on every page a non-HR user might be on", () => {
    for (const page of ["/", "/store-budget", "/packing-material-size", "/master/branch", "/whatsapp"]) {
      assert.strictEqual(classify403(permissionDenied, page).href, null, `redirected from ${page}`);
    }
  });

  await t.test("it is the msg that decides, not the absence of an error field", () => {
    assert.ok(!("error" in permissionDenied));
    assert.ok(!("error" in accessDenied));
    assert.strictEqual(classify403(permissionDenied, "/employees").href, null);
    assert.strictEqual(classify403(accessDenied, "/employees").href, "/login");
  });

  await t.test("a permission denial carrying an unrelated error field still stays", () => {
    assert.strictEqual(
      classify403({ code: 403, msg: PERMISSION_DENIED_MSG, error: "SOMETHING_NEW" }, "/employees").href,
      null
    );
  });

  await t.test("the message is matched exactly, not loosely", () => {
    assert.strictEqual(classify403({ code: 403, msg: "You do not have permission" }, "/x").href, "/login");
    assert.strictEqual(classify403({ code: 403, msg: PERMISSION_DENIED_MSG.toUpperCase() }, "/x").href, "/login");
  });
});

test("Access Denied still redirects to /login", async (t) => {
  await t.test("the plain authentication refusal", () => {
    assert.strictEqual(classify403(accessDenied, "/employees").href, "/login");
  });

  await t.test("every auth.js variant that carries an error code", () => {
    for (const error of ["EMPLOYEE_INACTIVE", "TOKEN_REVOKED"]) {
      assert.strictEqual(classify403({ ...accessDenied, error }, "/employees").href, "/login", error);
    }
  });

  await t.test("a 403 with no msg at all is treated as an auth refusal", () => {
    assert.strictEqual(classify403({ code: 403 }, "/employees").href, "/login");
  });
});

test("the three existing special cases are unchanged", async (t) => {
  await t.test("PASSWORD_CHANGE_REQUIRED goes to the change-password screen", () => {
    const body = { code: 403, error: "PASSWORD_CHANGE_REQUIRED" };
    assert.strictEqual(classify403(body, "/employees").href, "/change-password?required=1");
  });

  await t.test("PASSWORD_CHANGE_REQUIRED does not redirect once already there", () => {
    const body = { code: 403, error: "PASSWORD_CHANGE_REQUIRED" };
    assert.strictEqual(classify403(body, "/change-password").href, null);
  });

  await t.test("EMPLOYEE_REQUIRED is handed back to the caller", () => {
    assert.strictEqual(classify403({ code: 403, error: "EMPLOYEE_REQUIRED" }, "/employees").href, null);
  });

  await t.test("IP_NOT_ALLOWED carries the reason, and the ip when present", () => {
    assert.strictEqual(
      classify403({ code: 403, error: "IP_NOT_ALLOWED" }, "/employees").href,
      "/login?blocked=ip"
    );
    assert.strictEqual(
      classify403({ code: 403, error: "IP_NOT_ALLOWED", ip: "10.0.0.1" }, "/employees").href,
      "/login?blocked=ip&ip=10.0.0.1"
    );
  });

  await t.test("the ip is url-encoded", () => {
    assert.strictEqual(
      classify403({ code: 403, error: "IP_NOT_ALLOWED", ip: "a&b=c" }, "/employees").href,
      `/login?blocked=ip&ip=${encodeURIComponent("a&b=c")}`
    );
  });
});

test("nothing else is touched", async (t) => {
  await t.test("the login page never redirects to itself", () => {
    for (const body of [accessDenied, permissionDenied, { code: 403, error: "IP_NOT_ALLOWED" }]) {
      assert.strictEqual(classify403(body, "/login").href, null);
    }
  });

  await t.test("a non-403 body is left alone", () => {
    for (const body of [{ code: 200, data: [] }, { code: 401 }, { code: 500 }, {}]) {
      assert.strictEqual(classify403(body, "/employees").href, null);
    }
  });

  await t.test("the code is compared strictly, so the string \"403\" is not a refusal", () => {
    assert.strictEqual(classify403({ code: "403", msg: "Access Denied" }, "/employees").href, null);
  });

  await t.test("a null or undefined body does not throw", () => {
    assert.strictEqual(classify403(null, "/employees").href, null);
    assert.strictEqual(classify403(undefined, "/employees").href, null);
  });
});
