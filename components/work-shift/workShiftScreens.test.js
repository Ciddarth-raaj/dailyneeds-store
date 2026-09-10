/**
 * Work Shift Master — the screens.
 *
 *   node --test components/work-shift/workShiftScreens.test.js
 *
 * There is no component renderer wired up in this repo, so these read the
 * sources, the way components/masters/masterEdit.test.js does. That suits
 * what needs proving here: most of it is about a control being present or
 * absent, a dependent field being DISABLED rather than hidden, and an
 * approved sentence being reproduced exactly — none of which a single render
 * assertion demonstrates.
 *
 * The arithmetic and the payload shapes are tested for real in
 * util/workShiftForm.test.js, against the module itself.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
/** Comments explain the decisions; only code makes them. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const list = read("pages/work-shift/index.jsx");
const listCode = strip(list);
const create = read("pages/work-shift/new.jsx");
const createCode = strip(create);
const edit = read("pages/work-shift/[id].jsx");
const editCode = strip(edit);
const form = read("components/work-shift/WorkShiftForm.jsx");
const formCode = strip(form);
const tab1 = strip(read("components/work-shift/LatenessOvertimeTab.jsx"));
const tab2 = strip(read("components/work-shift/GeneralTab.jsx"));
const tab3 = strip(read("components/work-shift/RegularizationTab.jsx"));
const tab4 = strip(read("components/work-shift/WeeklyScheduleTab.jsx"));
const helper = strip(read("helper/workShift.js"));
const rules = read("util/workShiftForm.js");

/* ================================================ the list screen ======= */

test("the list shows Shift Code, Shift Name, Status and Action, and nothing else", () => {
  const headers = (listCode.match(/headerName:\s*"([^"]+)"/g) || []).map((m) =>
    m.slice(13, -1)
  );
  assert.deepStrictEqual(headers, ["Shift Code", "Shift Name", "Status", "Action"]);
});

test("THERE IS NO DELETE, ON THE LIST OR IN THE HELPER", () => {
  // Inactive replaces it. Deleting a work shift would take its weekly
  // schedule with it (ON DELETE CASCADE) and leave references dangling.
  assert.ok(!/iconType:\s*"delete"/.test(listCode), "no delete action icon");
  assert.ok(!/\bdelete\b/i.test(listCode), "the list must not offer a delete");
  assert.ok(!/delete/i.test(helper), "the helper must not have a delete call");
});

test("the list offers + Add Work Shift, to the people who may add one", () => {
  assert.match(listCode, /\+ Add Work Shift/);
  assert.match(listCode, /canManage\s*\?/);
  assert.match(listCode, /usePermissions\(\["manage_work_shifts"\]\)/);
});

