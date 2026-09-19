/**
 * THE TELEGRAM ATTENDANCE MINI APP - the pure rules of the screen.
 *
 * CommonJS, like `util/attendanceV2.js` and for the same reason: so
 * `node --test util/telegramAttendance.test.js` runs it without a bundler.
 * The screens import it through Babel's interop.
 *
 * ======================================== WHAT IS DELIBERATELY NOT HERE ====
 *
 * HOW A PUNCH TIME IS BUILT. That is `calendarDateFor` in
 * `util/attendanceV2.js`, and this file RE-EXPORTS it rather than restating
 * it. A clock time before the shift's attendance-day cutoff belongs to the
 * next CALENDAR day while still belonging to this ATTENDANCE date; two
 * client-side copies of that rule would disagree the first time either was
 * edited, and the disagreement would be silent - a punch credited to the
 * wrong day. There is one copy, in the file the web screen already uses.
 *
 * AN EMPLOYEE ID. Nothing in the Mini App has one. The server takes the
 * employee from the verified Telegram session and refuses any field that
 * names one, so there is nothing for this layer to hold, send or format.
 *
 * A PUNCH COUNT. The list says which day needs a correction, never how many
 * times a machine saw somebody. The server does not send one either.
 */

const {
  calendarDateFor,
  clock,
  displayDate,
  weekday,
  isOk,
  apiMessage,
  currentMonth,
} = require("./attendanceV2");

/** The states the server's date list uses. Mirrors `DATE_STATE` on the API. */
const DATE_STATE = Object.freeze({
  ACTIONABLE: "ACTIONABLE",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  NOT_ACTIONABLE: "NOT_ACTIONABLE",
});

/** The three sections of the Mini App. My Attendance is the default. */
const SECTION = Object.freeze({
  ATTENDANCE: "ATTENDANCE",
  CORRECTIONS: "CORRECTIONS",
  HELP: "HELP",
});

const DEFAULT_SECTION = SECTION.ATTENDANCE;

/**
 * Tab order. The INDEX is what the controlled `<Tabs>` is driven by, and
 * My Attendance is index 0 so the Mini App opens on it whenever nothing
 * valid is asked for.
 */
const SECTION_ORDER = Object.freeze([SECTION.ATTENDANCE, SECTION.CORRECTIONS, SECTION.HELP]);

/** `?section=` values, as the bot and the alert write them. */
const SECTION_PARAM = Object.freeze({
  attendance: SECTION.ATTENDANCE,
  corrections: SECTION.CORRECTIONS,
  help: SECTION.HELP,
});

/**
 * An explicit, recognised `?section=`, or null when the URL names none.
 *
 * Null covers absent, empty, mistyped and hostile alike - an unrecognised
 * section is treated as NO section rather than as an error, so it falls
 * through to the same rules a bare URL does.
 */
function explicitSection(search) {
  const raw = typeof search === "string" ? search : "";
  const match = /[?&]section=([^&]*)/.exec(raw);
  if (!match) return null;
  let value;
  try {
    value = decodeURIComponent(match[1]);
  } catch (err) {
    return null;
  }
  const key = String(value).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(SECTION_PARAM, key) ? SECTION_PARAM[key] : null;
}

/**
 * WHICH SECTION A URL ASKS FOR - and it is only ever an ASK.
 *
 * ============================= WHY A BARE `?date=` MEANS CORRECTIONS =======
 *
 * Production has ALREADY SENT Regularise Attendance buttons in the old shape,
 * `?date=YYYY-MM-DD` with no section, and those messages are sitting in
 * employees' chats where they will be tapped for as long as the chat exists.
 * A tap on one has to land where the button promised - Corrections, on that
 * date - not on My Attendance with the employee left to work out that the
 * button they pressed about a missing punch did nothing visible.
 *
 * A date is only ever attached to a correction link, so a URL carrying a
 * valid date and no section can be read as one without guessing.
 *
 * ================================= THE RULE, IN PRECEDENCE ORDER ===========
 *
 *   1. an explicit, RECOGNISED `section=` wins outright, date or no date -
 *      `?section=attendance&date=…` is My Attendance, because the link said
 *      so and the date is only ever a hint;
 *   2. otherwise a VALID `date=` means Corrections - the legacy button;
 *   3. otherwise My Attendance.
 *
 * An INVALID date is no date at all (`navigationHint` validates it), so
 * `?date=yesterday` is rule 3 and lands on My Attendance. An unrecognised
 * section is treated as no section, so `?section=bogus&date=…` still honours
 * the legacy date rather than a value that means nothing.
 *
 * ================================== STILL ZERO AUTHORITY ==================
 *
 * Both parameters choose a TAB and a HIGHLIGHT. Neither can name an employee,
 * neither widens what the server returns, and neither is ever sent anywhere:
 * every API call the Mini App makes is pinned server-side to the employee
 * Telegram's signature resolved to. A date the employee is not entitled to is
 * not in the list the server returns, so it highlights nothing.
 */
function sectionFromQuery(search) {
  const explicit = explicitSection(search);
  if (explicit !== null) return explicit;
  // `navigationHint` is the one date validator, so "valid date" means exactly
  // what the highlight means - the two cannot disagree about a given URL.
  return navigationHint(search) !== null ? SECTION.CORRECTIONS : DEFAULT_SECTION;
}

