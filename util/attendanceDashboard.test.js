/**
 * The Attendance Dashboard screens - the pure part.
 *
 *   node --test util/attendanceDashboard.test.js
 *
 * What these defend is that the UI never overstates the data: that a rate the
 * server called unavailable renders as a dash and not 0%, that a quiet
 * terminal is never labelled offline, that a zero slice keeps its place in the
 * legend, and that a gap in the trend stays a gap.
 */

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  CARDS,
  ISSUE_LINK,
  SLICE_TONE,
  STALE_AFTER_MINUTES,
  clock,
  deviceFreshness,
  displayDate,
  employeeDayHref,
  feedWarning,
  formatAge,
  formatMinutes,
  isForbidden,
  isOk,
  istToday,
  overviewChartData,
  overviewLegend,
  ratePercent,
  rateCounts,
  rateDetail,
  shortDate,
  trendChartData,
  trendMessage,
} = require("./attendanceDashboard");

const { dayIssue } = require("./attendanceV2");

/**
 * THE SHARED STATUS -> ISSUE TABLE.
 *
 * The same table, row for row, as `the shared status -> issue table` in the
 * backend's `utils/attendance_dashboard.test.js`. The two repositories cannot
 * import each other, so this table IS the contract between them: the dashboard
 * counts these issues on the SERVER (a count cannot be built from a mapping
 * that only exists in the browser) while the labels staff read come from
 * `util/attendanceV2.js` here. If either side's mapping changes, that side's
 * suite fails until the table is edited - and the table is what a reviewer
 * compares across the two files.
 */
const SHARED_ISSUE_TABLE = [
  { status: "FINAL", reasons: [], punch_count: 2, issue: null },
  { status: "ABSENT", reasons: [], punch_count: 0, issue: "ABSENT" },
  { status: "REGULARIZATION_PENDING", reasons: [], punch_count: 1, issue: "REGULARIZATION_PENDING" },
  { status: "NO_SHIFT_FOR_DATE", reasons: ["NO_SHIFT_FOR_DATE"], punch_count: 0, issue: "NO_SHIFT" },
  { status: "NO_SCHEDULE_ROW", reasons: ["NO_SCHEDULE_ROW"], punch_count: 0, issue: "SHIFT_SETUP" },
  { status: "REVIEW_REQUIRED", reasons: ["MISSING_PUNCH"], punch_count: 1, issue: "MISSING_PUNCH" },
  { status: "REVIEW_REQUIRED", reasons: [], punch_count: 3, issue: "MISSING_PUNCH" },
  { status: "REVIEW_REQUIRED", reasons: ["NO_SCHEDULE_ROW"], punch_count: 0, issue: "SHIFT_SETUP" },
  { status: "REVIEW_REQUIRED", reasons: ["NO_SHIFT_FOR_DATE"], punch_count: 0, issue: "NO_SHIFT" },
  { status: "REVIEW_REQUIRED", reasons: [], punch_count: 2, issue: null },
  // OT is a claim on a day, never a defect in it.
  { status: "OT_PENDING", reasons: [], punch_count: 2, issue: null },
];

describe("the shared status -> issue table", () => {
  it("matches this repository's own canonical mapping, row for row", () => {
    SHARED_ISSUE_TABLE.forEach((row) => {
      const issue = dayIssue({
        status: row.status,
        review_reasons: row.reasons,
        punch_count: row.punch_count,
      });
      assert.equal(
        issue ? issue.key : null,
        row.issue,
        `${row.status} / [${row.reasons}] / ${row.punch_count} punches should map to ${row.issue}`
      );
    });
  });

  it("every issue the dashboard can link out from has a label and a bucket", () => {
    Object.entries(ISSUE_LINK).forEach(([key, link]) => {
      assert.ok(link.label, `${key} has no label`);
      assert.equal(link.bucket, key, `${key}'s drilldown bucket must be its own key`);
    });
  });

  it("the four Need Action issues are exactly the ones with a link entry", () => {
    assert.deepEqual(Object.keys(ISSUE_LINK).sort(), [
      "MISSING_PUNCH",
      "NO_SHIFT",
      "REGULARIZATION_PENDING",
      "SHIFT_SETUP",
    ]);
  });
});

