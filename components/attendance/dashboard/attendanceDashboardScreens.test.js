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
const attentionNowPanel = strip(read("components/attendance/dashboard/AttentionNowPanel.jsx"));
const attentionNowRaw = read("components/attendance/dashboard/AttentionNowPanel.jsx");
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
  attentionNowPanel,
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
  // The gap panel and the attention panel both name these words only inside the
  // sentences that REFUSE the interpretation, so they are checked separately
  // rather than exempted.
  const others = STAFFING_PANELS.filter(
    (src) => src !== gapDetailPanel && src !== attentionNowPanel
  );
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

test("THE STAFFING LISTS ARE PAGED FROM THE SERVER, not sliced from the snapshot", () => {
  // The defect this replaces: the list was built by filtering the snapshot's
  // own array, which the server cut at 200 rows without saying so - a screen
  // that showed 200 people under a card reading 250.
  assert.match(page, /getStaffingDrilldown/);
  assert.ok(
    !/staffing\.expected_detail|staffing\.gap_detail/.test(page),
    "the silently truncated fields are gone from the page"
  );
  assert.match(prose(staffingModalRaw), /paged from the server/i);
  assert.match(prose(staffingModalRaw), /cut at 200 rows/i);
});

test("the modal shows a total, a page window and its OWN as_of", () => {
  assert.match(staffingModalRaw, /result\.total|const total = result/);
  assert.match(flat(staffingModalRaw), /Showing \$\{from\}–\$\{to\} of \$\{total\}/);
  assert.match(flat(staffingModalRaw), /as of/i);
  // When the list was read at a different moment from the card, it SAYS SO
  // rather than implying the two are the same instant.
  assert.match(staffingModalRaw, /drifted/);
  assert.match(flat(staffingModalRaw), /Punches that\s*\n?\s*arrived in between are included here/);
});

