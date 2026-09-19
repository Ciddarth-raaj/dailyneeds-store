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
const otList = strip(read("components/telegram/TelegramOtDateList.jsx"));
const otForm = strip(read("components/telegram/TelegramOtRequestForm.jsx"));
const monthNav = strip(read("components/telegram/TelegramMonthNav.jsx"));
const help = strip(read("components/telegram/TelegramHelp.jsx"));
const helper = strip(read("helper/telegramAttendance.js"));
const app = read("pages/_app.js");
const all = [page, list, form, otList, otForm, monthNav, help, helper].join("\n");

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
  /*
   * WHAT THIS ASSERTS, AND WHY IT IS NOT A WORD BLACKLIST ANY MORE.
   *
   * The Mini App now REPORTS approval outcomes - a card reads "Approved
   * 01:30", "Rejected", "Decided 16 Sep 2026 10:00" - because an employee
   * who claimed overtime has to be told what came of it. Those are states
   * the screen displays, not powers it holds, so banning the word would ban
   * the reporting rather than the capability.
   *
   * The capability is what is banned here: no handler that decides, no
   * button that approves or rejects, and no approval endpoint anywhere in
   * the graph. A Mini App that gained any of the three would fail this.
   */
  assert.ok(
    !/onApprove|onReject|onDecide|decideApproval|handleApprove|handleReject/.test(all),
    "no decision handler"
  );
  assert.ok(
    !/>\s*(Approve|Reject|Decide)\s*</.test(all),
    "no button that approves, rejects or decides"
  );
  assert.ok(!/attendance\/approvals|\/decision/.test(all), "no approval endpoint");
  // The approval SCREENS are a different app and are not imported here.
  assert.ok(!/ApprovalQueue|attendance\/approval/.test(all));
});

test("the ?date= parameter is used only as a navigation hint", () => {
  assert.ok(/navigationHint/.test(page), "the hint goes through the validated reader");
  assert.ok(/highlight=\{hint\}/.test(page), "it only highlights");
  // The hint is never part of a request body.
  assert.ok(!/date:\s*hint/.test(page));
});

/**
 * Both readers work off ONE query string read once, so the alert's
 * `?section=corrections&date=…` cannot open the right tab but highlight
 * nothing, or vice versa.
 */
/**
 * BACKWARD COMPATIBILITY. Alert buttons already sent as `?date=…` with no
 * section must still open Corrections. The page delegates the whole rule to
 * `sectionFromQuery`, so this asserts the delegation rather than restating
 * the rule (which `util/telegramAttendance.test.js` owns).
 */
test("the page derives its tab from sectionFromQuery, so legacy ?date= links work", () => {
  const { sectionFromQuery, sectionIndex, SECTION } = require("../../util/telegramAttendance");
  assert.match(page, /setTabIndex\(sectionIndex\(sectionFromQuery\(search\)\)\)/);
  // No competing rule in the page that could override it.
  assert.ok(!/section\s*===/.test(page), "the page decides no section of its own");
  assert.equal(sectionIndex(sectionFromQuery("?date=2026-09-18")), 1);
  assert.equal(sectionFromQuery("?date=2026-09-18"), SECTION.CORRECTIONS);
});

test("section and date are read from the same single query-string read", () => {
  const effect = page.slice(page.indexOf("const search ="), page.indexOf("const initData"));
  assert.match(effect, /const search = typeof window === "undefined" \? "" : window\.location\.search;/);
  assert.match(effect, /setHint\(navigationHint\(search\)\)/);
  assert.match(effect, /setTabIndex\(sectionIndex\(sectionFromQuery\(search\)\)\)/);
});