/** The tab index for a section. Unknown sections land on My Attendance. */
function sectionIndex(section) {
  const index = SECTION_ORDER.indexOf(section);
  return index === -1 ? 0 : index;
}

/** The section for a tab index, for the controlled Tabs' onChange. */
function sectionAtIndex(index) {
  return SECTION_ORDER[index] || DEFAULT_SECTION;
}

/**
 * The Help text. Plain sentences, no approval controls, nothing that could be
 * mistaken for one - approvals are the manager/HR screens and are not in
 * Telegram at all.
 */
const HELP_LINES = Object.freeze([
  "My Attendance shows your attendance.",
  "Corrections is for missing-punch requests.",
  "Select the missing date, enter the missing punch time and reason, and submit.",
  "Submitted requests go for approval.",
  "Contact your manager or HR if your Telegram or employee details are incorrect.",
]);

/* ------------------------------------------------- month navigation ---- */

/** `2026-09` -> `2026-08`. Pure integer month arithmetic, no Date parsing. */
function shiftMonth(month, delta) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ""));
  if (!m) return month;
  const total = Number(m[1]) * 12 + (Number(m[2]) - 1) + delta;
  const year = Math.floor(total / 12);
  const index = total - year * 12;
  return `${year}-${String(index + 1).padStart(2, "0")}`;
}

const previousMonth = (month) => shiftMonth(month, -1);
const nextMonth = (month) => shiftMonth(month, 1);

/**
 * NEVER BEYOND THE MONTH WE ARE IN. A future month has no attendance to
 * read, and the backend clamps it away anyway - so the control is disabled
 * rather than offering a screen that can only come back empty.
 */
function canGoNext(month, now = new Date()) {
  return nextMonth(month) <= currentMonth(now);
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `2026-09` -> `Sep 2026`. */
function monthLabel(month) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(month || ""));
  if (!m) return String(month || "");
  const index = Number(m[2]) - 1;
  return index >= 0 && index < 12 ? `${MONTH_NAMES[index]} ${m[1]}` : String(month);
}

/**
 * THE `?date=` IN THE MINI APP URL IS A NAVIGATION HINT AND NOTHING MORE.
 *
 * It says which card the employee tapped a message about, so that card can be
 * preselected. It is NOT authority: the list of dates comes from the server
 * for the employee Telegram's signature resolved to, and a date that is not
 * in that list is simply not preselected. A date this returns is never sent
 * anywhere on its own.
 */
function navigationHint(search) {
  const raw = typeof search === "string" ? search : "";
  const match = /[?&]date=([^&]*)/.exec(raw);
  if (!match) return null;
  let value;
  try {
    value = decodeURIComponent(match[1]);
  } catch (err) {
    return null;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/**
 * The card the employee taps, from a server row.
 *
 * `can_submit` is the SERVER's answer, carried through rather than
 * recomputed. A screen that decided for itself which days were actionable
 * would offer a button the backend then refuses.
 */
function dateCard(row) {
  if (!row) return null;
  return {
    attendance_date: row.attendance_date,
    title: displayDate(row.attendance_date),
    weekday: weekday(row.attendance_date),
    label: row.state_label || "",
    state: row.state || DATE_STATE.NOT_ACTIONABLE,
    can_submit: !!row.can_submit,
  };
}

/** The colour scheme for a card's badge. One place, so the list is consistent. */
function stateColor(state) {
  if (state === DATE_STATE.ACTIONABLE) return "orange";
  if (state === DATE_STATE.PENDING) return "purple";
  if (state === DATE_STATE.APPROVED) return "green";
  if (state === DATE_STATE.REJECTED) return "red";
  return "gray";
}

/**
 * The body of a submission: EXACTLY three fields.
 *
 * The punch timestamp is built by `calendarDateFor` - the same function the
 * web Regularization form uses - and the backend re-checks the result against
 * the shift's cutoff and refuses the request if they disagree.
 *
 * Returns `{ error }` rather than throwing, because every caller is a screen.
 */
function buildSubmission(day, time, reason) {
  if (!day || !day.attendance_date) return { error: "This date could not be read. Please reopen." };
  if (!/^\d{2}:\d{2}$/.test(String(time || ""))) return { error: "Enter the missing punch time" };
  const trimmed = String(reason || "").trim();
  if (trimmed.length < 5) return { error: "Enter a reason of at least 5 characters" };
  return {
    body: {
      attendance_date: day.attendance_date,
      punch_time: `${calendarDateFor(day, time)} ${time}:00`,
      reason: trimmed,
    },
  };
}

module.exports = {
  DATE_STATE,
  stateColor,
  SECTION,
  explicitSection,
  DEFAULT_SECTION,
  SECTION_ORDER,
  SECTION_PARAM,
  sectionFromQuery,
  sectionIndex,
  sectionAtIndex,
  HELP_LINES,
  shiftMonth,
  previousMonth,
  nextMonth,
  canGoNext,
  monthLabel,
  navigationHint,
  dateCard,
  stateColor,
  buildSubmission,
  // Re-exported, never re-implemented - see the header.
  calendarDateFor,
  clock,
  displayDate,
  weekday,
  isOk,
  apiMessage,
  currentMonth,
};
