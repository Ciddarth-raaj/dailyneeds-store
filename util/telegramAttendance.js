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

const { calendarDateFor, clock, displayDate, weekday, isOk, apiMessage } = require("./attendanceV2");

/** The states the server's date list uses. Mirrors `DATE_STATE` on the API. */
const DATE_STATE = Object.freeze({
  ACTIONABLE: "ACTIONABLE",
  PENDING: "PENDING",
  NOT_ACTIONABLE: "NOT_ACTIONABLE",
});

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
};
