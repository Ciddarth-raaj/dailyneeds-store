/**
 * WHICH STATUS RESPONSE IS ALLOWED TO UPDATE THE SCREEN.
 *
 * ================================ THE TWO RACES ===========================
 *
 * The Telegram panel refreshes its status on a 3-second poll, on mount, and
 * immediately after generating a QR. Requests therefore overlap, and HTTP does
 * not promise to answer them in the order they were asked. Two different
 * things can go wrong, and only one of them is about QR generations:
 *
 *   ACROSS GENERATIONS - the dangerous one. A refresh started BEFORE the user
 *   pressed Change Telegram answers AFTERWARDS, carrying the previous
 *   attempt's `VERIFIED`. Accepting it would settle - and so silently close -
 *   the QR the employee is at that moment being asked to scan.
 *
 *   WITHIN ONE GENERATION - two polls in flight because one request took
 *   longer than the interval. The slower, older one answers last with
 *   `AWAITING_CONTACT` after the newer already reported `VERIFIED`, and the
 *   screen walks backwards.
 *
 * ============================== HOW IT IS DECIDED =========================
 *
 * Every request takes a TICKET before it is sent, carrying the generation it
 * belongs to and a number that only ever increases. When it answers, the
 * ticket is offered back:
 *
 *   a ticket from an older generation      REFUSED - it describes a QR that
 *                                          has been replaced
 *   a ticket older than one already taken  REFUSED - a newer answer for this
 *                                          same QR has already landed
 *   anything else                          ACCEPTED, and it becomes the
 *                                          newest answer taken
 *
 * A REFUSED RESPONSE IS DISCARDED WHOLE. Not partially applied, not "just the
 * error", not "just the loading flag": a response that is not allowed to say
 * what the status is, is not allowed to say anything.
 *
 * ================================ WHY IT IS HERE ==========================
 *
 * This repository has no React test runner, so logic inside a hook is logic
 * that cannot be tested - and a race is exactly the kind of thing that must be
 * tested by actually resolving promises out of order rather than by reading
 * the source. So the rule lives here, framework-free, and
 * `util/telegramRequestOwnership.test.js` drives it through the real
 * sequences. The hook holds one of these and asks it; it decides nothing
 * itself.
 */

function createRequestOwnership() {
  /** Which QR is on screen. Incremented every time a new link is generated. */
  let generation = 0;
  /** Only ever increases, so a ticket number IS the order requests were made. */
  let lastIssued = 0;
  /** The newest ticket whose answer was allowed to update the screen. */
  let lastAccepted = 0;

  return {
    currentGeneration: () => generation,

    /**
     * A new QR exists. Every request already in flight now describes the
     * previous one.
     */
    newGeneration() {
      generation += 1;
      return generation;
    },

    /** Take a ticket. Called immediately before a request is sent. */
    begin() {
      lastIssued += 1;
      return { generation, requestId: lastIssued };
    },

    /**
     * May this response update the screen? Accepting also records it as the
     * newest answer taken, so a slower, older request cannot overwrite it.
     */
    accept(ticket) {
      if (!ticket) return false;
      if (ticket.generation !== generation) return false;
      if (ticket.requestId <= lastAccepted) return false;
      lastAccepted = ticket.requestId;
      return true;
    },

    /**
     * Is this the most recently STARTED request?
     *
     * Only for the loading flag: an older request finishing while a newer one
     * is still running must not report that the screen has stopped loading.
     * Deliberately not `accept` - a refused response still stops being in
     * flight, it simply may not say anything about the state.
     */
    isNewest(ticket) {
      return Boolean(ticket) && ticket.requestId === lastIssued;
    },
  };
}

module.exports = { createRequestOwnership };