test("status is switched through update-status, which is the deactivate path", () => {
  assert.match(listCode, /WorkShiftHelper\.updateStatus\(/);
  assert.match(helper, /work-shift\/update-status/);
});

test("the list searches by shift code and shift name", () => {
  assert.match(listCode, /matchesWorkShiftSearch/);
  assert.match(listCode, /placeholder="Search shift code or name"/);
});

test("a permission refusal is not shown as an empty list", () => {
  assert.match(listCode, /code === 403/);
  assert.match(listCode, /do not have permission/i);
});

/* ============================================ the add / edit screen ===== */

test("Add and Edit are FULL PAGES, not a modal", () => {
  for (const [name, code] of [["new", createCode], ["[id]", editCode]]) {
    assert.match(code, /GlobalWrapper/, `${name} is a page`);
    assert.ok(!/Modal/.test(code), `${name} must not open the form in a dialog`);
  }
  assert.ok(!/<Modal/.test(formCode), "the form itself is not a dialog");
});

test("Shift Code and Shift Name are marked required, and Active is a toggle", () => {
  const top = formCode.slice(0, formCode.indexOf("<Tabs"));
  assert.match(top, /name="shift_code"[\s\S]*?isRequired/);
  assert.match(top, /name="shift_name"[\s\S]*?isRequired/);
  assert.match(top, /name="active"/);
});

test("there are EXACTLY FOUR TABS, in the approved order", () => {
  const tabList = formCode.slice(formCode.indexOf("<TabList>"), formCode.indexOf("</TabList>"));
  const titles = (tabList.match(/<Tab>([^<]+)<\/Tab>/g) || []).map((m) =>
    m.replace(/<\/?Tab>/g, "").replace(/&amp;/g, "&")
  );
  assert.deepStrictEqual(titles, [
    "Lateness, Early Out & OT",
    "General",
    "Regularization",
    "Weekly Schedule",
  ]);
});

test("the bottom actions are Cancel and Save Work Shift", () => {
  assert.match(formCode, /submitLabel = "Save Work Shift"/);
  assert.match(formCode, /Cancel/);
});

test("a backend validation message is shown rather than swallowed", () => {
  // 422 carries the field-by-field text from utils/workShift.js, and 101 a
  // duplicate shift code. Both are worth reading.
  assert.match(formCode, /serverError/);
  for (const code of [createCode, editCode]) {
    assert.match(code, /res\.msg/);
  }
});

test("the edit screen loads the configuration and the seven days in ONE read", () => {
  assert.match(editCode, /getWorkShiftDetails/);
  assert.ok(!/getWeeklySchedule/.test(editCode), "details already returns the week");
  assert.match(editCode, /fromApiWorkShift/);
});

test("the edit screen saves both halves in ONE update", () => {
  assert.match(editCode, /toUpdatePayload/);
  assert.match(editCode, /updateWorkShift\(/);
  assert.ok(!/saveWeeklySchedule/.test(editCode), "one atomic write, not two");
});

test("someone who may view but not manage is not offered a Save that would 403", () => {
  assert.match(editCode, /canSubmit=\{canManage\}/);
  assert.match(formCode, /canSubmit \?/);
});

/* ================================== tab 1 — lateness, early out and OT == */

test("tab 1 carries the lateness, early-out and both OT blocks", () => {
  for (const label of [
    "Grace Minutes",
    "Late Deduction Interval Minutes",
    "Deduct Minutes",
    "Do Not Deduct Grace Minutes",
    "Lateness Offset OT",
    "Early-Out Deduction Interval Minutes",
    "Early-Out Offset OT",
    "OT Allowed",
    "Minimum OT Minutes",
    "Rounding Method",
    "Rounding Interval Minutes",
    "Minimum OT Threshold Only",
    "Maximum OT Minutes / Day",
    "Pre-Shift OT Allowed",
  ]) {
    assert.ok(tab1.includes(`label="${label}"`), `${label} must be on tab 1`);
  }
});

test("OT'S DEPENDENT FIELDS ARE DISABLED WHEN OT IS OFF, NOT HIDDEN", () => {
  // A field that vanishes takes with it the answer to "what is this shift's
  // OT cap", and the value is still on the row either way.
  assert.match(tab1, /const otOff = !form\.overtime_allowed/);
  assert.match(tab1, /const preOtOff = !form\.pre_shift_overtime_allowed/);

  const post = tab1.slice(tab1.indexOf('name="overtime_minimum_minutes"'), tab1.indexOf('title="Pre-Shift OT"'));
  for (const dependent of [
    "overtime_minimum_minutes",
    "overtime_rounding_method",
    "overtime_rounding_interval_minutes",
    "maximum_ot_minutes_per_day",
    "overtime_minimum_threshold_only",
  ]) {
    const at = post.indexOf(`name="${dependent}"`);
    assert.notStrictEqual(at, -1, `${dependent} must be on the tab`);
    assert.match(post.slice(at, at + 400), /isDisabled=\{otOff\}/, `${dependent} follows OT Allowed`);
  }

  const pre = tab1.slice(tab1.indexOf('name="pre_shift_overtime_minimum_minutes"'));
  for (const dependent of [
    "pre_shift_overtime_minimum_minutes",
    "pre_shift_overtime_rounding_method",
    "pre_shift_overtime_rounding_interval_minutes",
  ]) {
    const at = pre.indexOf(`name="${dependent}"`);
    assert.match(pre.slice(at, at + 400), /isDisabled=\{preOtOff\}/, `${dependent} follows Pre-Shift OT`);
  }
});

test("the rounding methods are the four the ENUM allows", () => {
  assert.match(rules, /\{ value: "NONE", label: "None" \}/);
  assert.match(rules, /\{ value: "UP", label: "Up" \}/);
  assert.match(rules, /\{ value: "DOWN", label: "Down" \}/);
  assert.match(rules, /\{ value: "NEAREST", label: "Nearest" \}/);
});

/* =========================================================== tab 2 ===== */

test("the missed clock-in treatment is enabled only when the rule is on", () => {
  assert.match(tab2, /const missedOff = !form\.missed_clock_in_rule_enabled/);
  const at = tab2.indexOf('name="missed_clock_in_treatment"');
  assert.match(tab2.slice(at, at + 400), /isDisabled=\{missedOff\}/);
});

test("half and full-day minimums are enabled only when the rule is on", () => {
  assert.match(tab2, /const minimumHoursOff = !form\.minimum_hours_rule_enabled/);
  for (const name of ["minimum_half_day_hours", "minimum_full_day_hours"]) {
    const at = tab2.indexOf(`name="${name}"`);
    assert.match(tab2.slice(at, at + 400), /isDisabled=\{minimumHoursOff\}/);
  }
});

test("the minimums are typed HH:MM, and the three treatments are the ENUM's", () => {
  assert.match(tab2, /HoursMinutesField/);
  assert.match(rules, /\{ value: "FULL_DAY", label: "Full Day" \}/);
  assert.match(rules, /\{ value: "HALF_DAY", label: "Half Day" \}/);
  assert.match(rules, /\{ value: "LEAVE", label: "Leave" \}/);
});

/* =========================================================== tab 3 ===== */

test("regularization gates everything below it, and the limit gates again", () => {
  assert.match(tab3, /const regularizationOff = !form\.regularization_allowed/);
  assert.match(
    tab3,
    /const limitDisabled = regularizationOff \|\| !form\.regularization_control_enabled/
  );
  for (const name of [
    "regularization_control_enabled",
    "regularization_require_existing_punch",
    "regularization_requires_approval",
  ]) {
    const at = tab3.indexOf(`name="${name}"`);
    assert.match(tab3.slice(at, at + 400), /isDisabled=\{regularizationOff\}/);
  }
  const limit = tab3.indexOf('name="regularization_limit_per_month"');
  assert.match(tab3.slice(limit, limit + 400), /isDisabled=\{limitDisabled\}/);
});

test("THE LIMIT IS LABELLED AS TIMES PER MONTH, NOT AS A NUMBER OF DAYS", () => {
  assert.match(tab3, /Regularization Limit per Month \(times per month\)/);
  assert.match(tab3, /number of times in a month/i);
});

test("the Require Existing Punch tooltip is the approved sentence, exactly", () => {
  const approved =
    "If enabled, employees can submit an attendance request only when at least one clock-in or clock-out record already exists for the selected date.";
  assert.ok(rules.includes(approved), "the wording lives in util/workShiftForm.js");
  assert.match(tab3, /hint=\{REQUIRE_EXISTING_PUNCH_TOOLTIP\}/);
});

/* =========================================================== tab 4 ===== */

test("the weekly schedule has the nine approved columns, in order", () => {
  const head = tab4.slice(tab4.indexOf("<Thead>"), tab4.indexOf("</Thead>"));
  const headers = (head.match(/<Th>\s*([^<]+?)\s*<\/Th>/g) || []).map((m) =>
    m.replace(/<\/?Th>/g, "").trim()
  );
  // "Attendance Day Cutoff" carries a tooltip, so its <Th> holds elements
  // rather than bare text and is checked separately below.
  assert.deepStrictEqual(headers, [
    "Day",
    "Working / Rest",
    "In",
    "Out",
    "Break Hours",
    "Normal Working Hours",
    "OT Rate",
    "Copy Day",
  ]);
  assert.match(head, /<span>Attendance Day Cutoff<\/span>/);
});

test("ALL SEVEN DAYS ALWAYS RENDER — the table maps the rows it is given", () => {
  assert.match(tab4, /rows\.map\(/);
  // And the rows it is given are always seven: the form seeds seven, and a
  // short schedule from the server is filled in, both proven in
  // util/workShiftForm.test.js.
  assert.match(rules, /function emptyWeeklySchedule\(\)/);
  assert.match(rules, /DAY_LABELS\.map\(\(_, day\) => emptyScheduleRow\(day\)\)/);
});

test("a rest day's timing fields are disabled", () => {
  assert.match(tab4, /const rest = !row\.is_working_day/);
  const count = (tab4.match(/isDisabled=\{rest\}/g) || []).length;
  // In, Out, Attendance Day Cutoff and Break Hours.
  assert.strictEqual(count, 4, "the four timing inputs follow Working / Rest");
});

test("NORMAL WORKING HOURS IS READ-ONLY — it is a display, not an input", () => {
  const cell = tab4.slice(tab4.indexOf("normalWorkDisplay(row)") - 300, tab4.indexOf("normalWorkDisplay(row)") + 100);
  assert.ok(!/<Input/.test(cell), "there is no box to type it in");
  assert.match(tab4, /normalWorkDisplay\(row\)/);
});

test("the OT rate dropdown offers only the five approved multipliers", () => {
  assert.match(tab4, /OT_RATE_OPTIONS\.map/);
  // Labelled 0x..3x, valued 0..3 — asserted against the source of the list in
  // util/workShiftForm.test.js.
  assert.match(tab4, /value=\{option\.value\}/);
  assert.match(tab4, /\{option\.label\}/);
});

test("the Attendance Day Cutoff tooltip is the approved sentence, exactly", () => {
  const approved =
    "Day Change is the cutoff time until which an employee can keep clocking against the same day. Clockings before it count as the prior day; after it, as the next day. Recommended: less than 2 hours after Time In and after Time Out.";
  assert.ok(rules.includes(approved), "the wording lives in util/workShiftForm.js");
  assert.match(tab4, /ATTENDANCE_DAY_CUTOFF_TOOLTIP/);
});

test("COPY DAY IS UI ONLY — it is a multi-select that rewrites rows", () => {
  assert.match(tab4, /MenuOptionGroup[\s\S]*?type="checkbox"/);
  assert.match(tab4, /onCopyDay\(day, targets\)/);
  // No copy_day anywhere near the payload, and none in the rules module.
  assert.ok(!/copy_day/.test(tab4));
  assert.ok(!/copy_day/i.test(strip(rules)) || /there is no `copy_day`/.test(rules));
});

/* ==================================== the legacy shift master is intact = */

test("THE LEGACY SHIFT MASTER IS NOT TOUCHED OR REPOINTED", () => {
  // /shift belongs to `shift_master`, which the live system and
  // `new_employee.shift_id` still use. Phase 1 runs the two side by side.
  const legacyHelper = read("helper/shift.js");
  assert.match(legacyHelper, /API\.get\("\/shift"\)/, "the old helper still calls /shift");
  assert.ok(!/work-shift/.test(legacyHelper), "and is not repointed at the new one");

  const legacyList = read("pages/shift/index.js");
  assert.ok(!/work-shift/.test(legacyList), "the old screen is left alone");

  // The new helper is a separate module and never calls the legacy routes.
  assert.ok(!/API\.(get|post)\("\/shift/.test(helper), "the new helper stays on /work-shift");
});

test("the new screens use the Work Shift system's own permission keys", () => {
  for (const code of [listCode, createCode, editCode]) {
    assert.match(code, /"view_work_shifts"|"manage_work_shifts"/);
  }
  assert.match(listCode, /permissionKey=\{\["view_work_shifts"\]\}/);
});

test("the new screens are NOT gated on the legacy shift master's keys", () => {
  // `view_shift` and `add_shifts` belong to `shift_master` and are granted to
  // designations with no payroll role at all, so they must not be what opens
  // the new master. The legacy /shift screen keeps them and is untouched.
  for (const [name, code] of [["list", listCode], ["create", createCode], ["edit", editCode]]) {
    assert.ok(
      !/usePermissions\(\[[^\]]*"(view_shift|add_shifts)"/.test(code),
      `the ${name} screen must not check view_shift / add_shifts`
    );
    assert.ok(
      !/permissionKey=\{\[[^\]]*"(view_shift|add_shifts)"/.test(code),
      `the ${name} screen must not be wrapped in view_shift / add_shifts`
    );
  }
});

test("the five Work Shift keys are grantable from the designation screen", () => {
  // Declared in the backend migration, but an administrator can only hand one
  // to another designation if it is listed here.
  const catalog = read("constants/permissions.js");
  for (const key of [
    "view_work_shifts",
    "manage_work_shifts",
    "view_shift_assignments",
    "assign_employee_shift",
    "bulk_assign_employee_shift",
  ]) {
    assert.match(catalog, new RegExp(`^\\s*${key}: "`, "m"), `${key} is listed`);
  }
});

/* ============================================= the endpoints consumed == */

test("the helper calls the /work-shift routes the backend actually defines", () => {
  for (const route of [
    '"/work-shift"',
    '"/work-shift/details"',
    '"/work-shift/weekly-schedule"',
    '"/work-shift/create"',
    '"/work-shift/update"',
    '"/work-shift/update-status"',
  ]) {
    assert.ok(helper.includes(route), `${route} must be called by name`);
  }
});
