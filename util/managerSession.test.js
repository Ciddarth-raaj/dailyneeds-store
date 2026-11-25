/**
 * A manager signs in, stays signed in, survives a refresh, and signs out.
 *
 *   node --test util/managerSession.test.js
 *
 * THE BUG THIS PINS. Since login started landing on /dashboard, a manager
 * whose designation holds `view_attendance_dashboard` but neither dashboard
 * scope key was refused by `GET /attendance-dashboard/filters` with the
 * dashboard-scope 403. `util/handle403.js` used to treat every 403 it did not
 * recognise as a dead session, so the manager was sent to /login on the first
 * request after signing in - and again after every retry. Administrators were
 * never affected: they are All Stores by user type and never see that refusal.
 *
 * The bodies below are copied from the backend so a change on either side
 * shows up here:
 *   middlewares/auth.js               "Access Denied" (HTTP 200, body code 403)
 *   utils/dashboard_scope.js          SCOPE_MESSAGE, with `reason`
 *   utils/employee_branch_scope.js    BRANCH_SCOPE_MESSAGE, with `error`
 *   middlewares/admin_only.js         the administrator-only refusal
 *   middlewares/permissions.js        the B2 permission refusal
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const classify403 = require("./handle403");
const { isForbidden } = require("./attendanceDashboard");
const { resolveDashboardTab } = require("./dashboardTabs");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", rel), "utf8");

// ---- the backend's answers -------------------------------------------------

const AUTH = {
  accessDenied: { code: 403, msg: "Access Denied" },
  tokenRevoked: { code: 403, msg: "Access Denied", error: "TOKEN_REVOKED" },
  employeeInactive: { code: 403, msg: "Access Denied", error: "EMPLOYEE_INACTIVE" },
};

const DASHBOARD_SCOPE = {
  noScopeGranted: {
    code: 403,
    msg: "You are not authorized for any branch on this dashboard. An administrator grants Own Store or All Stores dashboard scope on the Designation rights screen.",
    reason: "NO_SCOPE_GRANTED",
  },
  conflictingScope: {
    code: 403,
    msg: "Your designation has both Own Store and All Stores dashboard scope. Exactly one must be granted; an administrator can correct this on the Designation rights screen.",
    reason: "CONFLICTING_SCOPE",
  },
  noStoreAssigned: {
    code: 403,
    msg: "You have no branch assigned in Employee Master, so Own Store scope cannot be resolved.",
    reason: "NO_STORE_ASSIGNED",
  },
  noDashboardPermission: {
    code: 403,
    msg: "You do not have permission to view this dashboard.",
    reason: "NO_DASHBOARD_PERMISSION",
  },
  outOfScopeLocation: {
    code: 403,
    msg: "You are only authorized for your own branch on this dashboard.",
    reason: "OUT_OF_SCOPE_LOCATION",
  },
};

const BRANCH_SCOPE = {
  outOfBranch: {
    code: 403,
    msg: "This employee belongs to a branch you are not authorized for.",
    error: "OUT_OF_BRANCH",
  },
  noBranchAssigned: {
    code: 403,
    msg: "You have no branch assigned in Employee Master, so employee access cannot be resolved. An administrator can set your branch on your employee record.",
    error: "NO_BRANCH_ASSIGNED",
  },
};

const ADMIN_ONLY = { code: 403, msg: "Only an administrator can perform this action" };
const PERMISSION = { code: 403, msg: "You do not have permission to perform this action" };

const MANAGER_ACCESS = { attendance: true, staffing: true, payroll: false, "my-attendance": true };

// ---- login -----------------------------------------------------------------

test("manager login: the sign-in lands on /dashboard with the session stored", () => {
  const login = read("pages/login.js");
  // The token and identity go through userContext, which writes localStorage.
  assert.match(login, /userContext\.updateUserConfig\(\{\s*token: data\.data\.token/);
  assert.match(login, /window\.location\.href = "\/dashboard"/);
});

test("manager login: /dashboard opens Attendance Today first for a manager holding the key", () => {
  assert.equal(resolveDashboardTab(undefined, MANAGER_ACCESS).tab.key, "attendance");
});

test("manager login: a dashboard-scope refusal on /dashboard keeps the session", async (t) => {
  for (const [name, body] of Object.entries(DASHBOARD_SCOPE)) {
    await t.test(name, () => {
      assert.strictEqual(classify403(body, "/dashboard").href, null);
      // ...and the screen shows its own refusal state instead.
      assert.strictEqual(isForbidden(body), true);
    });
  }
});

test("manager session: outlet-scope and admin-only refusals elsewhere keep the session", () => {
  for (const body of [...Object.values(BRANCH_SCOPE), ADMIN_ONLY, PERMISSION]) {
    for (const page of ["/employee", "/dashboard", "/grn", "/attendance/regularization"]) {
      assert.strictEqual(classify403(body, page).href, null, `${body.msg} on ${page}`);
    }
  }
});

// ---- refresh ---------------------------------------------------------------

test("page refresh: the stored token is re-attached before any request", () => {
  const app = read("pages/_app.js");
  assert.match(app, /localStorage\.getItem\("Token"\)/);
  assert.match(app, /axiosInstance\.defaults\.headers\.common\["x-access-token"\] = token/);
});

test("page refresh: the same /dashboard requests repeated never log the manager out", () => {
  // A refresh replays get-details, permissions and the dashboard's filters.
  const replay = [{ code: 200, data: [] }, { code: 200, data: [] }, DASHBOARD_SCOPE.noScopeGranted];
  for (let load = 0; load < 3; load++) {
    for (const body of replay) assert.strictEqual(classify403(body, "/dashboard").href, null);
  }
});

// ---- logout and a genuinely dead session ------------------------------------

test("logout: the client clears its session and tells the server first", () => {
  const header = read("components/header/header.js");
  const logout = header.slice(header.indexOf("const logout = async"));
  assert.ok(logout.indexOf("UserHelper.logout()") < logout.indexOf("localStorage.clear()"));
});

test("logout: a revoked, inactive or missing session still goes to /login", () => {
  for (const body of Object.values(AUTH)) {
    assert.strictEqual(classify403(body, "/dashboard").href, "/login", JSON.stringify(body));
  }
  assert.strictEqual(classify403({ code: 403 }, "/dashboard").href, "/login");
});

test("administrator and other employees: the auth and special-case rules are unchanged", () => {
  assert.strictEqual(classify403(AUTH.accessDenied, "/").href, "/login");
  assert.strictEqual(
    classify403({ code: 403, msg: "Password change required", error: "PASSWORD_CHANGE_REQUIRED" }, "/dashboard").href,
    "/change-password?required=1"
  );
  assert.strictEqual(classify403({ code: 403, error: "IP_NOT_ALLOWED", msg: "x" }, "/dashboard").href, "/login?blocked=ip");
  assert.strictEqual(classify403({ code: 200, data: [] }, "/dashboard").href, null);
});
