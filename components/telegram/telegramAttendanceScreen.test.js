/**
 * The Telegram Attendance Mini App screen - the approved shape.
 *
 *   node --test components/telegram/telegramAttendanceScreen.test.js
 *
 * No component renderer is wired up in this repo, so these read the sources
 * the way components/attendance/attendanceV2Screens.test.js does. The claims
 * are all about what the screen CANNOT do - name another employee, edit a
 * punch, show a punch count, hold a bot token - which is exactly the kind of
 * claim a source assertion can make honestly.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/telegram/attendance/index.jsx"));
const list = strip(read("components/telegram/TelegramMissingDateList.jsx"));
const form = strip(read("components/telegram/TelegramRegularizationForm.jsx"));
const monthNav = strip(read("components/telegram/TelegramMonthNav.jsx"));
const helper = strip(read("helper/telegramAttendance.js"));
const app = read("pages/_app.js");
const all = [page, list, form, monthNav, helper].join("\n");

test("the page is registered as one the shell does not bounce to login", () => {
  assert.ok(/"\/telegram\/attendance":\s*true/.test(app));
});

/* ===================================================================
 * THE STANDALONE SHELL
 *
 * The ordinary _app shell is not passive: UserProvider calls
 * /employee/get-details and /designation/permissions from a mount effect,
 * through util/api.js, which turns their 403 into a redirect to /login. In
 * Telegram's WebView that means the employee never sees the page at all.
 *
 * These tests prove three separate things, and all three are needed:
 *   1. the danger is REAL - that 403 really does resolve to /login;
 *   2. the standalone branch mounts none of the providers that make it;
 *   3. nothing the page imports, transitively, can reach the authenticated
 *      API path anyway.
 * =================================================================== */

/** The JSX the `isStandalone` branch of `render()` returns. */
const standaloneBranch = (() => {
  const marker = app.indexOf("if (isStandalone(this.pathname)) {");
  assert.ok(marker > 0, "_app.js has a standalone render branch");
  const start = app.indexOf("return (", marker);
  const end = app.indexOf("}", app.indexOf(");", start));
  return app.slice(start, end);
})();

const SHELL_ONLY = [
  "UserProvider",
  "ProductsProvider",
  "ModuleTableThemeBridge",
  "StockHoldingBackgroundLoadToast",
  "ToastContainer",
  "Toaster",
];

test("the 403 those providers cause really would redirect the WebView to /login", () => {
  // Not a hypothetical: this is the app's own classifier, asked the exact
  // question an unauthenticated /employee/get-details would ask it.
  const classify403 = require("../../util/handle403");
  assert.deepEqual(classify403({ code: 403, msg: "Access Denied" }, "/telegram/attendance"), {
    href: "/login",
  });
});

test("the standalone shell mounts NO provider that calls an authenticated DNDS API", () => {
  for (const name of SHELL_ONLY) {
    assert.ok(!standaloneBranch.includes(name), `${name} is not in the standalone branch`);
  }
  // It is not empty either - the page and its styling are still there.
  assert.ok(standaloneBranch.includes("ChakraProvider"));
  assert.ok(standaloneBranch.includes("<Component {...pageProps} />"));
});

test("the ordinary shell still mounts all of them - this narrowed nothing else", () => {
  const ordinary = app.slice(app.lastIndexOf("return ("));
  for (const name of SHELL_ONLY) {
    assert.ok(ordinary.includes(name), `${name} still wraps every other page`);
  }
});

test("initUser does not attach a dnds.co.in session for a standalone page", () => {
  const init = app.slice(app.indexOf("initUser()"), app.indexOf("render()"));
  assert.ok(
    /isStandalone\(pathnameOf\(this\.props\)\)\)\s*return;/.test(init),
    "initUser returns early for a standalone path"
  );
  assert.ok(init.indexOf("isStandalone") < init.indexOf("x-access-token"));
});