test("neither section nor date is ever sent to the API", () => {
  assert.ok(!/section/.test(helper), "the helper sends no section");
  const bodies = page.match(/TelegramAttendanceHelper\.\w+\([^)]*\)/g) || [];
  assert.ok(bodies.length > 0);
  for (const call of bodies) {
    assert.ok(!/section|hint/.test(call), `${call} must not carry navigation state`);
  }
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

test("the four sections are My Attendance, Corrections, OT Requests and Help, in that order", () => {
  // The captions are rendered from SECTION_ORDER, so the ORDER is the thing
  // to assert and it lives in one place - a tab cannot be listed in the
  // captions in a different order from the one `?section=` resolves against.
  const { SECTION, SECTION_ORDER, SECTION_LABEL } = require("../../util/telegramAttendance");
  assert.deepEqual(SECTION_ORDER, [
    SECTION.ATTENDANCE,
    SECTION.CORRECTIONS,
    SECTION.OT,
    SECTION.HELP,
  ]);
  assert.deepEqual(SECTION_ORDER.map((k) => SECTION_LABEL[k]), [
    "My Attendance",
    "Corrections",
    "OT Requests",
    "Help",
  ]);
  const tabList = page.slice(page.indexOf("<TabList"), page.indexOf("</TabList>"));
  assert.match(tabList, /SECTION_ORDER\.map/);
  assert.match(tabList, /SECTION_LABEL\[key\]/);
});

/**
 * CONTROLLED TABS. Uncontrolled ones always open tab 0, which is why the bot
 * menu's `?section=corrections` link could not have worked before.
 */
test("the tabs are CONTROLLED and seeded from ?section= on load", () => {
  assert.match(page, /index=\{tabIndex\}/, "the Tabs index is state");
  assert.match(page, /onChange=\{\(next\) => setTabIndex\(/, "tapping a tab updates that state");
  assert.match(page, /setTabIndex\(sectionIndex\(sectionFromQuery\(search\)\)\)/);
  assert.ok(!/defaultIndex/.test(page), "no defaultIndex fighting the controlled index");
  // My Attendance remains the default the state starts on.
  assert.match(page, /useState\(0\)/);
});

test("Help is a section of its own, with no approval control", () => {
  assert.match(page, /<TelegramHelp \/>/);
  assert.match(help, /HELP_LINES/, "the text is the shared value, not inline JSX");
  assert.ok(!/approve|reject|decision/i.test(help.replace(/approval/gi, "")));
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

/* ===================================================================
 * THE OT REQUESTS TAB
 *
 * A Mini App tab over the SAME month read and the SAME OT engine. The
 * claims worth asserting are the ones a source can honestly make: that this
 * tab makes no read of its own, that no OT figure is computed on this side,
 * and that there is no field anywhere on it into which a duration could be
 * typed or from which one could be sent.
 * =================================================================== */

test("OT Requests sits beside Corrections and is rendered from the month already loaded", () => {
  assert.match(page, /<TelegramOtDateList/);
  const panels = page.slice(page.indexOf("<TabPanels>"));
  assert.ok(
    panels.indexOf("TelegramMissingDateList") < panels.indexOf("TelegramOtDateList"),
    "Corrections comes before OT Requests"
  );
  assert.ok(
    panels.indexOf("TelegramOtDateList") < panels.indexOf("<TelegramHelp"),
    "Help stays last"
  );
  // The SAME days, filtered by the shared helper - not a second request.
  assert.match(page, /days=\{otRequestRows\(days\)\}/);
  assert.ok(!/getOtDates|getOtRequests|otMonth/.test(page), "no OT-specific read exists");
});

test("the OT tab adds no read to the Mini App API surface", () => {
  // Exactly the five calls the Mini App has ever had, plus the OT write.
  const calls = [...helper.matchAll(/client\s*\.\s*(get|post)\(\s*"([^"]+)"/g)].map(
    (m) => `${m[1].toUpperCase()} ${m[2]}`
  );
  assert.deepEqual(calls.sort(), [
    "GET /telegram/attendance/date",
    "GET /telegram/attendance/missing-dates",
    "GET /telegram/attendance/month",
    "POST /telegram/attendance/ot-request",
    "POST /telegram/attendance/regularization",
    "POST /telegram/attendance/session",
  ]);
});

test("the OT submission sends a date and a reason, and has no field for minutes", () => {
  const fn = helper.slice(helper.indexOf("submitOtRequest"));
  assert.match(fn, /"\/telegram\/attendance\/ot-request"/);
  assert.match(fn, /\{ attendance_date, reason \}/);
  assert.ok(!/minutes/.test(fn), "no duration field on the wire");
  assert.ok(!/employee_id/.test(fn), "no employee id on the wire");
  // The page hands the form's own object through; it never spreads a day.
  assert.match(page, /submitOtRequest\(body\)/);
  assert.match(otForm, /onSubmit\(\{ attendance_date: day\.attendance_date, reason: trimmed \}/);
  assert.ok(!/\.\.\.day/.test(otForm), "the day object is never spread into a body");
});

test("the OT duration cannot be typed: the form has exactly one input, the reason", () => {
  assert.ok(!/type="number"/.test(otForm), "no numeric input");
  assert.ok(!/<Input/.test(otForm), "no Input at all - the reason is a Textarea");
  assert.equal((otForm.match(/<Textarea/g) || []).length, 1, "one field, and it is the reason");
  assert.match(otForm, /Calculated OT \(read only\)/);
  assert.match(otForm, /It cannot be changed here/);
  assert.match(otForm, /if \(trimmed\.length < 5\)/, "a reason is required before submit");
});

test("no OT figure is computed on the Telegram side", () => {
  for (const [name, src] of [["list", otList], ["form", otForm]]) {
    assert.ok(!/[-+*/]\s*60\b/.test(src), `${name}: no minute arithmetic`);
    assert.ok(!/candidate_ot_minutes\s*[-+*/]/.test(src), `${name}: the engine's figure is not adjusted`);
    assert.ok(!/new Date\(/.test(src), `${name}: no date maths on the punches it displays`);
  }
  // Everything the card shows comes from the shared util, which reads the
  // day the server sent.
  assert.match(otList, /otCard\(day\)/);
  assert.match(otForm, /otCard\(day\)/);
});

test("the OT card shows the agreed columns and the whole request history", () => {
  ["Worked", "NRM", "Eligible OT"].forEach((label) => {
    assert.ok(otList.includes(`"${label}"`) || otList.includes(`>${label}<`), `the ${label} figure`);
  });
  assert.match(otList, /card\.punches/, "the punch summary");
  assert.match(otList, /card\.shift/, "the shift");
  assert.match(otList, /card\.label/, "the status");
  assert.match(otList, /Requested OT:/);
  assert.match(otList, /Reason: \{card\.reason\}/);
  assert.match(otList, /Rejected: \{card\.rejection_reason\}/);
  assert.match(otList, /Submitted \{displayDateTime\(card\.requested_at\)\}/);
  assert.match(otList, /Decided \{displayDateTime\(card\.decided_at\)\}/);
});

test("a blocked date is not tappable and says what to do instead", () => {
  assert.match(otList, /card\.can_submit \? \(\) => onSelect/);
  assert.match(otList, /card\.blocked_reason/);
  assert.match(otForm, /card\.can_submit \?/);
  const util = read("util/attendanceV2.js");
  assert.match(util, /OT_BLOCKED_BY_CORRECTION = "Complete attendance correction first\."/);
});

test("the OT tab raises no correction and the Corrections tab raises no OT", () => {
  assert.ok(!/Regulari[sz]ation/.test(otList) && !/Regulari[sz]ation/.test(otForm.replace(/Regularized/g, "")));
  assert.ok(!/ot-request|candidate_ot|Request OT/i.test(list));
});

test("the OT tab reports decisions and can make none", () => {
  const ot = [otList, otForm].join("\n");
  // It REPORTS: the three outcomes an employee needs to see.
  assert.match(otList, /card\.approved_ot/);
  assert.match(otList, /card\.rejection_reason/);
  assert.match(otList, /card\.decided_at/);
  // It DECIDES nothing: no handler, no button, no endpoint.
  assert.ok(!/onApprove|onReject|onDecide|decideApproval/.test(ot), "no decision handler");
  assert.ok(!/>\s*(Approve|Reject|Decide)\s*</.test(ot), "no decision button");
  assert.ok(!/attendance\/approvals|\/decision/.test(ot), "no approval endpoint");
  // The one write it can make is the employee's own request.
  const writes = [...ot.matchAll(/onSubmit\(/g)];
  assert.equal(writes.length, 1, "one submit, and it is the OT request");
});
