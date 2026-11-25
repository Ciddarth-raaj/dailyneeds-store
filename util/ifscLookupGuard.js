/**
 * The identity of an in-flight IFSC lookup.
 *
 * Three questions, and getting any of them wrong shows up as a wrong bank
 * name beside a right branch code:
 *
 *   Should this lookup happen at all?     `begin`
 *   Is this reply still wanted?           `isCurrent`
 *   Has the field moved on?               `invalidate`
 *
 * ============================================ WHY IT IS NOT JUST A SEQUENCE ==
 *
 * A sequence number alone protects a NEWER LOOKUP from an older one: whoever
 * started last wins. It does not protect an EDITED FIELD from a lookup begun
 * before the edit, because between the edit and the next lookup there is no
 * newer sequence to compare against - so a reply for the code the user just
 * deleted can still arrive and fill the form in.
 *
 * Editing therefore has to be an event in its own right. `invalidate` is that
 * event: it advances the sequence with no lookup attached, so every reply
 * already in flight is orphaned the moment the field changes.
 *
 * ================================================= AND WHY IT FORGETS ========
 *
 * `lastCode` stops the debounce and the blur both asking for the code on
 * screen. That is all it is for - so an edit must clear it too. Keeping it
 * across an edit meant that retyping a code which had just resolved was
 * treated as a duplicate for ever: the lookup refused to run, the bank name
 * never came back, and saving could only ever say "still checking".
 *
 * This lives outside the component because it is the part worth testing on
 * its own, and there is no React test runner in this repo.
 */
function createLookupGuard() {
  let seq = 0;
  let lastCode = null;

  return {
    /**
     * Claim a lookup for `code`.
     * @returns {number|null} a ticket, or null if this code is already the
     *   one asked about - in which case no request should be made.
     */
    begin(code) {
      if (lastCode === code) return null;
      lastCode = code;
      seq += 1;
      return seq;
    },

    /** Whether a reply holding this ticket is still the one being waited for. */
    isCurrent(ticket) {
      return ticket === seq;
    },

    /**
     * The field changed. Orphan every reply in flight and allow the next
     * code - including one just asked about - to be looked up again.
     */
    invalidate() {
      seq += 1;
      lastCode = null;
    },

    /**
     * Allow this code to be asked about again without orphaning anything.
     * Used when a lookup failed for a reason that says nothing about the
     * code, so a retry is worth having.
     */
    forget() {
      lastCode = null;
    },

    /** For tests and assertions only. */
    _state() {
      return { seq, lastCode };
    },
  };
}

module.exports = { createLookupGuard };