describe("the six cards", () => {
  it("are the six approved ones, in order, each with its own drilldown bucket", () => {
    assert.deepEqual(
      CARDS.map((c) => c.key),
      [
        "total_employees",
        "checked_in",
        "not_yet_checked_in",
        "absent",
        "need_action",
        "ot_requests_pending",
      ]
    );
    assert.equal(new Set(CARDS.map((c) => c.bucket)).size, CARDS.length, "no two cards share a bucket");
    assert.equal(new Set(CARDS.map((c) => c.color)).size, CARDS.length, "six differently coloured cards");
  });

  it("uses green for check-ins and red for confirmed absence", () => {
    assert.equal(CARDS.find((c) => c.key === "checked_in").color, "green");
    assert.equal(CARDS.find((c) => c.key === "absent").color, "red");
    assert.equal(CARDS.find((c) => c.key === "not_yet_checked_in").color, "amber");
  });

  it("every card explains what it counts", () => {
    CARDS.forEach((c) => assert.ok(c.help && c.help.length > 20, `${c.key} has no explanation`));
  });

  it("the Checked In help says it is not 'currently inside' and not a payable day", () => {
    const help = CARDS.find((c) => c.key === "checked_in").help;
    assert.match(help, /not 'currently inside'/i);
    assert.match(help, /not a finalized payable Present Day/i);
  });
});

describe("a rate never overstates itself", () => {
  it("shows the percentage with its counts when available", () => {
    const rate = { numerator: 13, denominator: 21, percent: 61.9, available: true };
    assert.equal(ratePercent(rate), "61.9%");
    assert.equal(rateCounts(rate), "13 of 21");
    assert.match(rateDetail(rate), /13 of 21/);
  });

  it("an UNAVAILABLE rate is a dash, never 0%", () => {
    const rate = { numerator: 0, denominator: 0, percent: null, available: false };
    assert.equal(ratePercent(rate), "—");
    assert.match(rateDetail(rate), /this is not 0%/);
  });

  it("a missing rate object is a dash too, not a crash", () => {
    assert.equal(ratePercent(null), "—");
    assert.equal(ratePercent(undefined), "—");
    assert.equal(rateCounts(null), "—");
  });

  it("a genuine zero WITH a denominator is still 0%", () => {
    const rate = { numerator: 0, denominator: 12, percent: 0, available: true };
    assert.equal(ratePercent(rate), "0%", "nobody turned up out of twelve is a real 0%");
    assert.equal(rateCounts(rate), "0 of 12");
  });
});

describe("device freshness never says offline", () => {
  it("reports a recent contact as recent", () => {
    const f = deviceFreshness({ sync_known: true, last_seen_age_minutes: 4 });
    assert.equal(f.state, "RECENT");
    assert.equal(f.warn, false);
    assert.match(f.label, /4m ago/);
  });

  it("reports a long silence as STALE, with a warning, not as down", () => {
    const f = deviceFreshness({ sync_known: true, last_seen_age_minutes: STALE_AFTER_MINUTES + 1 });
    assert.equal(f.state, "STALE");
    assert.equal(f.warn, true);
    assert.doesNotMatch(f.label, /offline|down/i);
  });

  it("an unrecorded contact is UNKNOWN, not offline", () => {
    const f = deviceFreshness({ sync_known: false, last_seen_age_minutes: null });
    assert.equal(f.state, "UNKNOWN");
    assert.equal(f.label, "Sync unknown");
    assert.doesNotMatch(f.label, /offline|down/i);
  });

  it("reads last_seen_at and NEVER last_punch_at", () => {
    // A terminal nobody has punched on all day, but which is talking to the
    // receiver, is fresh. Deriving freshness from punches would call it stale.
    const f = deviceFreshness({
      sync_known: true,
      last_seen_age_minutes: 2,
      last_punch_age_minutes: 900,
    });
    assert.equal(f.state, "RECENT", "a quiet terminal that is still reporting in is not stale");
  });
});

