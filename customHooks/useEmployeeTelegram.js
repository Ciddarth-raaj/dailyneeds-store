import { useCallback, useEffect, useRef, useState } from "react";

import EmployeeTelegramHelper from "../helper/employeeTelegram";
import { createRequestOwnership } from "../util/telegramRequestOwnership";
import {
  TELEGRAM_POLL_INTERVAL_MS,
  attemptSettled,
  isLinkExpired,
  shouldPollTelegram,
} from "../util/employeeTelegram";

/**
 * One employee's Telegram setup: the status, the one-time link, and the
 * polling that notices the employee finishing on their own phone.
 *
 * SHARED BY THE WIZARD AND THE PROFILE, deliberately. Add Employee and
 * Employee Master offer the same actions, and two implementations of a
 * one-time credential's lifetime is exactly the sort of duplication where one
 * copy quietly keeps the link a little too long.
 *
 * ============================== THE LINK NEVER LEAVES MEMORY ==============
 *
 * `link` lives in React state and NOWHERE else. Not localStorage, not
 * sessionStorage, not a cookie, not a global store, never logged, never put
 * in a toast, never sent anywhere. Generating a new one replaces it; expiry
 * and a settled attempt clear it; unmounting drops it with the component.
 * That is the whole storage policy, and there is no code here that could
 * break it because there is no other place the value is written.
 *
 * ================== WHICH ATTEMPT A STATUS IS TALKING ABOUT ==============
 *
 * THIS IS THE SUBTLE PART, and it is the bug that made it necessary.
 *
 * The status on screen is whatever the last refresh returned. When somebody
 * presses Change Telegram on an employee whose LAST attempt ended in
 * `VERIFIED` - which is exactly what a currently connected employee's last
 * attempt was - the new QR appears beside a status that still says VERIFIED.
 * A rule that closed the QR on a settled attempt would therefore close the
 * brand-new one instantly, before the employee had even picked up their phone.
 *
 * So every generation is counted, and a status is only allowed to SETTLE the
 * QR in front of the user once it came back from a request made AFTER that
 * generation. Anything older describes the previous attempt and is ignored
 * for that purpose. While the answer is still outstanding the screen keeps
 * polling and keeps showing the QR, which is the safe direction: the worst
 * case is one extra poll, and the alternative is a dead QR a manager cannot
 * explain.
 *
 * AND A RESPONSE IS CHECKED BEFORE IT IS APPLIED, NOT AFTER. Every request
 * takes a ticket before it is sent and offers it back when it answers;
 * `util/telegramRequestOwnership.js` refuses a ticket from a replaced
 * generation, or one older than an answer already taken, and a refused
 * response is discarded WHOLE - no status, no error, no loading change.
 * Applying part of a stale answer is how the previous attempt's VERIFIED
 * could still reach the screen after a newer poll had already landed.
 *
 * The ownership is a REF and not state on purpose: it is read inside async
 * callbacks that must see the value at the moment they resolve, not the value
 * their closure captured.
 *
 * ============================== POLLING STOPS ============================
 *
 * `shouldPollTelegram` decides - a settled attempt and no live QR are
 * terminal - and the interval belongs to an effect that clears it, so
 * navigating away or unmounting ends it. There is no global poller, nothing
 * polls the employee list, and a screen reopened later simply asks once and
 * renders the backend's answer.
 */
