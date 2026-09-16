/**
 * THE TELEGRAM SCREENS' WIRING, asserted against the source.
 *
 *   node --test components/hr/telegramWiring.test.js
 *
 * `util/employeeTelegram.test.js` proves the RULES. This proves the screens
 * are plugged into them, and that the things which must NEVER appear in the
 * page do not - which is not something a rules test can see.
 *
 * Source-text assertions, in the style of `employeeProfileWiring.test.js`,
 * because these are Chakra/Next components and this repository has no React
 * test runner.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(repoRoot, p), "utf8");
/** Comments explain the old patterns verbatim, so assertions read CODE only. */
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const panel = read("components/hr/TelegramSetupPanel.jsx");
const panelCode = codeOf(panel);
const hook = read("customHooks/useEmployeeTelegram.js");
const hookCode = codeOf(hook);
const helper = read("helper/employeeTelegram.js");
const helperCode = codeOf(helper);
const wizard = read("pages/hr/employees/new.jsx");
const wizardCode = codeOf(wizard);
const profile = read("pages/hr/employees/[id].jsx");
const profileCode = codeOf(profile);
const section = read("components/hr/profile/TelegramSection.jsx");
const dashboard = read("pages/hr/onboarding/index.jsx");
const dashboardCode = codeOf(dashboard);
const queue = read("util/hrOnboardingQueue.js");

/* ============================================================ the API === */

test("the three endpoints are the deployed ones, and the bodies are empty", () => {
  assert.match(helperCode, /API\.get\(`\/hr\/employee\/\$\{employeeId\}\/telegram`\)/);
  assert.match(helperCode, /API\.post\(`\/hr\/employee\/\$\{employeeId\}\/telegram\/link-token`, \{\}\)/);
  assert.match(helperCode, /API\.post\(`\/hr\/employee\/\$\{employeeId\}\/telegram\/disconnect`, \{\}\)/);
});