describe("the feed freshness warning", () => {
  it("warns when no terminal is on record", () => {
    assert.match(feedWarning([]), /No attendance terminals are on record/);
  });

  it("warns when no terminal has a recorded contact", () => {
    const w = feedWarning([{ sync_known: false, last_seen_age_minutes: null }]);
    assert.match(w, /cannot be established/);
    assert.match(w, /caution/);
  });

  it("warns when every terminal has gone quiet, so absence is not asserted", () => {
    const w = feedWarning([
      { sync_known: true, last_seen_age_minutes: 300 },
      { sync_known: true, last_seen_age_minutes: 400 },
    ]);
    assert.match(w, /may be a feed problem rather than an absence/);
  });

  it("says nothing when at least one terminal is fresh", () => {
    assert.equal(
      feedWarning([
        { sync_known: true, last_seen_age_minutes: 5 },
        { sync_known: true, last_seen_age_minutes: 900 },
      ]),
      null
    );
  });
});

describe("the overview chart and legend", () => {
  const overview = {
    total: 10,
    slices: [
      { slice: "CHECKED_IN", label: "Checked In", count: 6 },
      { slice: "NOT_YET_CHECKED_IN", label: "Not Yet Checked In", count: 2 },
      { slice: "SHIFT_NOT_STARTED", label: "Shift Not Started", count: 0 },
      { slice: "ABSENT", label: "Absent (day closed)", count: 1 },
      { slice: "UNRESOLVED", label: "Unresolved / Data Pending", count: 1 },
    ],
  };

  it("drops empty slices from the CHART", () => {
    const data = overviewChartData(overview);
    assert.equal(data.length, 4);
    assert.ok(!data.some((d) => d.value === 0));
  });

  it("keeps every slice in the LEGEND, zeroes included", () => {
    const legend = overviewLegend(overview);
    assert.equal(legend.length, 5);
    const zero = legend.find((l) => l.slice === "SHIFT_NOT_STARTED");
    assert.equal(zero.count, 0, "'Shift Not Started: 0' is information, not a missing category");
  });

  it("computes each slice's share of the total", () => {
    const legend = overviewLegend(overview);
    assert.equal(legend.find((l) => l.slice === "CHECKED_IN").share, 60);
  });

  it("a zero total leaves the share null rather than dividing by zero", () => {
    const legend = overviewLegend({ total: 0, slices: overview.slices });
    assert.ok(legend.every((l) => l.share === null));
  });

  it("every slice has a declared colour, and check-in is green", () => {
    overview.slices.forEach((s) => assert.ok(SLICE_TONE[s.slice], `${s.slice} has no colour`));
    assert.equal(SLICE_TONE.CHECKED_IN, "green");
    assert.equal(SLICE_TONE.ABSENT, "red");
  });

  it("survives a missing overview without throwing", () => {
    assert.deepEqual(overviewChartData(null), []);
    assert.deepEqual(overviewLegend(undefined), []);
  });
});

