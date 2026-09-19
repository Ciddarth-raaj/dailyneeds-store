/**
 * Attendance Dashboard screens - the pure part.
 *
 * CommonJS so `node --test util/attendanceDashboard.test.js` runs it without
 * a bundler; the screens import it through Babel's interop, exactly as
 * `util/attendanceV2.js` is imported.
 *
 * NOTHING HERE COUNTS ANYTHING. Every figure the dashboard shows is computed
 * on the server, from the attendance engine, and arrives in the response. This
 * file decides how those figures are LABELLED, COLOURED and LAID OUT, and it
 * holds the one rule that the browser genuinely owns: how to render a rate
 * that the server has told us is unavailable. A dashboard that re-derived a
 * count in the browser would be a second source of truth that could disagree
 * with the employee's own attendance screen, which is the whole thing this
 * design avoids.
 *
 * THE PALETTE IS THE APPROVED ONE. Green for check-ins, red for confirmed
 * absence, amber for attention and pending states, and restrained blue and
 * purple for accents. It is declared once, here, so no panel can invent its
 * own meaning for a colour: if a number is green anywhere on this screen it
 * means somebody turned up, and if it is red it means a settled absence.
 */

/**
 * THE THREE PRIMARY CARDS: Expected Now, Recorded IN, Gap.
 *
 * These replace the six absence-focused cards. The question the screen answers
 * changed - from "who was absent" to "who should be on duty and who is
 * recorded IN" - and the primary presentation follows it.
 *
 * The wording is load-bearing. "Recorded IN" is not "present": several Daily
 * Needs employees eat on the premises and punch twice a day, so a recorded IN
 * says a punch opened a session, not that somebody is at a counter. "Gap" is
 * not "absent" and not "shortage": it is schedule minus recorded cover, and
 * every one of its reasons is something to check rather than a finding.
 */
const PRIMARY_CARDS = Object.freeze([
  {
    key: "expected_now",
    label: "Expected Now",
    bucket: "EXPECTED",
    color: "navy",
    help:
      "Employees whose assigned shift interval contains this moment: start ≤ now < end. The interval is the shift's own in-time to out-time — not normal hours, and not reduced by a break allowance.",
  },
  {
    key: "recorded_in",
    label: "Recorded IN",
    bucket: "RECORDED_IN_EXPECTED_LOCATION",
    color: "green",
    help:
      "Expected employees whose latest punch state as of now is an IN, at their expected location. Recorded IN does not mean actively working, at a counter, or not on a break.",
  },
  {
    key: "gap",
    label: "Gap",
    bucket: "GAP",
    color: "amber",
    help:
      "Expected Now minus Recorded IN at the expected location — 'not recorded IN against schedule'. Not absence, and not a confirmed staff shortage.",
  },
]);

/**
 * THE GAP REASONS, in the order they are shown. Mutually exclusive, and they
 * sum back to Gap.
 *
 * TWO OF THEM ARE ABOUT LOCATION CERTAINTY, and they exist because knowing that
 * somebody's latest punch opened a session is a different fact from knowing
 * WHERE it happened. An IN at an unmapped terminal used to count as cover of the
 * scheduled outlet, which quietly reduced a real location's gap on the strength
 * of a place nobody could name. It no longer does - but it is not "recorded
 * elsewhere" either, because unknown is not somewhere else. Both say
 * "verification needed" and neither says anything about the employee.
 */
const GAP_REASONS = Object.freeze([
  { key: "NO_CHECK_IN", label: "No check-in received", color: "amber" },
  { key: "RECORDED_OUT", label: "Recorded OUT during the shift", color: "orange" },
  { key: "IN_ELSEWHERE", label: "Recorded IN at another location", color: "blue" },
  {
    key: "IN_LOCATION_UNKNOWN",
    label: "Recorded IN, location not verified",
    color: "purple",
  },
  {
    key: "EXPECTED_LOCATION_UNKNOWN",
    label: "No expected location on record",
    color: "purple",
  },
  { key: "INDETERMINATE", label: "Punch state cannot be determined", color: "gray" },
]);