export default function useEmployeeTelegram(employeeId, { enabled = true } = {}) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  /** The one-time link. Memory only - see the note above. */
  const [link, setLink] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [expired, setExpired] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  /**
   * Whether the status now held describes the CURRENT QR. False from the
   * moment a new link is generated until a refresh issued after it returns.
   */
  const [statusIsCurrent, setStatusIsCurrent] = useState(true);

  /** So a request that resolves after unmount cannot set state on a dead component. */
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  /** Who owns the answer to each request. See the note above. */
  const ownershipRef = useRef(null);
  if (ownershipRef.current === null) ownershipRef.current = createRequestOwnership();

  const refresh = useCallback(async () => {
    if (!employeeId || !enabled) return null;
    // Taken BEFORE the request is sent, so the answer can be placed in time
    // when it eventually arrives.
    const ownership = ownershipRef.current;
    const ticket = ownership.begin();
    setLoading(true);

    /** Nothing a refused response may touch. Not state, not loading, nothing. */
    const stopLoadingIfNewest = () => {
      if (alive.current && ownership.isNewest(ticket)) setLoading(false);
    };

    try {
      const res = await EmployeeTelegramHelper.getStatus(employeeId);
      if (!alive.current) return null;
      // THE ONE GATE. Everything below it belongs to the current QR and is
      // newer than anything already accepted for it.
      if (!ownership.accept(ticket)) return null;

      if (res && res.code && res.code !== 200) {
        setError(res.msg || "Could not read the Telegram status.");
        return null;
      }
      const data = (res && res.data) || null;
      setStatus(data);
      setStatusIsCurrent(true);
      setError(null);
      return data;
    } catch (err) {
      if (!alive.current) return null;
      // A STALE FAILURE IS STILL STALE. An older request that throws must not
      // replace an error - or a success - that a newer one already produced.
      if (!ownership.accept(ticket)) return null;
      setError("Could not reach the server.");
      return null;
    } finally {
      stopLoadingIfNewest();
    }
  }, [employeeId, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Generate a fresh QR. The previous one dies SERVER-SIDE; nothing to do here. */
  const generate = useCallback(async () => {
    if (!employeeId) return null;
    setGenerating(true);
    setError(null);
    try {
      const res = await EmployeeTelegramHelper.generateLink(employeeId);
      if (!alive.current) return null;
      if (!res || (res.code && res.code !== 200) || !res.link) {
        // The server's own sentence where there is one - it names the fix for
        // an employee with no valid mobile, or one who is no longer employed.
        setError((res && res.msg) || "The Telegram link could not be generated.");
        return null;
      }
      // A NEW ATTEMPT BEGINS HERE. Everything already on screen - and every
      // request still in flight - describes the previous one, including a
      // VERIFIED that belongs to the connection this QR is about to replace.
      ownershipRef.current.newGeneration();
      setStatusIsCurrent(false);
      setLink(res.link);
      setExpiresAt(res.expires_at || null);
      setExpired(false);
      // Ask again, for THIS generation, so the screen stops relying on the
      // previous attempt's answer as soon as possible.
      refresh();
      return res;
    } catch (err) {
      if (alive.current) setError("Could not reach the server.");
      return null;
    } finally {
      if (alive.current) setGenerating(false);
    }
  }, [employeeId, refresh]);

  /** ONLY the explicit action calls this. Reconnecting does not - see the helper. */
  const disconnect = useCallback(async () => {
    if (!employeeId) return null;
    setDisconnecting(true);
    setError(null);
    try {
      const res = await EmployeeTelegramHelper.disconnect(employeeId);
      if (!alive.current) return null;
      if (res && res.code && res.code !== 200) {
        setError(res.msg || "Telegram could not be disconnected.");
        return null;
      }
      setLink(null);
      setExpiresAt(null);
      setExpired(false);
      await refresh();
      return res;
    } catch (err) {
      if (alive.current) setError("Could not reach the server.");
      return null;
    } finally {
      if (alive.current) setDisconnecting(false);
    }
  }, [employeeId, refresh]);

  /* ------------------------------------------------------------------------
   * EVERY DERIVED VALUE IS DECLARED BEFORE THE EFFECTS THAT READ IT.
   *
   * Not a style preference: an effect's dependency array is evaluated during
   * render, so an effect placed above one of these would throw a
   * ReferenceError before the component could mount. The one below cost a
   * runtime crash on the employee profile.
   * --------------------------------------------------------------------- */

  /** What the CURRENT attempt is doing, as the backend reported it. */
  const attempt = (status && status.link_attempt) || null;
  /** A QR that exists and has not run out of time. */
  const hasLiveLink = Boolean(link) && !expired;
  /**
   * A settled answer only counts when it describes THIS QR - see the note at
   * the top of this file. This is the whole stale-status protection.
   */
  const settled = statusIsCurrent && attemptSettled(attempt);
  /**
   * THE ATTEMPT DECIDES WHETHER TO KEEP WATCHING, NOT THE IDENTITY. During a
   * reconnect the employee stays CONNECTED on their old account, so watching
   * the status alone would stop the poll the moment the QR appeared.
   */
  const polling =
    enabled &&
    shouldPollTelegram({
      status: status && status.status,
      attempt,
      hasLiveLink,
      attemptIsCurrent: statusIsCurrent,
    });

  /**
   * The countdown, and the moment the QR stops being usable.
   *
   * THE LINK IS DROPPED FROM STATE ON EXPIRY, not merely hidden: an expired
   * credential has no reason to still be in the page.
   */
  useEffect(() => {
    if (!expiresAt || expired) return undefined;
    const tick = () => {
      if (!alive.current) return;
      if (isLinkExpired(expiresAt)) {
        setExpired(true);
        setLink(null);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, expired]);

  /**
   * A SETTLED ATTEMPT CLOSES THE QR - verified, mismatched or failed, the code
   * in front of the employee has been dealt with and cannot be used again.
   *
   * `settled` already requires the answer to belong to this generation, so a
   * stale VERIFIED from the connection being replaced cannot reach here.
   */
  useEffect(() => {
    if (!link || !settled) return;
    setLink(null);
    setExpiresAt(null);
  }, [link, settled]);

  /** The poll itself. Its whole lifetime is this effect's. */
  useEffect(() => {
    if (!polling) return undefined;
    const timer = setInterval(() => {
      refresh();
    }, TELEGRAM_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [polling, refresh]);

  return {
    status,
    loading,
    error,
    link,
    attempt,
    /** False while the status on screen still describes the previous attempt. */
    statusIsCurrent,
    expiresAt,
    expired,
    generating,
    disconnecting,
    polling,
    refresh,
    generate,
    disconnect,
  };
}