/**
 * THE ROUTE COMES FROM PROPS, NOT THE `next/router` SINGLETON.
 *
 * `next build` statically prerenders most of this app, and during that there
 * is no router instance: reading the singleton's `pathname` from `render()`
 * throws "No router instance found" and fails the build for EVERY static
 * page, not just this one. Next passes the router to `_app` as a prop for
 * exactly this reason.
 */
test("the standalone check reads the route from props, so the build still prerenders", () => {
  const render = app.slice(app.indexOf("render()"));
  assert.ok(!/isStandalone\(router\.pathname\)/.test(app), "the singleton is not read for this decision");
  assert.ok(/isStandalone\(this\.pathname\)/.test(render));
  assert.ok(
    /props\.router\.pathname/.test(app),
    "pathnameOf prefers the router Next supplies as a prop"
  );
  // The client-only fallback is guarded, so it can never run during SSG.
  const helper = app.slice(app.indexOf("const pathnameOf"), app.indexOf("class MyApp"));
  assert.ok(/typeof window === "undefined"/.test(helper));
});

/**
 * THE REACHABILITY CHECK. Walks every relative import from the Mini App page
 * and proves the authenticated API path is not in the graph at all - so the
 * page could not make one of those calls even if a provider were mounted by
 * mistake.
 */
test("nothing the Mini App imports can reach the ordinary authenticated API", () => {
  const FORBIDDEN = [
    "util/api",
    "contexts/UserContext",
    "helper/employee",
    "helper/designation",
    "components/globalWrapper",
  ];

  const resolve = (fromFile, spec) => {
    const base = path.resolve(path.dirname(fromFile), spec);
    for (const candidate of [
      base,
      `${base}.js`,
      `${base}.jsx`,
      path.join(base, "index.js"),
      path.join(base, "index.jsx"),
    ]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    }
    return null;
  };

  const entry = path.join(root, "pages/telegram/attendance/index.jsx");
  const seen = new Set();
  const stack = [entry];
  const graph = [];

  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    graph.push(path.relative(root, file));

    const src = fs.readFileSync(file, "utf8");
    const specs = [
      ...src.matchAll(/(?:from\s+|require\()\s*["']([^"']+)["']/g),
    ].map((m) => m[1]);

    for (const spec of specs) {
      if (!spec.startsWith(".")) continue; // a package, not our code
      const resolved = resolve(file, spec);
      assert.ok(resolved, `could not resolve ${spec} from ${path.relative(root, file)}`);
      stack.push(resolved);
    }
  }

  // The walk really did traverse - the page, both components, the helper and
  // both utils - rather than trivially passing on an empty graph.
  assert.ok(graph.length >= 5, `walked ${graph.length} files: ${graph.join(", ")}`);
  assert.ok(graph.includes("helper/telegramAttendance.js"));
  assert.ok(graph.includes("util/attendanceV2.js"));

  for (const file of graph) {
    for (const forbidden of FORBIDDEN) {
      assert.ok(
        !file.startsWith(forbidden),
        `${file} is reachable from the Mini App and is part of the authenticated path`
      );
    }
  }
});

test("it is NOT wrapped in the desktop shell", () => {
  assert.ok(!/GlobalWrapper/.test(page), "no sidebar/header wrapper");
  assert.ok(!/CustomContainer/.test(page));
  assert.ok(/viewport/.test(page) && /device-width/.test(page), "it declares a mobile viewport");
});

test("it initialises the Telegram Web App: the SDK, ready() and expand()", () => {
  assert.ok(/telegram-web-app\.js/.test(page), "the official SDK is loaded");
  assert.ok(/window\.Telegram/.test(page));
  assert.ok(/\.ready\(\)/.test(page));
  assert.ok(/\.expand\(\)/.test(page));
});

test("identity is Telegram initData, posted to the session endpoint", () => {
  assert.ok(/webApp\.initData/.test(page), "the page reads initData from the SDK");
  assert.ok(/openSession\(initData\)/.test(page));
  assert.ok(/init_data:\s*initData/.test(helper), "initData is sent verbatim");
});