/**
 * The reasons where the person IS recorded IN somewhere and the place is the
 * open question. Shown together as a company-wide figure, and credited to no
 * outlet - which is the whole point of separating them.
 */
const LOCATION_UNVERIFIED_REASONS = Object.freeze([
  "IN_ELSEWHERE",
  "IN_LOCATION_UNKNOWN",
  "EXPECTED_LOCATION_UNKNOWN",
]);

/**
 * NEEDS ATTENTION NOW - what each reason means and where the work is done.
 *
 * The dashboard only points; every target screen keeps its own permission, and
 * a user without it simply cannot follow the link. Nothing is approved,
 * rejected or regularized from here.
 */
const ATTENTION_TARGETS = Object.freeze({
  ATTENDANCE_DETAIL: { label: "Open attendance detail", href: "/attendance/calculated" },
  APPROVAL_QUEUE: { label: "Open approval queue", href: "/attendance/approval" },
  // The OT tab of the one approval screen, deep-linked.
  OT_APPROVAL_QUEUE: { label: "Open OT approvals", href: "/attendance/approval?type=OT" },
  SHIFT_ASSIGNMENT: { label: "Open shift assignment", href: "/employee-shift-assignment" },
});

/** The tone each attention reason is drawn in. None of them is a verdict. */
const ATTENTION_TONE = Object.freeze({
  SHIFT_SETUP: "purple",
  NO_CHECK_IN: "amber",
  IN_ELSEWHERE: "blue",
  IN_LOCATION_UNKNOWN: "purple",
  EXPECTED_LOCATION_UNKNOWN: "purple",
  INDETERMINATE: "gray",
  REGULARIZATION_PENDING: "orange",
  OT_PENDING: "blue",
  MISSING_PUNCH: "orange",
});

/**
 * Where an attention item links to, with the employee and date it is about.
 *
 * A deep link is a PRESELECTION and never an authorization: the target route
 * checks its own key exactly as it does when reached from the menu.
 */
function attentionLink(item) {
  const target = ATTENTION_TARGETS[item && item.target];
  if (!target) return null;
  if (item.target === "ATTENDANCE_DETAIL" && item.employee_id) {
    const date = item.attendance_date ? `&date=${item.attendance_date}` : "";
    return { ...target, href: `${target.href}?employee_id=${item.employee_id}${date}` };
  }
  return target;
}

/** Minutes as a short "2h 15m" for an elapsed or waiting time. Never a penalty. */
function elapsedLabel(minutes) {
  if (minutes === null || minutes === undefined || !Number.isFinite(Number(minutes))) return null;
  const m = Math.max(0, Math.trunc(Number(minutes)));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 === 0 ? `${h}h` : `${h}h ${m % 60}m`;
}

/** The historical view's cards, unchanged apart from the absence rename. */
const CARDS = Object.freeze([
  {
    key: "total_employees",
    label: "Total Employees",
    bucket: "TOTAL",
    color: "navy",
    help:
      "Employees applicable to this attendance date: joined on or before it and not resigned before it.",
  },
  {
    key: "checked_in",
    label: "Checked In",
    bucket: "CHECKED_IN",
    color: "green",
    help:
      "At least one valid punch during this attendance day. This is 'punched at some point', not 'recorded IN now' — the operational view uses the second.",
  },
  {
    key: "not_yet_checked_in",
    label: "Not Yet Checked In",
    bucket: "NOT_YET_CHECKED_IN",
    color: "amber",
    help:
      "Shift has started, the attendance day is still open, and no valid punch has arrived. Employees whose shift has not started are not counted here.",
  },
  {
    key: "no_record",
    label: "No Punches Recorded",
    bucket: "NO_RECORD",
    color: "red",
    help:
      "A finished attendance day with no punches. Not a confirmed absence: the terminals give no end-of-transfer acknowledgement, so undelivered punches look identical.",
  },
  {
    key: "need_action",
    label: "Need Action",
    bucket: "NEED_ACTION",
    color: "orange",
    help:
      "Missing Punch, Regularization Pending, No Shift Assigned or Shift Setup Issue. A pending OT request alone is not an attendance issue.",
  },
  {
    key: "ot_requests_pending",
    label: "OT Requests Pending",
    bucket: "OT_PENDING",
    color: "purple",
    help:
      "Overtime requests waiting for a decision, with the hours the engine derived for them. An OT claim is separate from attendance status.",
  },
]);

