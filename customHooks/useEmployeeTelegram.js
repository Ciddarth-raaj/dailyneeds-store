import { useCallback, useEffect, useRef, useState } from "react";

import EmployeeTelegramHelper from "../helper/employeeTelegram";
import {
  TELEGRAM_POLL_INTERVAL_MS,
  attemptMismatched,
  attemptVerified,
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
 * in a toast, never sent anywhere. Generating a new one replaces it;
 * expiry clears it; unmounting drops it with the component. That is the whole
 * storage policy and there is no code here that could break it, because there
 * is no other place the value is written.
 *
 * ============================== POLLING STOPS ============================
 *
 * `shouldPollTelegram` decides - CONNECTED and MOBILE_MISMATCH are terminal,
 * and no live QR means nothing is in flight. On top of that the interval is
 * cleared when the component unmounts, so navigating away ends it. There is
 * no global poller, nothing polls the employee list, and a screen reopened
 * later simply asks once and renders the backend's answer.
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

  /** So a request that resolves after unmount cannot set state on a dead component. */
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!employeeId || !enabled) return null;
    setLoading(true);
    try {
      const res = await EmployeeTelegramHelper.getStatus(employeeId);
      if (!alive.current) return null;
      if (res && res.code && res.code !== 200) {
        setError(res.msg || "Could not read the Telegram status.");
        return null;
      }
      const data = (res && res.data) || null;
      setStatus(data);
      setError(null);
      return data;
    } catch (err) {
      if (alive.current) setError("Could not reach the server.");
      return null;
    } finally {
      if (alive.current) setLoading(false);
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
      setLink(res.link);
      setExpiresAt(res.expires_at || null);
      setExpired(false);
      // Re-read so a screen opened on a stale status moves to Waiting at once.
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
   * A SETTLED ATTEMPT CLOSES THE QR. Verified or mismatched, the code in front
   * of the employee has been dealt with and cannot be used again, so it is
   * dropped from state exactly as an expired one is - and the panel falls back
   * to showing the connection it produced, or the mismatch it hit.
   */
  useEffect(() => {
    if (!link) return;
    if (attemptVerified(attempt) || attemptMismatched(attempt)) {
      setLink(null);
      setExpiresAt(null);
    }
  }, [attempt, link]);

  /** The poll itself. Its whole lifetime is this effect's. */
  const hasLiveLink = Boolean(link) && !expired;
  /**
   * THE ATTEMPT, NOT THE IDENTITY, DECIDES WHETHER TO KEEP WATCHING. During a
   * reconnect the employee stays CONNECTED on their old account, so watching
   * `status` alone would stop the poll the moment the QR appeared.
   */
  const attempt = (status && status.link_attempt) || null;
  const polling = enabled && shouldPollTelegram({ status: status && status.status, attempt, hasLiveLink });
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