test("THE LINK-TOKEN BODY CARRIES NOTHING - the server refuses a body that names anything", () => {
  const call = /link-token`,\s*(\{[^}]*\})/.exec(helperCode);
  assert.ok(call, "the call is there");
  assert.equal(call[1].replace(/\s/g, ""), "{}");
});

/* ======================================================== the credential = */

test("THE RAW LINK IS NEVER WRITTEN ANYWHERE PERSISTENT", () => {
  // It is a working one-time credential. Memory only, for as long as the QR
  // is on screen.
  for (const [name, src] of [
    ["the panel", panelCode],
    ["the hook", hookCode],
    ["the helper", helperCode],
    ["the wizard", wizardCode],
    ["the profile", profileCode],
  ]) {
    for (const forbidden of ["localStorage", "sessionStorage", "document.cookie", "console.log"]) {
      assert.ok(!src.includes(forbidden), `${name} must not use ${forbidden}`);
    }
  }
});

test("the link is encoded into the QR and used as an href - never printed as text", () => {
  assert.match(panelCode, /<QRCodeSVG\s+value=\{link\}/, "encoded into the QR");
  assert.match(panelCode, /<Link href=\{link\}/, "and used as the Open Telegram href");
  // The one thing that must not exist: the value rendered as readable text.
  assert.ok(!/>\s*\{link\}\s*</.test(panelCode), "the link must never be rendered as text");
  assert.ok(!/toast[\s\S]{0,80}\{link\}/.test(panelCode), "and never put in a toast");
});

test("an expired link is DROPPED from state, not merely hidden", () => {
  assert.match(hookCode, /setExpired\(true\);\s*setLink\(null\);/);
});

test("the hook holds the link in React state and nowhere else", () => {
  assert.match(hookCode, /const \[link, setLink\] = useState\(null\)/);
});

/* ============================================================ polling === */

test("polling is decided by the shared rule, not by the component", () => {
  assert.match(hookCode, /shouldPollTelegram\(\{[\s\S]*?\}\)/);
  assert.match(hookCode, /TELEGRAM_POLL_INTERVAL_MS/);
});

test("THE POLL WATCHES THE ATTEMPT, NOT THE IDENTITY - which is what makes reconnect work", () => {
  // During a reconnect the employee stays CONNECTED on their old account, so
  // a rule that stopped at CONNECTED would stop the instant the QR appeared.
  assert.match(hookCode, /const attempt = \(status && status\.link_attempt\) \|\| null;/);
  assert.match(hookCode, /shouldPollTelegram\(\{ status: status && status\.status, attempt, hasLiveLink \}\)/);
});

test("a settled attempt closes the QR", () => {
  assert.match(hookCode, /attemptVerified\(attempt\) \|\| attemptMismatched\(attempt\)/);
});

test("THE POLL IS CLEARED WHEN THE EFFECT ENDS - which is what unmount does", () => {
  const effect = /if \(!polling\) return undefined;[\s\S]*?\}, \[polling, refresh\]\);/.exec(hookCode);
  assert.ok(effect, "the polling effect is there");
  assert.match(effect[0], /setInterval\(/);
  assert.match(effect[0], /return \(\) => clearInterval\(timer\)/, "and cleaned up");
});

test("there is no global or background poller", () => {
  // Every interval in the hook belongs to an effect that cleans it up.
  const intervals = (hookCode.match(/setInterval\(/g) || []).length;
  const clears = (hookCode.match(/clearInterval\(/g) || []).length;
  assert.equal(intervals, clears, "every interval is cleared");
  assert.ok(!hookCode.includes("window."), "nothing is hung off the window");
});

test("a request that resolves after unmount cannot set state", () => {
  assert.match(hookCode, /alive\.current = false/);
  assert.match(hookCode, /if \(!alive\.current\) return/);
});

/* ===================================================== what is rendered = */

test("NO MOBILE NUMBER, TELEGRAM USER ID OR CHAT ID IS EVER RENDERED", () => {
  for (const forbidden of [
    "primary_contact_number",
    "telegram_user_id",
    "private_chat_id",
    "chat_id",
    "verified_mobile",
    "mobile_number",
  ]) {
    assert.ok(!panelCode.includes(forbidden), `the panel must not render ${forbidden}`);
    assert.ok(!codeOf(section).includes(forbidden), `the card must not render ${forbidden}`);
  }
});

test("the mismatch message names NEITHER number", () => {
  const mismatch = /MOBILE_MISMATCH &&[\s\S]*?\)\}/.exec(panel);
  assert.ok(mismatch, "the mismatch branch is there");
  assert.match(mismatch[0], /does not match the mobile recorded for this employee/);
  assert.match(mismatch[0], /Correct the employee mobile number and generate a new QR/);
  assert.ok(!/\d{6,}/.test(mismatch[0]), "no run of digits that could be a number");
});

test("connected says Groups Pending, and never claims completion", () => {
  assert.match(panelCode, /telegramLabel/);
  assert.match(panel, /Group assignment will be completed after Telegram Group\s*\n?\s*Mapping is configured/);
  assert.ok(!/Telegram Complete/.test(panel), "nothing claims Telegram is complete");
});

test("the instruction tells the employee to use the button, not to type", () => {
  assert.match(panel, /tap Share Phone Number\. Do not type the number manually/);
});

test("the QR fits a phone - no horizontal scrolling", () => {
  assert.match(panelCode, /maxWidth: "100%"/);
});

/* ========================================================== reconnect === */

test("CHANGE TELEGRAM GENERATES A LINK AND DOES NOT DISCONNECT FIRST", () => {
  // The backend replaces an identity atomically only once the new account has
  // verified, so disconnecting first would throw away a working connection
  // for a verification that might never happen.
  const change = /\{connected \? "Change Telegram" : "Generate Telegram QR"\}/.exec(panelCode);
  assert.ok(change, "the Change Telegram button is there");
  const button = /<Button size="sm" colorScheme="telegram" onClick=\{generate\}[\s\S]*?<\/Button>/.exec(panelCode);
  assert.ok(button, "and it is wired to generate");
  assert.ok(!button[0].includes("disconnect"), "it must never call disconnect");
});

test("ONLY the explicit Disconnect action calls the disconnect endpoint", () => {
  const calls = (panelCode.match(/disconnect\(\)/g) || []).length;
  assert.equal(calls, 1, "exactly one call site");
  const confirm = /Disconnect this employee&apos;s Telegram account\?[\s\S]*?disconnect\(\)/.exec(panel);
  assert.ok(confirm, "and it is behind the confirmation");
});

test("the disconnect is confirmed before it runs", () => {
  assert.match(panelCode, /confirmingDisconnect/);
  assert.match(panel, /Disconnect this employee&apos;s Telegram account\?/);
});

test("the status is refreshed after a disconnect", () => {
  const fn = /const disconnect = useCallback\(async \(\) => \{[\s\S]*?\}, \[employeeId, refresh\]\);/.exec(hookCode);
  assert.ok(fn);
  assert.match(fn[0], /await refresh\(\)/);
});

/* ======================================================== the onboarding = */

test("TELEGRAM COMES AFTER THE EMPLOYEE EXISTS, AND IS THE MANAGER'S LAST STAGE", () => {
  const { ONBOARDING_STAGES, CREATE_STAGE_KEY, isFinalStage } = require("../../util/hrOnboarding");
  const keys = ONBOARDING_STAGES.map((s) => s.key);
  assert.deepEqual(keys, ["aadhaar", "personal", "employment", "telegram"]);
  assert.ok(keys.indexOf("telegram") > keys.indexOf(CREATE_STAGE_KEY), "after the create stage");
  assert.equal(keys[keys.indexOf("telegram") - 1], "employment");
  assert.ok(isFinalStage(keys.indexOf("telegram")), "and nothing follows it");
});

test("the wizard's Telegram stage runs against the CREATED employee id", () => {
  const stage = /stageKey === "telegram" \? \([\s\S]*?\) : null\}/.exec(wizardCode);
  assert.ok(stage, "the stage is rendered");
  assert.match(stage[0], /employeeId=\{created\.employee_id\}/);
  assert.match(stage[0], /canManage/);
});

test("and refuses to offer setup when there is no employee yet", () => {
  const stage = /stageKey === "telegram" \? \([\s\S]*?\) : null\}/.exec(wizardCode);
  assert.match(stage[0], /created \?/, "it is conditional on the employee existing");
  assert.match(stage[0], /has to be created before Telegram can be connected/);
});

test("CONNECTED OFFERS Finish; NOT CONNECTED OFFERS Skip for now & Finish", () => {
  const footer = /stageKey === "telegram" \? \([\s\S]*?\) : stageKey === "aadhaar"/.exec(wizardCode);
  assert.ok(footer, "the Telegram footer button is there");
  assert.match(
    footer[0],
    /\{telegramConnected \? "Finish" : "Skip for now & Finish"\}/,
    "offering to skip something already done would be a puzzle"
  );
  assert.match(footer[0], /onClick=\{finish\}/);
});

test("EITHER ENDING GOES TO THE CREATED EMPLOYEE'S PROFILE", () => {
  const finish = /const finish = \(\) => \{[\s\S]*?\};/.exec(wizardCode);
  assert.ok(finish, "there is one finish path");
  assert.match(finish[0], /router\.push\(`\/hr\/employees\/\$\{created\.employee_id\}`\)/);
  // It writes nothing: skipping creates no Telegram state at all.
  assert.ok(!/telegram/i.test(finish[0]), "the finish path touches no Telegram API");
  // No TELEGRAM skipped flag is invented - skipping means only that no
  // connected identity exists. (`aadhaarSkipped` is the pre-existing Aadhaar
  // decision and is a different thing entirely.)
  assert.ok(
    !/telegram_skipped|telegramSkipped/i.test(wizardCode),
    "skipping records nothing about Telegram"
  );
});

test("the connected state comes from the BACKEND, never from having generated a QR", () => {
  assert.match(wizardCode, /onStatusChange=\{setTelegramConnected\}/);
  const panel = panelCode;
  assert.match(panel, /onStatusChange\(connected\)/);
  assert.match(panel, /const connected = isConnected\(current\)/, "read off the status the server sent");
});

test("EDUCATION IS GONE FROM THE WIZARD AND STILL PRESENT IN EMPLOYEE MASTER", () => {
  assert.ok(!/stageKey === "education"/.test(wizardCode));
  assert.ok(!/saveOnboardingEducation/.test(wizardCode));
  assert.match(profileCode, /<EducationSection/);
});

/* ==================================================== the employee master */

test("the profile renders the Telegram card, reusing the same panel", () => {
  assert.match(profileCode, /<TelegramSection/);
  assert.match(codeOf(section), /<TelegramSetupPanel/, "one implementation, not two");
});

test("the card's actions are gated on the same OR the backend enforces", () => {
  assert.match(profileCode, /const mayManageTelegram = canManageTelegram\(actor\)/);
  assert.match(profileCode, /canManage=\{mayManageTelegram/);
});

test("a view-only user is offered no mutation at all", () => {
  // Every action in the panel sits behind `canManage`.
  for (const action of ["Generate Telegram QR", "Disconnect Telegram", "Generate New QR"]) {
    assert.ok(panel.includes(action), `${action} exists`);
  }
  const gated = panelCode.split("{canManage &&").length - 1;
  assert.ok(gated >= 3, "the QR, the actions and the expiry notice are all gated");
});

/* ======================================================== the dashboard = */

test("THE DASHBOARD READS TELEGRAM FROM THE STATUS SUMMARY, not per employee", () => {
  assert.ok(
    !dashboardCode.includes("/telegram"),
    "the dashboard must not call the per-employee Telegram endpoint"
  );
  assert.ok(
    !dashboardCode.includes("EmployeeTelegramHelper") && !dashboardCode.includes("useEmployeeTelegram"),
    "and must not reach for the single-employee hook"
  );
  assert.match(dashboardCode, /telegramLabel\(row\.telegram_status/, "it renders the summary's field");
});

test("the summary's Telegram fields are carried through the index", () => {
  const status = codeOf(read("util/hrStatus.js"));
  assert.match(status, /entry\.telegram_status = row\.telegram_status/);
  assert.match(status, /entry\.telegram_connected = Boolean\(row\.telegram_connected\)/);
});

test("TELEGRAM IS NOT PART OF THE HR COUNT - it is tracked, not gating", () => {
  // Asserted as BEHAVIOUR rather than by grepping near the assignment: a
  // proximity regex matches the Telegram block that merely sits next to it.
  const { queueRow, queueCounts } = require("../../util/hrOnboardingQueue");
  const hrComplete = { hr_onboarding_pending: false };

  const connected = queueRow({ employee_id: 1, status: 1 }, { ...hrComplete, telegram_status: "CONNECTED" });
  const notConnected = queueRow({ employee_id: 2, status: 1 }, { ...hrComplete, telegram_status: "PENDING" });

  assert.equal(connected.overall, notConnected.overall, "Telegram does not move the HR answer");
  assert.equal(notConnected.hr, "COMPLETE", "an HR-complete employee stays complete");
  const counts = queueCounts([connected, notConnected]);
  assert.equal(counts.hr, 0, "neither is HR pending");
  assert.equal(counts.telegram, 1, "and exactly one is Telegram pending");
});

test("an employee the server did not answer for is not put on the queue", () => {
  const { queueRow, queueCounts } = require("../../util/hrOnboardingQueue");
  const row = queueRow({ employee_id: 1, status: 1 }, {});
  assert.equal(row.telegram, "UNKNOWN");
  assert.equal(queueCounts([row]).telegram, 0);
});

test("the dashboard's population rule is untouched - inactive rows stay out", () => {
  const { filterQueue, queueRow } = require("../../util/hrOnboardingQueue");
  const resigned = queueRow({ employee_id: 2, status: 0 }, {});
  const active = queueRow({ employee_id: 3, status: 1 }, { telegram_status: "PENDING" });
  const shown = filterQueue([resigned, active], { filter: "telegram" });
  assert.deepEqual(shown.map((r) => r.employee_id), [3], "a resigned employee is never pulled in");
});

test("each Telegram state maps to the label the dashboard shows", () => {
  const { queueRow } = require("../../util/hrOnboardingQueue");
  const { telegramLabel } = require("../../util/employeeTelegram");
  const cases = {
    PENDING: "Pending",
    AWAITING_CONTACT: "Waiting for Verification",
    MOBILE_MISMATCH: "Mobile Mismatch",
    CONNECTED: "Connected - Groups Pending",
  };
  for (const [status, label] of Object.entries(cases)) {
    const row = queueRow({ employee_id: 1, status: 1 }, { telegram_status: status });
    assert.equal(row.telegram_status, status);
    assert.equal(telegramLabel(row.telegram_status, { short: true }), label);
  }
});

/* ========================================================== reconnect === */

test("A LIVE RECONNECT QR KEEPS POLLING THOUGH THE EMPLOYEE IS CONNECTED", () => {
  const { shouldPollTelegram } = require("../../util/employeeTelegram");
  assert.equal(
    shouldPollTelegram({ status: "CONNECTED", attempt: "AWAITING_CONTACT", hasLiveLink: true }),
    true,
    "the new account has not verified yet"
  );
  assert.equal(
    shouldPollTelegram({ status: "CONNECTED", attempt: "PENDING", hasLiveLink: true }),
    true,
    "nor has it even been opened"
  );
});

test("THE OLD IDENTITY'S CONNECTED STATE IS NEVER TAKEN AS THE NEW QR SUCCEEDING", () => {
  const { isReconnectInFlight } = require("../../util/employeeTelegram");
  assert.equal(
    isReconnectInFlight({ status: "CONNECTED", attempt: "AWAITING_CONTACT", hasLiveLink: true }),
    true
  );
  // And the panel says so rather than showing the old success beside a QR.
  assert.match(panelCode, /const reconnecting = isReconnectInFlight\(/);
  assert.match(panelCode, /\{connected && !reconnecting &&/, "the success block yields to it");
  assert.match(panel, /Waiting for the new Telegram account to be verified/);
});

test("a successful reconnect is detected, and stops the poll", () => {
  const { shouldPollTelegram, attemptVerified } = require("../../util/employeeTelegram");
  assert.ok(attemptVerified("VERIFIED"));
  assert.equal(
    shouldPollTelegram({ status: "CONNECTED", attempt: "VERIFIED", hasLiveLink: true }),
    false
  );
});

test("a mismatched reconnect is detected, and stops the poll", () => {
  const { shouldPollTelegram, attemptMismatched } = require("../../util/employeeTelegram");
  assert.ok(attemptMismatched("MOBILE_MISMATCH"));
  assert.equal(
    shouldPollTelegram({ status: "CONNECTED", attempt: "MOBILE_MISMATCH", hasLiveLink: true }),
    false
  );
});

test("EXPIRY STOPS RECONNECT POLLING TOO", () => {
  const { shouldPollTelegram } = require("../../util/employeeTelegram");
  assert.equal(
    shouldPollTelegram({ status: "CONNECTED", attempt: "AWAITING_CONTACT", hasLiveLink: false }),
    false
  );
});

test("a failed reconnect leaves the old connection intact and displayed", () => {
  // Nothing in the frontend disconnects on failure: the backend keeps the old
  // identity, and the panel falls back to showing it.
  assert.equal((panelCode.match(/disconnect\(\)/g) || []).length, 1, "one disconnect call site");
  const confirm = /confirmingDisconnect[\s\S]*?disconnect\(\)/.exec(panelCode);
  assert.ok(confirm, "and it is the confirmed one");
});

/* ========================================================== dashboard === */

test("THE CARD AND THE FILTER BOTH READ 'Telegram Connection Pending'", () => {
  const { QUEUE_CARDS, QUEUE_FILTERS } = require("../../util/hrOnboardingQueue");
  assert.equal(QUEUE_CARDS.find((c) => c.filter === "telegram").label, "Telegram Connection Pending");
  assert.equal(QUEUE_FILTERS.find((f) => f.value === "telegram").label, "Telegram Connection Pending");
});

test("connection work is counted, and a connected employee is NOT", () => {
  const { queueRow, queueCounts } = require("../../util/hrOnboardingQueue");
  const row = (id, status) => queueRow({ employee_id: id, status: 1 }, { telegram_status: status });
  const counts = queueCounts([
    row(1, "PENDING"),
    row(2, "AWAITING_CONTACT"),
    row(3, "MOBILE_MISMATCH"),
    row(4, "CONNECTED"),
  ]);
  assert.equal(counts.telegram, 3, "the three that still need connecting");
});

test("and the connected row still reads Connected - Groups Pending", () => {
  const { queueRow } = require("../../util/hrOnboardingQueue");
  const { telegramLabel } = require("../../util/employeeTelegram");
  const row = queueRow({ employee_id: 4, status: 1 }, { telegram_status: "CONNECTED" });
  assert.equal(telegramLabel(row.telegram_status, { short: true }), "Connected - Groups Pending");
});