/**
 * The palette, as Chakra tokens. `navy` is the brand's own heading colour and
 * is not a Chakra scheme, so it is given explicit hexes.
 */
const PALETTE = Object.freeze({
  navy: { fg: "#1B2A5B", bg: "#EEF1F8", border: "#C6CFE6", chart: "#1B2A5B" },
  green: { fg: "green.700", bg: "green.50", border: "green.200", chart: "#2F855A" },
  red: { fg: "red.700", bg: "red.50", border: "red.200", chart: "#C53030" },
  amber: { fg: "orange.700", bg: "orange.50", border: "orange.200", chart: "#B7791F" },
  orange: { fg: "orange.700", bg: "orange.50", border: "orange.200", chart: "#DD6B20" },
  purple: { fg: "purple.700", bg: "purple.50", border: "purple.200", chart: "#6B46C1" },
  blue: { fg: "blue.700", bg: "blue.50", border: "blue.200", chart: "#2B6CB0" },
  gray: { fg: "gray.700", bg: "gray.50", border: "gray.200", chart: "#718096" },
});

const tone = (color) => PALETTE[color] || PALETTE.gray;

/** The Attendance Overview slices, with the colour each carries everywhere. */
const SLICE_TONE = Object.freeze({
  CHECKED_IN: "green",
  NOT_YET_CHECKED_IN: "amber",
  SHIFT_NOT_STARTED: "blue",
  NO_RECORD: "red",
  UNRESOLVED: "gray",
});

/** The four canonical issues, with the screen each links out to. */
const ISSUE_LINK = Object.freeze({
  MISSING_PUNCH: { label: "Missing Punch", color: "red", bucket: "MISSING_PUNCH" },
  REGULARIZATION_PENDING: {
    label: "Regularization Pending",
    color: "orange",
    bucket: "REGULARIZATION_PENDING",
    href: "/attendance/approval",
    permission: "view_attendance_approvals",
    action: "Open Attendance Approval",
  },
  NO_SHIFT: {
    label: "No Shift Assigned",
    color: "gray",
    bucket: "NO_SHIFT",
    href: "/employee-shift-assignment",
    // BOTH keys, because that screen's own read endpoint requires both
    // (`requireAll(view_employees, view_shift_assignments)`): it joins the
    // employee master to the shift master. Offering the link to somebody
    // holding one of them would hand them a button that 403s.
    permission: ["view_employees", "view_shift_assignments"],
    action: "Open Employee Shift Assignment",
  },
  SHIFT_SETUP: {
    label: "Shift Setup Issue",
    color: "gray",
    bucket: "SHIFT_SETUP",
    href: "/work-shift",
    permission: "view_work_shifts",
    action: "Open Shift Management",
  },
});

/**
 * A rate as text, and the ONE place the unavailable state is decided.
 *
 * The server sends `{numerator, denominator, percent, available}`. When
 * `available` is false the denominator was zero - nobody was employed in that
 * group - and the answer is a dash, never "0%". A 0% attendance rate for an
 * outlet that employs nobody would read as a total failure and would be a lie
 * about the data.
 */
function ratePercent(rate) {
  if (!rate || rate.available !== true || rate.percent === null || rate.percent === undefined) {
    return "—";
  }
  return `${rate.percent}%`;
}

/** `12 of 40` - the counts a percentage was built from, always available. */
function rateCounts(rate) {
  if (!rate) return "—";
  return `${Number(rate.numerator) || 0} of ${Number(rate.denominator) || 0}`;
}

/**
 * The full explanation of a rate, for the tooltip: the percentage, the pair it
 * came from, and why it is a dash when it is one.
 */
