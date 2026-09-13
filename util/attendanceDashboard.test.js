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
  ATTENTION_TONE,
  CARDS,
  DELIVERY_BADGE,
  DELIVERY_STANDING_NOTE,
  GAP_REASONS,
  ATTENTION_TARGETS,
  ISSUE_LINK,
  LOCATION_UNVERIFIED_REASONS,
  PRIMARY_CARDS,
  SLICE_TONE,
  clock,
  deliveryBadge,
  deviceFreshness,
  displayDate,
  employeeDayHref,
  feedWarning,
  formatAge,
  formatMinutes,
  attentionLink,
  elapsedLabel,
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

describe("the three primary cards", () => {
  it("are Expected Now, Recorded IN and Gap, in that order", () => {
    assert.deepEqual(
      PRIMARY_CARDS.map((c) => c.key),
      ["expected_now", "recorded_in", "gap"]
    );
  });

  it("each opens its own list", () => {
    assert.equal(new Set(PRIMARY_CARDS.map((c) => c.bucket)).size, 3);
  });

  it("the Expected Now help says the interval is not normal hours or a break", () => {
    const help = PRIMARY_CARDS.find((c) => c.key === "expected_now").help;
    assert.match(help, /start ≤ now < end/);
    assert.match(help, /not normal hours/i);
    assert.match(help, /not reduced by a break/i);
  });

  it("the Recorded IN help refuses to claim presence", () => {
    const help = PRIMARY_CARDS.find((c) => c.key === "recorded_in").help;
    assert.match(help, /does not mean actively working/i);
    assert.match(help, /not on a break/i);
  });

  it("the Gap help says it is not absence and not a shortage", () => {
    const help = PRIMARY_CARDS.find((c) => c.key === "gap").help;
    assert.match(help, /not absence/i);
    assert.match(help, /not a confirmed staff shortage/i);
  });

  it("no primary card mentions absence at all", () => {
    PRIMARY_CARDS.forEach((c) => {
      assert.doesNotMatch(c.label, /absent/i, `${c.key} label`);
    });
  });
});

describe("the gap reasons", () => {
  it("are the mutually exclusive ones the server sends", () => {
    // SIX, not four. Two of them separate "recorded IN somewhere" from
    // "recorded IN here", which the server used to collapse into coverage.
    assert.deepEqual(
      GAP_REASONS.map((r) => r.key),
      [
        "NO_CHECK_IN",
        "RECORDED_OUT",
        "IN_ELSEWHERE",
        "IN_LOCATION_UNKNOWN",
        "EXPECTED_LOCATION_UNKNOWN",
        "INDETERMINATE",
      ]
    );
  });

  it("name the location-uncertain reasons as questions about the RECORD", () => {
    const unknown = GAP_REASONS.find((r) => r.key === "IN_LOCATION_UNKNOWN");
    const noOutlet = GAP_REASONS.find((r) => r.key === "EXPECTED_LOCATION_UNKNOWN");
    assert.match(unknown.label, /location not verified/i);
    assert.match(noOutlet.label, /no expected location on record/i);
    // Neither says anything about the employee, and neither claims they are
    // somewhere else - unknown is not "elsewhere".
    [unknown, noOutlet].forEach((r) => {
      assert.doesNotMatch(r.label, /another location|elsewhere|absent|missing\b/i);
    });
  });

  it("mark exactly the three where the person IS recorded IN but the place is not", () => {
    assert.deepEqual([...LOCATION_UNVERIFIED_REASONS].sort(), [
      "EXPECTED_LOCATION_UNKNOWN",
      "IN_ELSEWHERE",
      "IN_LOCATION_UNKNOWN",
    ]);
    assert.ok(!LOCATION_UNVERIFIED_REASONS.includes("NO_CHECK_IN"));
    assert.ok(!LOCATION_UNVERIFIED_REASONS.includes("COVERED"));
  });

  it("never interpret an OUT as lunch or an early departure", () => {
    const out = GAP_REASONS.find((r) => r.key === "RECORDED_OUT");
    assert.equal(out.label, "Recorded OUT during the shift");
    GAP_REASONS.forEach((r) =>
      assert.doesNotMatch(r.label, /lunch|absent|unauthoris|early departure|late/i)
    );
  });
});

