/**
 * The Attendance Dashboard screens - the approved shape.
 *
 *   node --test components/attendance/dashboard/attendanceDashboardScreens.test.js
 *
 * No component renderer is wired up in this repo, so these read the sources
 * the way `components/attendance/attendanceV2Screens.test.js` does.
 *
 * What they defend is the part of this feature that is a PROMISE rather than a
 * calculation: that the dashboard is read-only, that it reuses the existing
 * shell and the existing screens instead of reimplementing them, that it never
 * hardcodes master data, and that a failed request cannot be mistaken for an
 * empty one. Those are properties of the source, and this is the only place in
 * this repository they can be asserted.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..", "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
/**
 * JSX prose wraps across lines, so a sentence rendered to the user is not one
 * line in the source. `flat` collapses runs of whitespace so an assertion can
 * quote the sentence as a reader would see it.
 */
const flat = (s) => s.replace(/\s+/g, " ");

const page = strip(read("pages/attendance/dashboard/index.jsx"));
const helper = strip(read("helper/attendanceDashboard.js"));
const cards = strip(read("components/attendance/dashboard/DashboardCards.jsx"));
const filters = strip(read("components/attendance/dashboard/DashboardFilters.jsx"));
const overviewPanel = strip(read("components/attendance/dashboard/AttendanceOverviewPanel.jsx"));
const locationPanel = strip(read("components/attendance/dashboard/LocationPanel.jsx"));
const shiftPanel = strip(read("components/attendance/dashboard/ShiftPanel.jsx"));
const trendPanel = strip(read("components/attendance/dashboard/TrendPanel.jsx"));
const attentionPanel = strip(read("components/attendance/dashboard/AttentionPanel.jsx"));
const punchesPanel = strip(read("components/attendance/dashboard/RecentPunchesPanel.jsx"));
const drilldown = strip(read("components/attendance/dashboard/DrilldownModal.jsx"));
const calculatedPage = strip(read("pages/attendance/calculated/index.jsx"));
const permissions = read("constants/permissions.js");
const menus = read("constants/menus.js");

/* Unstripped, for assertions about the reasoning recorded in the comments. */
const pageRaw = read("pages/attendance/dashboard/index.jsx");
const overviewRaw = read("components/attendance/dashboard/AttendanceOverviewPanel.jsx");
const drilldownRaw = read("components/attendance/dashboard/DrilldownModal.jsx");

const ALL_PANELS = [
  overviewPanel,
  locationPanel,
  shiftPanel,
  trendPanel,
  attentionPanel,
  punchesPanel,
];

/* ================================================ permission ==== */

test("the page is behind view_attendance_dashboard", () => {
  assert.match(page, /permissionKey=\{\["view_attendance_dashboard"\]\}/);
});

test("the permission is declared for the designation rights screen", () => {
  assert.match(permissions, /view_attendance_dashboard: "View Attendance Dashboard"/);
});

test("the menu entry carries the same key and points at the page", () => {
  assert.match(menus, /permission: "view_attendance_dashboard"/);
  assert.match(menus, /location: "\/attendance\/dashboard"/);
});