function rateDetail(rate) {
  if (!rate) return "No data";
  if (rate.available !== true) {
    return "Not available: no applicable employees in this group, so there is no rate to report (this is not 0%).";
  }
  return `${ratePercent(rate)} — ${rateCounts(rate)} employees`;
}

/** `2h 30m`, `45m`, `0m`. Minutes are the unit; nothing is rounded away. */
function formatMinutes(value) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const total = Math.max(0, Math.trunc(n));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** `4m ago`, `2h ago`, `3d ago`, or "unknown" when the age is not known. */
function formatAge(minutes) {
  if (minutes === null || minutes === undefined) return "unknown";
  const n = Math.max(0, Math.trunc(Number(minutes) || 0));
  if (n < 1) return "just now";
  if (n < 60) return `${n}m ago`;
  if (n < 60 * 24) return `${Math.floor(n / 60)}h ago`;
  return `${Math.floor(n / (60 * 24))}d ago`;
}

/** `HH:MM` out of `YYYY-MM-DD HH:MM:SS`. */
function clock(value) {
  if (!value) return "—";
  const m = /(\d{2}):(\d{2})(?::\d{2})?$/.exec(String(value).trim());
  return m ? `${m[1]}:${m[2]}` : String(value);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `12 Sep 2026` from `YYYY-MM-DD`. */
function displayDate(dateOnly) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOnly || ""));
  if (!m) return String(dateOnly || "");
  return `${Number(m[3])} ${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}`;
}

/** `12 Sep` - the short form the trend axis uses. */
function shortDate(dateOnly) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOnly || ""));
  if (!m) return String(dateOnly || "");
  return `${Number(m[3])} ${MONTH_NAMES[Number(m[2]) - 1]}`;
}

/**
 * DELIVERY COVERAGE, as the server decides it, rendered.
 *
 * The server answers "have this location's punches for the SELECTED DATE
 * actually reached us" by comparing each terminal's last contact with that
 * attendance day's own close instant. That verdict is what the screen shows.
 */
/**
 * Delivery badges. There is deliberately no "confirmed" state: the terminals
 * give no end-of-transfer acknowledgement and nothing ever marks a historical
 * pull complete, so the server can never send one.
 */
const DELIVERY_BADGE = Object.freeze({
  UNVERIFIED: { label: "Delivery not verified", color: "gray", warn: false },
  IN_PROGRESS: { label: "Punches still arriving", color: "amber", warn: true },
  PULL_FAILED: { label: "A punch retrieval failed", color: "orange", warn: true },
});

function deliveryBadge(delivery) {
  return DELIVERY_BADGE[delivery] || DELIVERY_BADGE.UNVERIFIED;
}

/**
 * THE TERMINAL BADGE - and it never says "offline", and it no longer invents
 * a staleness threshold.
 *
 * An earlier version called a terminal STALE after sixty minutes of silence.
 * That number was invented here: nothing in the system defines it, no approved
 * setting carries it, and it made the badge depend on when somebody happened
 * to open the page rather than on anything about the data. It is gone.
 *
 * What is shown instead is the SERVER'S per-date delivery verdict, which is
 * derived from the attendance day's own cutoff and no threshold at all, plus
 * the last contact time as plain unjudged information. Where the receiver has
 * never recorded a contact the answer is "Sync unknown" - never a claim that
 * the device is down, which nothing in the data supports.
 *
 * @returns {{state:string, label:string, color:string, warn:boolean, detail:string}}
 */
function deviceFreshness(device) {
  if (!device || device.sync_known !== true) {
    return {
      state: "UNVERIFIED",
      label: "No contact on record",
      color: "gray",
      warn: true,
      detail: "The receiver has no record of this terminal ever being in contact.",
    };
  }
  const badge = deliveryBadge(device.delivery);
  return {
    state: device.delivery || "UNVERIFIED",
    label: badge.label,
    color: badge.color,
    warn: badge.warn,
    // Contact time is information, never evidence of delivery: an idle poll
    // updates it and proves nothing about buffered punches.
    detail: `Last contact ${formatAge(device.last_seen_age_minutes)} (a contact is not a delivery).`,
  };
}

