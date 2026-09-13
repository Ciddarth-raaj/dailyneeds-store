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
/**
 * Comment prose as a reader sees it: `flat` alone leaves the ` * ` that
 * continues a block comment, so a sentence wrapped across two comment lines
 * comes out as "may not * have reached". This drops those markers first.
 */
const prose = (s) => flat(s.replace(/^\s*\*\s?/gm, " "));

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
const trendRaw = read("components/attendance/dashboard/TrendPanel.jsx");
const staffingCards = strip(read("components/attendance/dashboard/StaffingCards.jsx"));
const coveragePanel = strip(read("components/attendance/dashboard/CoveragePanel.jsx"));
const nextHourPanel = strip(read("components/attendance/dashboard/NextHourPanel.jsx"));
const gapDetailPanel = strip(read("components/attendance/dashboard/GapDetailPanel.jsx"));
const crossLocationPanel = strip(read("components/attendance/dashboard/CrossLocationPanel.jsx"));
const recurringPanel = strip(read("components/attendance/dashboard/RecurringGapsPanel.jsx"));
const staffingModal = strip(read("components/attendance/dashboard/StaffingListModal.jsx"));
const staffingModalRaw = read("components/attendance/dashboard/StaffingListModal.jsx");
const gapDetailRaw = read("components/attendance/dashboard/GapDetailPanel.jsx");
const staffingUtil = read("util/attendanceDashboard.js");

const STAFFING_PANELS = [
  staffingCards,
  coveragePanel,
  nextHourPanel,
  gapDetailPanel,
  crossLocationPanel,
  recurringPanel,
  staffingModal,
];

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
  assert.match(permissions, /view_attendance_dashboard: "View Attendance & Staffing Dashboard"/);
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
  assert.match(prose(pageRaw), /A FAILED REQUEST IS NOT ZERO EMPLOYEES/i);
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
  assert.match(flat(punchesPanel), /No punches were recorded for this attendance day/);
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
  assert.match(prose(overviewRaw), /MUTUALLY EXCLUSIVE/i);
});

test("the dashboard-only rest-day rule is gone from the UI", () => {
  // It was a weekly-off policy that made this screen disagree with the
  // employee's own attendance for the same date.
  assert.ok(!/rest_day_no_punch/.test(overviewPanel), "the rest-day count is removed");
  ALL_PANELS.concat([page, cards]).forEach((src, i) => {
    assert.ok(!/rest.?day/i.test(src), `source ${i} still carries a rest-day concept`);
  });
});

test("the overview names unconfirmed absence, so Unresolved is explicable", () => {
  assert.match(overviewPanel, /unconfirmed_absence/);
  assert.match(flat(overviewPanel), /punch delivery is unconfirmed/i);
});

test("closure and completeness are separate, and both gate absence", () => {
  assert.match(prose(overviewRaw), /may not have reached us yet/i);
  assert.match(prose(punchesPanel), /whether delivery for that day could be confirmed/i);
});

test("no freshness threshold is invented in the browser", () => {
  const utilSrc = read("util/attendanceDashboard.js");
  assert.ok(!/STALE_AFTER_MINUTES/.test(utilSrc), "the invented 60-minute rule is gone");
  ALL_PANELS.forEach((src, i) => {
    assert.ok(
      !/>\s*\d+\s*\)\s*return.*stale/i.test(src),
      `source ${i} still judges staleness locally`
    );
  });
});

test("the trend and the punch feed report failures instead of rendering empty", () => {
  assert.match(trendRaw, /A FAILED TREND IS AN ERROR, NOT AN EMPTY CHART/i);
  assert.match(punchesPanel, /punches_available === false/);
  assert.match(page, /setTrendError/);
  assert.match(page, /setPunchesError/);
  assert.match(page, /setFiltersError/);
});