test("the previews on the snapshot are labelled as previews, with a way to see all", () => {
  assert.match(page, /attention_preview_truncated/);
  assert.match(page, /gap_preview_truncated/);
  assert.match(flat(gapDetailPanel), /This is a preview, not the whole list/i);
  assert.match(flat(gapDetailPanel), /See all/);
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

/* ==================================================================== */
/* NEEDS ATTENTION NOW on the operational view.                          */
/* ==================================================================== */

test("the Now view carries a Needs attention now panel", () => {
  assert.match(page, /AttentionNowPanel/);
  assert.match(page, /attention_preview/);
  assert.match(flat(attentionNowPanel), /Needs attention now/);
});

test("IT DECIDES NOTHING - every row opens the screen that already owns the action", () => {
  assert.match(attentionNowPanel, /attentionLink/);
  assert.match(flat(attentionNowPanel), /opens the screen that owns it; nothing is decided here/i);
  // No approve/reject control exists on this panel at all.
  assert.ok(
    !/onApprove|onReject|onRegularize|handleApprove/.test(attentionNowPanel),
    "the panel must have no decision handler"
  );
  assert.match(prose(attentionNowRaw), /Nothing is approved, rejected, regularized or\s+edited here/i);
});

test("a link is a preselection and never an authorization", () => {
  assert.match(
    prose(attentionNowRaw),
    /checks its own permission exactly as it does\s+when reached from the menu/i
  );
  assert.match(
    read("util/attendanceDashboard.js").replace(/\s+/g, " "),
    /A deep link is a PRESELECTION and never an authorization/i
  );
});

test("AN OWNER IS SHOWN ONLY WHERE THE SYSTEM NAMES ONE", () => {
  assert.match(attentionNowPanel, /item\.owner_name \? \(/);
  assert.match(prose(attentionNowRaw), /nobody is shown/i);
  assert.match(prose(attentionNowRaw), /an invented owner is how a real person gets chased/i);
});

test("the elapsed time is for ordering, and says so", () => {
  assert.match(attentionNowPanel, /elapsedLabel/);
  assert.match(prose(attentionNowRaw), /for ordering, not a penalty/i);
  assert.match(prose(attentionNowRaw), /not lateness, misconduct or a deduction/i);
});

test("the panel carries no payroll-readiness row, because no readiness state exists", () => {
  assert.ok(!/payroll|readiness/i.test(attentionNowPanel));
});

/* ==================================================================== */
/* THE FIVE CORRECTED DEFECTS, as the screens present them.              */
/* ==================================================================== */

test("the next-60-minutes panel explains that starters now appear", () => {
  assert.match(prose(read("components/attendance/dashboard/NextHourPanel.jsx")), /a starter shows up before they start/i);
  assert.match(nextHourPanel, /starting_by_location/);
  assert.match(nextHourPanel, /finishing_by_location/);
  assert.match(nextHourPanel, /remaining_by_role/);
});

test("the next-60-minutes panel still refuses to judge whether cover is enough", () => {
  assert.match(flat(nextHourPanel), /makes no judgement about whether the\s*remaining cover is enough/i);
  assert.ok(!/understaffed|short of|too few|required staff/i.test(nextHourPanel));
});

test("LOCATION CERTAINTY IS SHOWN SEPARATELY FROM COVER", () => {
  // The cards report it as its own figure, allocated to no outlet.
  assert.match(staffingCards, /recorded_in_location_unverified/);
  assert.match(flat(staffingCards), /counted at no location/i);
  // And the coverage table shows it beside a location's IN, never inside it.
  assert.match(coveragePanel, /recorded_in_location_unverified/);
  assert.match(flat(coveragePanel), /not counted as cover of this location/i);
  assert.match(flat(coveragePanel), /only where the punch location is established/i);
});

test("an unverified location is described as a question about the RECORD", () => {
  assert.match(flat(gapDetailPanel), /is a question about\s*the punch record, never about the employee/i);
});

test("a failed punch-location read is stated on the page, not swallowed", () => {
  assert.match(page, /punch_locations_available/);
  assert.match(flat(page), /Punch locations could not be read/i);
  assert.match(flat(page), /no recorded IN can be confirmed at its\s*expected location/i);
});

test("the recurring panel distinguishes 'cannot read the evidence' from 'no pattern'", () => {
  assert.match(recurringPanel, /PULL_STATUS_UNREADABLE/);
  assert.match(flat(recurringPanel), /none of these days can be used as evidence/i);
  assert.match(flat(recurringPanel), /rather than assuming the days were clean/i);
  assert.match(recurringPanel, /NO_UNDISTURBED_DAYS/);
});

test("the recurring panel is narrowed by the same filters as the cards", () => {
  assert.match(page, /getRecurringGaps\(\{[\s\S]*?work_shift_id: apiFilters\.work_shift_id/);
});

test("the cross-location panel counts the full figures, not its preview length", () => {
  assert.match(crossLocationPanel, /early_total/);
  assert.match(crossLocationPanel, /no_active_shift_total/);
  assert.match(crossLocationPanel, /location_unverified_total/);
  assert.match(flat(crossLocationPanel), /Counts are the full\s*figures; the rows above them are a preview/i);
});

test("the cross-location panel still transfers and credits nobody", () => {
  assert.match(flat(crossLocationPanel), /Nobody is transferred, credited twice or reassigned/i);
});

test("the Now view has no date control and no budgeting language anywhere", () => {
  assert.match(page, /hideDate=\{isNow\}/);
  STAFFING_PANELS.concat([page]).forEach((src, i) => {
    assert.ok(
      !/budget|headcount target|required staffing|recruit|cost per|salary budget/i.test(src),
      `staffing source ${i} strays into budgeting`
    );
  });
});

test("THE SCREEN NEVER DECIDES COVERAGE ITSELF - it renders the server's class", () => {
  // The regularization-location correction is a server rule. It only holds if
  // the browser has no rule of its own: nothing here may promote a recorded IN
  // to coverage, infer a location from the employee's own outlet, or treat an
  // approved regularization as proof of a place.
  STAFFING_PANELS.forEach((src, i) => {
    assert.ok(
      !/gap_class\s*=\s*["']COVERED|location_basis\s*===/.test(src),
      `staffing source ${i} decides a classification of its own`
    );
    assert.ok(
      !/APPROVED_REGULARIZATION/.test(src),
      `staffing source ${i} reads the regularization basis as if it settled a location`
    );
  });
  // Coverage is read, never computed: the panels compare against the class the
  // server sent and nothing else.
  assert.match(coveragePanel, /row\.recorded_in/);
  assert.match(staffingCards, /snapshot\.recorded_in_location_unverified/);
});