/**
 * The warning the panel shows when the feed cannot vouch for this day.
 *
 * Built from the SERVER'S coverage verdicts rather than from ages measured in
 * the browser, so the screen and the counts agree about which locations are
 * unconfirmed - and the wording says what it means for the numbers.
 *
 * @param {Array} coverage `[{store_id, coverage, label}]` for the date
 * @param {boolean} available false when the device read itself failed
 */
function feedWarning(delivery, available = true) {
  if (available === false) {
    return "Punch retrieval state could not be read for this day.";
  }
  const rows = Array.isArray(delivery) ? delivery : [];
  const arriving = rows.filter((c) => c.delivery === "IN_PROGRESS").length;
  const failed = rows.filter((c) => c.delivery === "PULL_FAILED").length;
  if (arriving === 0 && failed === 0) return null;

  const parts = [];
  if (arriving > 0) {
    parts.push(`${arriving} location${arriving === 1 ? " is" : "s are"} still receiving punches for this day`);
  }
  if (failed > 0) {
    parts.push(`${failed} location${failed === 1 ? " had a" : "s had"} punch retrieval fail`);
  }
  return `${parts.join(", and ")}. Figures for those locations understate attendance.`;
}

/**
 * The standing note about delivery, shown once rather than on every panel.
 *
 * It is not a warning about a fault - it is the permanent condition of this
 * feed, and the reason nothing on this screen says "absent".
 */
const DELIVERY_STANDING_NOTE =
  "Punches received are shown as they arrive. The terminals give no end-of-transfer acknowledgement, so this screen never reports a confirmed absence.";

/**
 * The Attendance Overview slices as chart data, dropping the empty ones from
 * the CHART but keeping every one in the LEGEND.
 *
 * A zero slice draws nothing, and recharts renders a zero-value pie segment as
 * an invisible sliver with a label on top of its neighbour - so it is dropped
 * from the drawing. It stays in the legend at zero, because "Absent: 0" is
 * information worth having and a missing row reads as a missing category.
 */
function overviewChartData(overview) {
  const slices = overview && Array.isArray(overview.slices) ? overview.slices : [];
  return slices
    .filter((s) => Number(s.count) > 0)
    .map((s) => ({
      name: s.label,
      slice: s.slice,
      value: Number(s.count) || 0,
      fill: tone(SLICE_TONE[s.slice] || "gray").chart,
    }));
}

/** Every slice, zeroes included, for the legend beside the chart. */
function overviewLegend(overview) {
  const slices = overview && Array.isArray(overview.slices) ? overview.slices : [];
  const total = Number(overview && overview.total) || 0;
  return slices.map((s) => ({
    name: s.label,
    slice: s.slice,
    count: Number(s.count) || 0,
    color: SLICE_TONE[s.slice] || "gray",
    share: total > 0 ? Math.round(((Number(s.count) || 0) / total) * 1000) / 10 : null,
  }));
}

/** The trend as chart rows: the rate where available, and null where not. */
function trendChartData(trend) {
  const days = trend && Array.isArray(trend.days) ? trend.days : [];
  return days.map((d) => ({
    date: d.attendance_date,
    label: shortDate(d.attendance_date),
    // A day with no applicable population - or whose punch delivery is not
    // confirmed - plots a GAP, not a zero. Both are "we cannot say", and a
    // zero would draw a collapse that never happened.
    percent: d.check_in_rate && d.check_in_rate.available ? d.check_in_rate.percent : null,
    delivery_confirmed: d.delivery_confirmed !== false,
    checked_in: Number(d.checked_in) || 0,
    applicable: Number(d.applicable) || 0,
  }));
}

/** What an empty or partial trend says, in words, rather than a blank box. */
function trendMessage(trend) {
  if (!trend) return "Trend could not be loaded.";
  if (trend.available !== true) {
    if (trend.reason === "NO_POPULATION") {
      return "No employees match these filters, so there is no trend to show.";
    }
    if (trend.reason === "NO_PLOTTABLE_DAYS") {
      return "Punch delivery is not confirmed for any completed day in this range, so no rate is plotted — it would be a lower bound rather than a measurement.";
    }
    return "No completed attendance days yet for these filters. The selected day is still open and is not plotted.";
  }
  if (trend.reason === "PARTIAL_HISTORY") {
    return `Only ${trend.days.length} completed attendance ${
      trend.days.length === 1 ? "day is" : "days are"
    } available for this range.`;
  }
  return null;
}