describe("the trend is honest about what it does not have", () => {
  it("plots a percentage where available", () => {
    const rows = trendChartData({
      days: [
        {
          attendance_date: "2026-09-10",
          checked_in: 8,
          applicable: 10,
          check_in_rate: { percent: 80, available: true, numerator: 8, denominator: 10 },
        },
      ],
    });
    assert.equal(rows[0].percent, 80);
    assert.equal(rows[0].label, "10 Sep");
  });

  it("leaves a GAP, not a zero, for a day with no applicable population", () => {
    const rows = trendChartData({
      days: [
        {
          attendance_date: "2026-09-10",
          checked_in: 0,
          applicable: 0,
          check_in_rate: { percent: null, available: false, numerator: 0, denominator: 0 },
        },
      ],
    });
    assert.equal(rows[0].percent, null, "a zero would draw a collapse that never happened");
  });

  it("says so when there is no completed day", () => {
    assert.match(
      trendMessage({ available: false, reason: "NO_COMPLETED_DAYS", days: [] }),
      /still open and is not plotted/
    );
  });

  it("says so when nobody matches the filters", () => {
    assert.match(trendMessage({ available: false, reason: "NO_POPULATION", days: [] }), /No employees match/);
  });

  it("says how short a partial history is", () => {
    assert.match(
      trendMessage({ available: true, reason: "PARTIAL_HISTORY", days: [{}, {}, {}] }),
      /Only 3 completed attendance days are available/
    );
  });

  it("says nothing when the history is complete", () => {
    assert.equal(trendMessage({ available: true, reason: null, days: [{}] }), null);
  });
});

describe("the deep link into the existing monthly screen", () => {
  it("carries the employee and the date", () => {
    assert.equal(
      employeeDayHref(42, "2026-09-12"),
      "/attendance/calculated?employee_id=42&date=2026-09-12"
    );
  });

  it("omits a malformed date rather than passing it on", () => {
    assert.equal(employeeDayHref(42, "12-09-2026"), "/attendance/calculated?employee_id=42");
    assert.equal(employeeDayHref(42, null), "/attendance/calculated?employee_id=42");
  });

  it("returns null without a usable employee, so no broken link is rendered", () => {
    assert.equal(employeeDayHref(null, "2026-09-12"), null);
    assert.equal(employeeDayHref(0, "2026-09-12"), null);
    assert.equal(employeeDayHref("abc", "2026-09-12"), null);
  });
});

describe("formatting", () => {
  it("formats minutes as hours and minutes, never rounding them away", () => {
    assert.equal(formatMinutes(0), "0m");
    assert.equal(formatMinutes(45), "45m");
    assert.equal(formatMinutes(90), "1h 30m");
    assert.equal(formatMinutes(120), "2h");
    assert.equal(formatMinutes(null), "—");
    assert.equal(formatMinutes("nonsense"), "—");
  });

  it("formats an age, and says unknown when it is unknown", () => {
    assert.equal(formatAge(0), "just now");
    assert.equal(formatAge(5), "5m ago");
    assert.equal(formatAge(125), "2h ago");
    assert.equal(formatAge(60 * 24 * 3), "3d ago");
    assert.equal(formatAge(null), "unknown");
    assert.equal(formatAge(undefined), "unknown");
  });

  it("formats clock times and dates", () => {
    assert.equal(clock("2026-09-12 09:05:00"), "09:05");
    assert.equal(clock(null), "—");
    assert.equal(displayDate("2026-09-12"), "12 Sep 2026");
    assert.equal(shortDate("2026-09-12"), "12 Sep");
    assert.equal(displayDate("nonsense"), "nonsense");
  });

  it("istToday reads the IST business date, not the browser's", () => {
    // 23:45 UTC on the 11th is already the 12th in India.
    assert.equal(istToday(new Date(Date.UTC(2026, 8, 11, 23, 45))), "2026-09-12");
    assert.equal(istToday(new Date(Date.UTC(2026, 8, 11, 18, 29))), "2026-09-11");
  });
});

describe("a refusal is told apart from a failure", () => {
  it("recognises success", () => {
    assert.equal(isOk({ code: 200 }), true);
    assert.equal(isOk({ code: 403 }), false);
    assert.equal(isOk(null), false);
  });

  it("recognises a permission refusal, which arrives as a body-level code", () => {
    assert.equal(isForbidden({ code: 403 }), true);
    assert.equal(isForbidden({ code: 401 }), true);
    assert.equal(isForbidden({ code: 500 }), false);
    assert.equal(
      isForbidden({ code: 200 }),
      false,
      "a 403 shown as 'something went wrong' sends somebody to report a bug about a screen they are simply not entitled to"
    );
  });
});
