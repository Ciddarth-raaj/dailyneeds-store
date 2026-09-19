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
const helper = strip(read("helper/telegramAttendance.js"));
const app = read("pages/_app.js");
const all = [page, list, form, helper].join("\n");

test("the page is registered as one the shell does not bounce to login", () => {
  assert.ok(/"\/telegram\/attendance":\s*true/.test(app));
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

test("a successful submit says so and refreshes the list at once", () => {
  assert.ok(/Regularisation submitted/.test(page));
  assert.ok(/Your request has been sent for approval\./.test(page));
  assert.ok(/await loadDates\(\)/.test(page), "the list is reloaded immediately");
});

test("the list reflects state and offers no button on a pending date", () => {
  assert.ok(/can_submit/.test(strip(read("util/telegramAttendance.js"))));
  assert.ok(/detail\.can_submit/.test(form), "the form obeys the server's verdict");
  assert.ok(/state_label/.test(form), "and shows the current state instead");
});