/** The drilldown modal's heading for a bucket. */
const BUCKET_TITLE = Object.freeze({
  TOTAL: "All applicable employees",
  CHECKED_IN: "Checked in",
  NOT_YET_CHECKED_IN: "Not yet checked in",
  SHIFT_NOT_STARTED: "Shift not started",
  NO_RECORD: "No punches recorded",
  UNRESOLVED: "Unresolved / data pending",
  NEED_ACTION: "Need action",
  OT_PENDING: "OT requests pending",
  MISSING_PUNCH: "Missing Punch",
  REGULARIZATION_PENDING: "Regularization Pending",
  NO_SHIFT: "No Shift Assigned",
  SHIFT_SETUP: "Shift Setup Issue",
});

function bucketTitle(bucket) {
  return BUCKET_TITLE[bucket] || String(bucket || "Employees");
}

/**
 * THE DEEP LINK to an employee's existing monthly screen, for a date.
 *
 * `/attendance/calculated` is the screen that already exists and already holds
 * the whole month, the Day Detail, Edit Shift and Void Punch. The dashboard
 * links INTO it rather than reimplementing any of that, and the parameters are
 * read there as a preselection only - ordinary browsing on that screen is
 * unchanged.
 */
function employeeDayHref(employeeId, attendanceDate) {
  const id = Number(employeeId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(attendanceDate || "")) ? attendanceDate : null;
  return `/attendance/calculated?employee_id=${id}${date ? `&date=${date}` : ""}`;
}

/** `YYYY-MM-DD` today, in IST, for the default filter. */
function istToday(now = new Date()) {
  const ist = new Date(now.getTime() + (5 * 60 + 30) * 60 * 1000);
  return `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, "0")}-${String(
    ist.getUTCDate()
  ).padStart(2, "0")}`;
}

/** The message a screen shows for an API answer that was not a success. */
function apiMessage(body, fallback = "The request could not be completed") {
  if (!body || typeof body !== "object") return fallback;
  if (typeof body.msg !== "string" || !body.msg) return fallback;
  return body.msg.replace(/^ValidationError:\s*/, "");
}

/** True when a helper's answer is the success it promised. */
function isOk(body) {
  return !!body && typeof body === "object" && Number(body.code) === 200;
}

/**
 * Is this response a PERMISSION refusal rather than a failure?
 *
 * The backend answers a 403 as a body-level code (see `middlewares/auth.js`),
 * so a refusal has to be told apart from an error by reading `code`. The
 * screen shows a permission-denied state for one and an error state for the
 * other; a 403 rendered as "something went wrong" would send somebody to
 * report a bug about a screen they are simply not entitled to.
 */
function isForbidden(body) {
  return !!body && typeof body === "object" && (Number(body.code) === 403 || Number(body.code) === 401);
}

module.exports = {
  CARDS,
  PALETTE,
  tone,
  SLICE_TONE,
  ISSUE_LINK,
  PRIMARY_CARDS,
  GAP_REASONS,
  LOCATION_UNVERIFIED_REASONS,
  ATTENTION_TARGETS,
  ATTENTION_TONE,
  attentionLink,
  elapsedLabel,
  DELIVERY_BADGE,
  DELIVERY_STANDING_NOTE,
  deliveryBadge,
  ratePercent,
  rateCounts,
  rateDetail,
  formatMinutes,
  formatAge,
  clock,
  displayDate,
  shortDate,
  deviceFreshness,
  feedWarning,
  overviewChartData,
  overviewLegend,
  trendChartData,
  trendMessage,
  bucketTitle,
  employeeDayHref,
  istToday,
  apiMessage,
  isOk,
  isForbidden,
};