/**
 * THE CENTRAL SECURITY CLAIM OF THE FRONTEND. No file in the Mini App holds,
 * formats or transmits an employee id in any form.
 */
test("the browser never sends an employee id", () => {
  for (const [name, src] of [["page", page], ["list", list], ["form", form], ["helper", helper]]) {
    assert.ok(!/employee_id/.test(src), `${name} names no employee_id`);
    assert.ok(!/requested_for_employee/.test(src), `${name} names no requested_for_employee_id`);
  }
});

test("there is no employee selector and no branch selector", () => {
  assert.ok(!/SearchableEmployeePicker|EmployeePicker|EmployeeSelect/.test(all));
  assert.ok(!/store_id|outlet_id|branch/i.test(all.replace(/telegram/gi, "")));
  // Nothing that lets somebody pick a person or a place.
  assert.ok(!/<Select|useEmployees|employeeOptions/.test(all));
});

test("there are no approval or admin controls", () => {
  assert.ok(!/approve|decision|reject/i.test(all.replace(/approval/gi, "")), "no approve/decide action");
  assert.ok(!/attendance\/approvals|\/decision/.test(all));
});

test("the ?date= parameter is used only as a navigation hint", () => {
  assert.ok(/navigationHint/.test(page), "the hint goes through the validated reader");
  assert.ok(/highlight=\{hint\}/.test(page), "it only highlights");
  // The hint is never part of a request body.
  assert.ok(!/date:\s*hint/.test(page));
});

test("existing punches are shown READ-ONLY", () => {
  assert.ok(/positionalPunches/.test(form), "punches come from the shared renderer");
  assert.ok(/read only/i.test(form), "and are labelled as read-only");
  // Nothing that could change one.
  assert.ok(!/punch_id/.test(form));
  assert.ok(!/onVoid|VoidPunch|deletePunch|editPunch/.test(form));
});

test("the submission carries exactly a date, a punch time and a reason", () => {
  assert.ok(/buildSubmission/.test(form), "the body is built by the shared helper");
  assert.ok(
    /\{\s*attendance_date,\s*punch_time,\s*reason\s*\}/.test(helper),
    "the helper destructures exactly those three"
  );
});

test("the punch time is built by the shared calendarDateFor, not a second copy", () => {
  const util = read("util/telegramAttendance.js");
  assert.ok(/require\("\.\/attendanceV2"\)/.test(util));
  assert.ok(/calendarDateFor\(day, time\)/.test(util));
  // No second cutoff rule anywhere in the Mini App.
  assert.ok(!/attendance_day_cutoff/.test(all), "no screen re-derives the cutoff");
});

test("time and reason are both required fields", () => {
  assert.ok(/type="time"/.test(form));
  assert.ok(/Textarea/.test(form));
  assert.equal((form.match(/isRequired/g) || []).length, 2);
});

test("no punch count is rendered anywhere", () => {
  assert.ok(!/punch_count/.test(all), "no screen reads a punch count");
  assert.ok(!/Punches recorded/i.test(all));
});

test("the bot token is nowhere near the frontend", () => {
  assert.ok(!/BOT_TOKEN|botToken|TELEGRAM_BOT/i.test(all));
  assert.ok(!/NEXT_PUBLIC_TELEGRAM/.test(all));
});

test("the Mini App uses its own header and its own axios instance", () => {
  assert.ok(/x-telegram-session/.test(helper));
  assert.ok(!/x-access-token/.test(helper), "it never sends the dnds.co.in session");
  assert.ok(!/from "\.\.\/util\/api"/.test(helper), "it does not reuse the redirecting instance");
});

test("a successful submit says so and refreshes BOTH sections at once", () => {
  assert.ok(/Regularisation submitted/.test(page));
  assert.ok(/Your request has been sent for approval\./.test(page));
  const submitBody = page.slice(page.indexOf("const submit = async"), page.indexOf("const banner"));
  assert.ok(/loadCorrections\(\)/.test(submitBody), "the correction list is reloaded immediately");
  assert.ok(/loadMonth\(month\)/.test(submitBody), "My Attendance is refreshed too");
  assert.ok(submitBody.indexOf("await Promise.all") > 0);
});