describe("the historical cards", () => {
  it("keep the six, with absence renamed to what the data supports", () => {
    assert.deepEqual(
      CARDS.map((c) => c.key),
      [
        "total_employees",
        "checked_in",
        "not_yet_checked_in",
        "no_record",
        "need_action",
        "ot_requests_pending",
      ]
    );
    assert.equal(CARDS.find((c) => c.key === "no_record").label, "No Punches Recorded");
  });

  it("say plainly that no-record is not a confirmed absence", () => {
    assert.match(CARDS.find((c) => c.key === "no_record").help, /Not a confirmed absence/i);
  });

  it("distinguish 'checked in at some point' from 'recorded IN now'", () => {
    assert.match(
      CARDS.find((c) => c.key === "checked_in").help,
      /not 'recorded IN now'/i,
      "the two metrics must never borrow each other's wording"
    );
  });

  it("uses green for check-ins and red for the no-record card", () => {
    assert.equal(CARDS.find((c) => c.key === "checked_in").color, "green");
    assert.equal(CARDS.find((c) => c.key === "no_record").color, "red");
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

describe("the terminal badge shows the server's verdict, never 'confirmed'", () => {
  it("has no confirmed state to show", () => {
    assert.deepEqual(Object.keys(DELIVERY_BADGE).sort(), [
      "IN_PROGRESS",
      "PULL_FAILED",
      "UNVERIFIED",
    ]);
    Object.values(DELIVERY_BADGE).forEach((b) =>
      assert.doesNotMatch(b.label, /^Delivery confirmed$/i)
    );
  });

  it("unverified is the normal state and is not an alarm", () => {
    const f = deviceFreshness({ sync_known: true, delivery: "UNVERIFIED", last_seen_age_minutes: 4 });
    assert.equal(f.state, "UNVERIFIED");
    assert.equal(f.warn, false, "the normal condition of this feed is not a fault");
    assert.match(f.label, /not verified/i);
  });

  it("a running retrieval warns that punches are still arriving", () => {
    const f = deviceFreshness({ sync_known: true, delivery: "IN_PROGRESS", last_seen_age_minutes: 2 });
    assert.match(f.label, /still arriving/i);
    assert.equal(f.warn, true);
  });

  it("a failed retrieval warns, and is not treated as finished", () => {
    const f = deviceFreshness({ sync_known: true, delivery: "PULL_FAILED", last_seen_age_minutes: 2 });
    assert.match(f.label, /failed/i);
    assert.equal(f.warn, true);
  });

  it("no contact on record is said plainly, never 'offline'", () => {
    const f = deviceFreshness({ sync_known: false });
    assert.match(f.label, /No contact on record/i);
    assert.doesNotMatch(f.label, /offline|down/i);
  });

  it("says outright that a contact is not a delivery", () => {
    const f = deviceFreshness({ sync_known: true, delivery: "UNVERIFIED", last_seen_age_minutes: 1 });
    assert.match(f.detail, /a contact is not a delivery/i);
  });

  it("an unknown verdict falls back to unverified, never to confirmed", () => {
    assert.equal(deliveryBadge("SOMETHING_NEW").label, DELIVERY_BADGE.UNVERIFIED.label);
    assert.equal(deliveryBadge(undefined).label, DELIVERY_BADGE.UNVERIFIED.label);
  });
});

describe("the feed warning reports only what is positively known", () => {
  it("says nothing when no retrieval is running or failed", () => {
    assert.equal(
      feedWarning([
        { store_id: 1, delivery: "UNVERIFIED" },
        { store_id: 2, delivery: "UNVERIFIED" },
      ]),
      null,
      "unverified is the permanent condition, not news"
    );
  });

  it("names locations still receiving punches", () => {
    assert.match(feedWarning([{ store_id: 1, delivery: "IN_PROGRESS" }]), /still receiving punches/);
  });

  it("names locations whose retrieval failed", () => {
    assert.match(feedWarning([{ store_id: 1, delivery: "PULL_FAILED" }]), /retrieval fail/);
  });

  it("says figures understate attendance, never that people were absent", () => {
    const w = feedWarning([{ store_id: 1, delivery: "IN_PROGRESS" }]);
    assert.match(w, /understate attendance/);
    assert.doesNotMatch(w, /absent/i);
  });

  it("reports a failed read of the retrieval state", () => {
    assert.match(feedWarning([], false), /could not be read/);
  });

  it("the standing note explains why nothing here says absent", () => {
    assert.match(DELIVERY_STANDING_NOTE, /no end-of-transfer acknowledgement/i);
    assert.match(DELIVERY_STANDING_NOTE, /never reports a confirmed absence/i);
  });
});

describe("the overview chart and legend", () => {
  const overview = {
    total: 10,
    slices: [
      { slice: "CHECKED_IN", label: "Checked In", count: 6 },
      { slice: "NOT_YET_CHECKED_IN", label: "Not Yet Checked In", count: 2 },
      { slice: "SHIFT_NOT_STARTED", label: "Shift Not Started", count: 0 },
      { slice: "NO_RECORD", label: "No punches recorded", count: 1 },
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
    assert.equal(SLICE_TONE.NO_RECORD, "red");
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

describe("a trend day without confirmed delivery is a gap, not a zero", () => {
  it("plots nothing for a day whose delivery is unconfirmed", () => {
    const rows = trendChartData({
      days: [
        {
          attendance_date: "2026-09-10",
          checked_in: 8,
          applicable: 10,
          delivery_confirmed: false,
          check_in_rate: { percent: null, available: false, numerator: 8, denominator: 10 },
        },
      ],
    });
    assert.equal(rows[0].percent, null, "a lower bound must not be drawn as a measurement");
    assert.equal(rows[0].delivery_confirmed, false);
    // The counts are still carried, because they are not in doubt.
    assert.equal(rows[0].checked_in, 8);
    assert.equal(rows[0].applicable, 10);
  });

  it("says so when no completed day can be plotted", () => {
    assert.match(
      trendMessage({ available: false, reason: "NO_PLOTTABLE_DAYS", days: [{}] }),
      /lower bound rather than a measurement/
    );
  });
});



/* ==================================================================== */
/* NEEDS ATTENTION NOW - links out, never acts.                          */
/* ==================================================================== */

describe("the needs-attention layer", () => {
  it("gives every reason a tone, and none of them is a verdict colour", () => {
    const keys = Object.keys(ATTENTION_TONE);
    [
      "SHIFT_SETUP",
      "NO_CHECK_IN",
      "IN_ELSEWHERE",
      "IN_LOCATION_UNKNOWN",
      "EXPECTED_LOCATION_UNKNOWN",
      "INDETERMINATE",
      "REGULARIZATION_PENDING",
      "OT_PENDING",
      "MISSING_PUNCH",
    ].forEach((k) => assert.ok(keys.includes(k), `${k} has no tone`));
    // Nothing is drawn in red: none of these is an established fault by a
    // person, and a red row reads as one.
    assert.ok(!Object.values(ATTENTION_TONE).includes("red"));
  });

  it("links an operational item to the employee's own attendance detail", () => {
    const link = attentionLink({
      target: "ATTENDANCE_DETAIL",
      employee_id: 42,
      attendance_date: "2026-09-12",
    });
    assert.equal(link.href, "/attendance/calculated?employee_id=42&date=2026-09-12");
  });

  it("links a waiting approval to the queue that owns it", () => {
    assert.equal(attentionLink({ target: "APPROVAL_QUEUE" }).href, "/attendance/approval");
    assert.equal(attentionLink({ target: "OT_APPROVAL_QUEUE" }).href, "/attendance/ot-approval");
    assert.equal(
      attentionLink({ target: "SHIFT_SETUP" }) || attentionLink({ target: "SHIFT_ASSIGNMENT" }).href,
      "/employee-shift-assignment"
    );
  });

  it("EVERY TARGET IS AN EXISTING SCREEN - nothing new, and nothing that decides", () => {
    Object.values(ATTENTION_TARGETS).forEach((t) => {
      assert.match(t.href, /^\/(attendance|employee-shift-assignment)/);
      // No approve/reject/regularize action is reachable from this panel: the
      // links are reads, and the target screen re-checks its own permission.
      assert.doesNotMatch(t.href, /approve\b|reject|regularize\?/i);
    });
  });

  it("refuses to invent a link for a target it does not know", () => {
    assert.equal(attentionLink({ target: "SOMETHING_NEW" }), null);
    assert.equal(attentionLink(null), null);
  });

  it("formats an elapsed time for ordering, and nothing when unknown", () => {
    assert.equal(elapsedLabel(45), "45m");
    assert.equal(elapsedLabel(60), "1h");
    assert.equal(elapsedLabel(135), "2h 15m");
    assert.equal(elapsedLabel(0), "0m");
    assert.equal(elapsedLabel(null), null);
    assert.equal(elapsedLabel(undefined), null);
  });
});