test("a permission refusal is shown as a refusal, not as an error or as zero", () => {
  assert.match(page, /isForbidden\(/);
  assert.match(page, /do not have permission to view the Attendance Dashboard/i);
});

/* ================================================= read only ==== */

test("the helper makes GET requests only - no write path exists", () => {
  assert.ok(!/API\.post|API\.put|API\.patch|API\.delete/.test(helper), "no write call");
  assert.match(helper, /API\.get\(/);
});

test("the page never approves, rejects, regularizes, voids or recalculates", () => {
  const forbidden = [
    /decideApproval/,
    /raiseMyRegularization/,
    /raiseMyOtRequest/,
    /recalculate/i,
    /voidPunch/i,
    /setDateShift/,
  ];
  forbidden.forEach((re) =>
    assert.ok(!re.test(page), `the dashboard page must not reference ${re}`)
  );
});

test("no panel carries an approve or reject control", () => {
  ALL_PANELS.forEach((src, i) => {
    assert.ok(
      !/Approve|Reject/.test(src),
      `panel ${i} must not offer an approval decision - that stays on the approval screens`
    );
  });
});

test("Attention Required links out to the existing screens rather than deciding", () => {
  assert.match(attentionPanel, /onNavigate/);
  assert.match(attentionPanel, /nothing is approved, rejected or edited from the dashboard/i);
});

test("an out-of-reach link is not offered at all", () => {
  // A button that 403s is worse than no button.
  assert.match(attentionPanel, /permitted/);
  assert.match(attentionPanel, /link\.href && permitted/);
});

test("the shift-assignment link requires BOTH keys, not either", () => {
  // usePermissions defaults to ANY; that screen's endpoint requires both.
  assert.match(page, /\["view_employees", "view_shift_assignments"\],\s*\{\s*all: true,?\s*\}/);
});

/* ================================================ the layout ==== */

test("it reuses the existing application shell, not a shell of its own", () => {
  assert.match(page, /import GlobalWrapper from/);
  assert.match(page, /import CustomContainer from/);
  assert.ok(!/SideBar|<Header/.test(page), "no second nested sidebar or header");
});

test("six summary cards, two across on a phone and six on the desktop", () => {
  assert.match(cards, /columns=\{\{ base: 2, md: 3, xl: 6 \}\}/);
});

test("the panels are a three-column desktop grid that stacks on a phone", () => {
  assert.match(page, /columns=\{\{ base: 1, lg: 2, xl: 3 \}\}/);
});

test("every panel is responsive rather than a fixed-width desktop layout", () => {
  [overviewPanel, locationPanel, shiftPanel].forEach((src, i) => {
    assert.ok(
      /base:|overflowX/.test(src),
      `panel ${i} needs a responsive or scrollable container`
    );
  });
});

test("wide tables scroll horizontally instead of breaking the page", () => {
  [locationPanel, shiftPanel, drilldown].forEach((src, i) => {
    assert.match(src, /overflowX="auto"/, `table ${i} must scroll rather than overflow`);
  });
});

test("it reuses the installed chart library rather than adding another", () => {
  assert.match(overviewPanel, /from "recharts"/);
  assert.match(trendPanel, /from "recharts"/);
  // Word boundaries matter here: an unanchored /echarts/ matches "Recharts",
  // which is the library this repository already ships and the one being used.
  ALL_PANELS.forEach((src) => {
    assert.ok(
      !/\bchart\.js\b|\bapexcharts\b|\becharts\b|\bd3\b|\bhighcharts\b|\bnivo\b/i.test(src),
      "no second charting framework"
    );
  });
  ALL_PANELS.forEach((src) => {
    assert.ok(!/react-chartjs-2/.test(src), "not the other installed chart library either");
  });
});

/* ============================================== the filters ==== */

test("the five approved filters are present, and no others", () => {
  assert.match(filters, /Attendance Date/);
  assert.match(filters, /Outlet \/ Warehouse/);
  assert.match(filters, /Shift/);
  assert.match(filters, /Designation/);
  assert.match(filters, /Employee Search/);
});

test("the selectors are fed real master data, never a hardcoded list", () => {
  assert.match(filters, /options\.outlets/);
  assert.match(filters, /options\.designations/);
  assert.match(filters, /options\.shifts/);
  // The sample shift names from the reference must appear nowhere.
  assert.ok(
    !/"Morning"|"General"|"Night"/.test(filters),
    "shift names come from Shift Management, not from a copied list"
  );
  assert.ok(!/Main Store|Warehouse 1|Branch 1/.test(filters), "no sample outlets");
});

test("the date defaults to the IST business day and the server's own today", () => {
  assert.match(page, /istToday\(\)/);
  assert.match(page, /res\.today/);
});

test("refresh is manual and nothing claims real time", () => {
  assert.match(filters, /Refresh/);
  assert.ok(!/setInterval|EventSource|WebSocket/.test(page), "no polling and no streaming");
  ALL_PANELS.concat([page, filters]).forEach((src) => {
    assert.ok(!/real-?time|live feed/i.test(src), "nothing claims real-time attendance");
  });
});

test("the fetch time is labelled as a fetch time, not a device sync time", () => {
  assert.match(filters, /fetchedAt/);
  assert.match(filters, /NOT a device sync time/i);
});

/* ============================================== the honesty ==== */

test("a failed request clears the panels and shows an error - never zero", () => {
  assert.match(page, /setOverview\(null\);\s*\n\s*setError\(/);
  // The reasoning is recorded where the code is, so read the unstripped file.
  assert.match(flat(pageRaw), /A FAILED REQUEST IS NOT ZERO EMPLOYEES/i);
});

test("loading, empty, error and permission-denied are distinct states", () => {
  assert.match(page, /Spinner/, "loading");
  assert.match(page, /Alert status="error"/, "error");
  assert.match(page, /Alert status="warning"/, "permission denied");
  assert.match(page, /Choose an attendance date/, "nothing selected yet");
  // NO-DATA is each panel's own state, so an empty outlet list does not blank
  // the whole screen and the panels that DO have data still render.
  assert.match(flat(overviewPanel), /No employees match these filters for this date/);
  assert.match(flat(locationPanel), /No locations to show/);
  assert.match(flat(shiftPanel), /No shifts to show/);
  assert.match(flat(attentionPanel), /Nothing needs action/);
  assert.match(flat(punchesPanel), /No punches have been received/);
  assert.match(flat(drilldown), /No employees in this group/);
  // PARTIAL data: the trend says how short its history is rather than
  // presenting three days as if they were fourteen.
  assert.match(trendPanel, /trendMessage/);
});

test("an open day is labelled as open and withholds Absent", () => {
  assert.match(page, /is_open_day/);
  assert.match(page, /day_state_note/);
  assert.match(cards, /Pending day close/);
  assert.match(cards, /still open/i);
});

test("the overview panel says the slices are mutually exclusive and checks they add up", () => {
  assert.match(overviewPanel, /reconciles === false/);
  assert.match(flat(overviewPanel), /do not add up to the applicable population/i);
  assert.match(flat(overviewRaw), /MUTUALLY EXCLUSIVE/i);
});

test("the overview panel reports rest days rather than calling them absence", () => {
  assert.match(overviewPanel, /rest_day_no_punch/);
  assert.match(overviewPanel, /rather than absent/i);
});

test("percentages travel with their denominator", () => {
  assert.match(locationPanel, /rateDetail/);
  assert.match(locationPanel, /The denominator/i);
  assert.match(shiftPanel, /rateDetail/);
});

test("the shift panel shows setup gaps rather than losing the employees", () => {
  assert.match(shiftPanel, /setup_gap/);
  assert.match(shiftPanel, /setup gap/);
  assert.match(shiftPanel, /are covered by these rows/);
});

test("the trend plots completed days only and leaves gaps as gaps", () => {
  assert.match(trendPanel, /connectNulls=\{false\}/);
  assert.match(trendPanel, /Completed attendance days only/);
  assert.match(trendPanel, /trendMessage/);
});

test("the trend offers 14 days and a month", () => {
  assert.match(trendPanel, /14 days/);
  assert.match(trendPanel, /value: 30/);
});

test("the punch panel never asserts a direction or an offline device", () => {
  assert.match(punchesPanel, /direction === "PUNCH" \? "Punch"/);
  assert.ok(!/\bOffline\b/.test(punchesPanel), "no offline verdict is rendered");
  assert.match(flat(punchesPanel), /No online\/offline status is inferred/i);
});

test("an excluded punch is labelled and never presented as a check-in", () => {
  assert.match(punchesPanel, /excluded/);
  assert.match(punchesPanel, /line-through/);
});

test("a feed whose freshness cannot be established raises a warning", () => {
  assert.match(punchesPanel, /feedWarning/);
  assert.match(punchesPanel, /Alert status="warning"/);
});

/* =========================================== the integration ==== */

test("every card opens a drilldown, and the drilldown is the server's list", () => {
  assert.match(cards, /onOpenBucket/);
  assert.match(page, /getDrilldown/);
  assert.match(flat(drilldownRaw), /THE LIST IS THE SERVER'S, NOT A CLIENT-SIDE FILTER/i);
});

test("the drilldown is paginated rather than unbounded", () => {
  assert.match(page, /limit: 50/);
  assert.match(drilldown, /hasNext/);
  assert.match(drilldown, /onPage/);
});

test("a panel drilldown does not rewrite the page's filter bar", () => {
  assert.match(page, /overrides/);
  assert.ok(
    !/onOpenLocation=\{\(row\) => \{\s*setFilters/.test(page),
    "clicking a row to read it must not silently re-filter every other panel"
  );
});

test("employee rows deep-link into the EXISTING monthly screen", () => {
  assert.match(page, /employeeDayHref/);
  assert.match(page, /router\.push\(href\)/);
});

test("the existing monthly screen accepts the deep link, once, and is unchanged otherwise", () => {
  assert.match(calculatedPage, /router\.isReady/);
  assert.match(calculatedPage, /router\.query\.employee_id/);
  assert.match(calculatedPage, /router\.query\.date/);
  assert.match(calculatedPage, /linkApplied/, "the link is consumed once and never re-applied");
  // Ordinary browsing is untouched: the screen still loads from its own state.
  assert.match(calculatedPage, /getEmployeeAttendance\(/);
  assert.ok(
    !/router\.replace|router\.push/.test(calculatedPage),
    "the screen does not rewrite its own URL, so the link cannot fight the user for control"
  );
});

test("the deep link grants nothing: the screen keeps its own permission key", () => {
  assert.match(calculatedPage, /permissionKey=\{\["view_calculated_attendance"\]\}/);
});

/* ============================================ no scope creep ==== */

test("no leave, weekly-off or half-day concept is introduced", () => {
  ALL_PANELS.concat([page, cards, filters, drilldown]).forEach((src) => {
    assert.ok(!/On Leave|half.?day|weekly.?off|paid leave/i.test(src), "out of approved scope");
  });
});

test("no salary, bank, Aadhaar or statutory field is rendered", () => {
  // Every pattern is word-bounded. Unanchored, "pan" matches "Panel" and
  // "esi" matches "Designation", which would fail on entirely innocent code
  // and teach the next person to delete the test rather than trust it.
  const sensitive = [
    /\bsalary\b/i,
    /\bsalaries\b/i,
    /\bbank\b/i,
    /\bbank_/i,
    /\baadhaar\b/i,
    /\bpan\b/i,
    /\bpan_/i,
    /\bpf\b/i,
    /\bpf_/i,
    /\besi\b/i,
    /\besi_/i,
    /\bifsc\b/i,
    /account_number/i,
  ];
  ALL_PANELS.concat([page, cards, drilldown]).forEach((src, i) => {
    sensitive.forEach((re) =>
      assert.ok(
        !re.test(src),
        `source ${i} matches ${re} - a dashboard about who is at work must not show pay or identity data`
      )
    );
  });
});

test("no late or early-departure penalty is introduced", () => {
  ALL_PANELS.concat([page, cards]).forEach((src) => {
    assert.ok(!/penalt/i.test(src), "v2 has no monetary late or early-exit penalty");
  });
});
