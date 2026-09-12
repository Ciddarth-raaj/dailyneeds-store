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

/** The six top cards, in the approved order, each with its meaning fixed. */
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
      "At least one valid punch during this attendance day. Not 'currently inside', and not a finalized payable Present Day.",
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
    key: "absent",
    label: "Absent",
    bucket: "ABSENT",
    color: "red",
    help:
      "Confirmed absence from the attendance engine, reported only after this attendance day has closed under the employee's own shift cutoff.",
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
  ABSENT: "red",
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
 * THE DEVICE FRESHNESS BADGE - and it never says "offline".
 *
 * A terminal is quiet when nobody punches, which is not the same as a terminal
 * that has stopped talking to the receiver. So this reads `last_seen_at` (any
 * contact, including the device's own polls) and NEVER `last_punch_at`, and
 * where the receiver has no record of a contact at all the answer is UNKNOWN
 * with a warning - not a claim that the device is down.
 *
 * @returns {{state:string, label:string, color:string, warn:boolean}}
 */
const STALE_AFTER_MINUTES = 60;

function deviceFreshness(device) {
  if (!device || device.sync_known !== true) {
    return {
      state: "UNKNOWN",
      label: "Sync unknown",
      color: "gray",
      warn: true,
    };
  }
  const age = device.last_seen_age_minutes;
  if (age === null || age === undefined) {
    return { state: "UNKNOWN", label: "Sync unknown", color: "gray", warn: true };
  }
  if (age > STALE_AFTER_MINUTES) {
    return {
      state: "STALE",
      label: `Last contact ${formatAge(age)}`,
      color: "amber",
      warn: true,
    };
  }
  return {
    state: "RECENT",
    label: `Last contact ${formatAge(age)}`,
    color: "green",
    warn: false,
  };
}

/**
 * Is the feed fresh enough to trust an assertion about absence?
 *
 * If NO device has been heard from recently, the screen must say so rather
 * than presenting "nobody checked in" as a fact about people - it may be a
 * fact about the feed. Returns a warning when there are devices and none of
 * them is recent, and when there are no devices on record at all.
 */
function feedWarning(devices) {
  const rows = Array.isArray(devices) ? devices : [];
  if (rows.length === 0) {
    return "No attendance terminals are on record, so device freshness cannot be established for this view.";
  }
  const known = rows.filter((d) => d.sync_known === true && d.last_seen_age_minutes !== null);
  if (known.length === 0) {
    return "No terminal has a recorded last contact, so the freshness of this attendance feed cannot be established. Treat missing check-ins with caution.";
  }
  const freshest = Math.min(...known.map((d) => Number(d.last_seen_age_minutes)));
  if (freshest > STALE_AFTER_MINUTES) {
    return `No terminal has been heard from for ${formatAge(freshest)}. Missing check-ins may be a feed problem rather than an absence.`;
  }
  return null;
}

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
    // A day with no applicable population plots a GAP, not a zero.
    percent: d.check_in_rate && d.check_in_rate.available ? d.check_in_rate.percent : null,
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
  ABSENT: "Absent",
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
  STALE_AFTER_MINUTES,
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