test("stale responses cannot overwrite newer ones", () => {
  assert.match(page, /overviewSeq/);
  assert.match(page, /trendSeq/);
  assert.match(page, /drilldownSeq/);
  assert.match(prose(pageRaw), /STALE RESPONSES MUST NOT OVERWRITE NEWER ONES/i);
});

test("the punch feed is asked for the selected date and the same filters", () => {
  assert.match(page, /getRecentPunches\(\{ \.\.\.apiFilters/);
  const helperSrc = strip(read("helper/attendanceDashboard.js"));
  assert.ok(!/delete params\.search/.test(helperSrc), "the trend keeps the employee search");
});

test("a setup-gap row opens its own issue, not the whole unresolved population", () => {
  assert.match(page, /row\.issue_key \|\| "SHIFT_SETUP"/);
  assert.match(shiftPanel, /issue_key: row\.setup_gap/);
});

test("the no-outlet row is selected explicitly", () => {
  assert.match(page, /store_unassigned: true/);
});

test("a refusal shows the server's own reason, so the two refusals differ", () => {
  assert.match(page, /\{forbidden\}/);
  assert.match(prose(pageRaw), /A REFUSAL EXPLAINS ITSELF/i);
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
  assert.match(prose(drilldownRaw), /THE LIST IS THE SERVER'S, NOT A CLIENT-SIDE FILTER/i);
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


/* ============================== Attendance & Staffing (new phase) ==== */

test("the title and route are the approved ones", () => {
  assert.match(page, /title="Attendance & Staffing Dashboard"/);
  assert.match(menus, /location: "\/attendance\/dashboard"/, "the route is unchanged");
  assert.match(menus, /permission: "view_attendance_dashboard"/, "the key is unchanged");
});

test("Now and By-date are separate views, so a past date never sits under 'Now'", () => {
  assert.match(page, /view === "NOW"/);
  assert.match(page, /setView/);
  assert.match(prose(pageRaw), /a past date's figures under a "Now" heading/i);
});

test("the Now view has no date control at all", () => {
  assert.match(page, /hideDate=\{isNow\}/);
  assert.match(filters, /hideDate \? "none" : undefined/);
});

test("the staffing request sends no date: the server decides 'now'", () => {
  const helperSrc = strip(read("helper/attendanceDashboard.js"));
  assert.match(helperSrc, /getStaffing/);
  assert.ok(
    !/getStaffing[\s\S]{0,400}attendance_date/.test(helperSrc),
    "sending a date would let a past day masquerade as now"
  );
});

test("the three primary cards replace the six", () => {
  assert.match(page, /<StaffingCards/);
  assert.match(staffingCards, /PRIMARY_CARDS/);
  assert.match(staffingCards, /Expected Now|expected_now/);
});

test("the as-of stamp is the server's and is shown", () => {
  assert.match(page, /staffing\.as_of/);
  assert.match(page, /As of/);
  assert.match(page, /not a live stream/);
});

test("nothing claims live streaming or adds background work", () => {
  STAFFING_PANELS.concat([page]).forEach((src, i) => {
    assert.ok(!/setInterval|WebSocket|EventSource|Notification/.test(src), `source ${i} polls`);
    assert.ok(!/real-?time|live feed/i.test(src), `source ${i} claims live data`);
  });
});

test("the word 'absent' appears nowhere in the staffing view", () => {
  STAFFING_PANELS.forEach((src, i) => {
    assert.ok(!/\babsent\b/i.test(src), `staffing source ${i} says absent`);
  });
});

test("an OUT is never interpreted as lunch, lateness or a departure", () => {
  // The gap panel is the one place these words legitimately appear - in the
  // sentence that REFUSES the interpretation - so it is checked separately
  // rather than exempted.
  const others = STAFFING_PANELS.filter((src) => src !== gapDetailPanel);
  others.forEach((src, i) => {
    assert.ok(
      !/\blunch\b|unauthoris|unauthoriz|early departure|misconduct|penalt/i.test(src),
      `staffing source ${i} interprets a punch`
    );
  });

  // And the gap panel says outright that it does not interpret one.
  assert.match(
    flat(gapDetailPanel),
    /not described as lunch, an early departure or anything else this data cannot establish/i
  );
  assert.match(flat(gapDetailPanel), /not lateness penalties/i);
  assert.match(prose(gapDetailRaw), /not a lateness penalty, a break limit or a misconduct record/i);
});

test("recorded IN is never described as present, working or at a counter", () => {
  assert.match(prose(staffingUtil), /does not mean actively working/i);
  assert.match(flat(coveragePanel), /does not mean somebody is at a counter/i);
  STAFFING_PANELS.forEach((src, i) => {
    assert.ok(!/billing counter/i.test(src), `staffing source ${i} claims counter activity`);
  });
});

test("the next-hour panel never judges whether cover is sufficient", () => {
  assert.match(flat(nextHourPanel), /makes no judgement about whether the remaining cover is enough/i);
  assert.ok(
    !/understaffed|insufficient|required|target|budget/i.test(nextHourPanel),
    "staffing requirements belong to the budgeting phase"
  );
});

test("no budgeting, targets, rankings or recruitment appear", () => {
  STAFFING_PANELS.concat([page]).forEach((src, i) => {
    assert.ok(
      !/\bbudget|staffing target|recruit|ranking|score\b/i.test(src),
      `source ${i} strays into the next phase`
    );
  });
});

test("the gap reconciliation is asserted on screen, not assumed", () => {
  assert.match(page, /staffing\.reconciles === false/);
  assert.match(coveragePanel, /reconciles === false/);
});

test("unknown expectation is surfaced, never folded into zero", () => {
  assert.match(page, /unknown_expectation/);
  assert.match(flat(page), /Expected coverage unknown/i);
  assert.match(flat(page), /not counted in Expected Now/i);
});

test("cross-location arrivals are for verification and transfer nobody", () => {
  assert.match(flat(crossLocationPanel), /Nobody is transferred, credited twice or reassigned/i);
  assert.match(crossLocationPanel, /verification/i);
});

test("still recorded IN after a shift is a follow-up, not proof of presence", () => {
  assert.match(flat(crossLocationPanel), /not proof that they are present/i);
  assert.match(flat(crossLocationPanel), /overtime has been approved/i);
});

test("recurring gaps show their evidence and their limitation", () => {
  assert.match(recurringPanel, /data\.basis/);
  assert.match(recurringPanel, /data\.limitation/);
  assert.match(recurringPanel, /observations/);
});

test("the staffing lists come from the snapshot, not a second request", () => {
  assert.match(page, /staffing\.expected_detail/);
  assert.match(prose(staffingModalRaw), /not from a second request/i);
});

test("the delivery standing note replaces any confirmed-delivery claim", () => {
  assert.match(page, /DELIVERY_STANDING_NOTE/);
  assert.ok(
    !/Delivery confirmed/.test(staffingUtil),
    "nothing can confirm delivery in this system"
  );
});

test("loading, empty, error and permission states are distinct in the Now view", () => {
  assert.match(page, /staffingError/);
  assert.match(page, /staffingLoading/);
  assert.match(flat(coveragePanel), /No employees are scheduled right now/i);
  assert.match(flat(gapDetailPanel), /Every scheduled employee is recorded IN/i);
  assert.match(flat(nextHourPanel), /No scheduled shift changes/i);
});

test("stale staffing responses cannot overwrite newer ones", () => {
  assert.match(page, /staffingSeq/);
});

test("no salary, bank or identity field is rendered in the staffing view", () => {
  const sensitive = [/\bsalary\b/i, /\bbank\b/i, /\baadhaar\b/i, /\bpan\b/i, /\bifsc\b/i];
  STAFFING_PANELS.forEach((src, i) => {
    sensitive.forEach((re) => assert.ok(!re.test(src), `staffing source ${i} matches ${re}`));
  });
});