/* ===================================================================
 * THE TWO SECTIONS
 * =================================================================== */

test("My Attendance is the DEFAULT section and Corrections is separate", () => {
  const tabList = page.slice(page.indexOf("<TabList"), page.indexOf("</TabList>"));
  const tabs = [...tabList.matchAll(/<Tab>([^<]+)<\/Tab>/g)].map((m) => m[1].trim());
  assert.deepEqual(tabs, ["My Attendance", "Corrections"]);
  // Tab zero is what Chakra opens on, and no defaultIndex moves it.
  assert.ok(!/defaultIndex/.test(page), "nothing overrides the default tab");
});

test("My Attendance renders the EXISTING attendance list and detail", () => {
  assert.ok(/components\/attendance\/AttendanceDayList/.test(page));
  assert.ok(/components\/attendance\/AttendanceDayDetail/.test(page));
  assert.ok(/<AttendanceDayList/.test(page));
  assert.ok(/<AttendanceDayDetail/.test(page));
});

/**
 * The Day Detail renders Regularize / Request OT / Edit Shift ONLY when the
 * matching handler is supplied. Supplying none is what makes it read-only,
 * so this asserts none is supplied.
 */
test("the day detail is read-only - no action handler is passed", () => {
  const detail = page.slice(page.indexOf("<AttendanceDayDetail"), page.length);
  assert.ok(!/onRegularize/.test(detail));
  assert.ok(!/onRequestOt/.test(detail));
  assert.ok(!/onEditShift/.test(detail));
  // It is genuinely mounted, not simply absent.
  assert.ok(/day=\{selectedDay\}/.test(detail));
});

test("no attendance state is decided in the Mini App", () => {
  // No status vocabulary of its own: the engine's statuses are rendered by
  // util/attendanceV2.js, which the shared components already use.
  for (const invented of ["REVIEW_REQUIRED", "NO_SHIFT_FOR_DATE", "FINAL", "ABSENT", "dayIssue("]) {
    assert.ok(!all.includes(invented), `${invented} is not restated in the Mini App`);
  }
});

test("month navigation never goes past the current month", () => {
  assert.ok(/canGoNext/.test(monthNav), "the rule is the shared one");
  assert.ok(/isDisabled=\{isDisabled \|\| !forwardAllowed\}/.test(monthNav));
  assert.ok(/previousMonth/.test(monthNav) && /nextMonth/.test(monthNav));
});

test("the month read sends only a month", () => {
  assert.ok(/params:\s*\{\s*month\s*\}/.test(helper));
  assert.ok(/getMonth:\s*\(month\)/.test(helper));
});

/**
 * Not only `employee_id`: an outlet, a store, a designation or an approval
 * role would each be a way for the browser to widen what it can see.
 */
test("the browser supplies no outlet, store, designation or approval role", () => {
  for (const field of [
    "employee_id",
    "requested_for_employee_id",
    "store_id",
    "outlet_id",
    "designation_id",
    "approver_role",
    "approval_role",
  ]) {
    assert.ok(!page.includes(field), `the page sends no ${field}`);
    assert.ok(!helper.includes(field), `the helper sends no ${field}`);
    assert.ok(!list.includes(field), `the list sends no ${field}`);
    assert.ok(!form.includes(field), `the form sends no ${field}`);
    assert.ok(!monthNav.includes(field), `the month nav sends no ${field}`);
  }
});

test("the list reflects state and offers no button on a pending date", () => {
  assert.ok(/can_submit/.test(strip(read("util/telegramAttendance.js"))));
  assert.ok(/detail\.can_submit/.test(form), "the form obeys the server's verdict");
  assert.ok(/state_label/.test(form), "and shows the current state instead");
});
