import { useCallback, useEffect, useRef, useState } from "react";
import employeeTelegram from "../helper/employeeTelegram";
import { shouldPollGroups } from "../util/employeeTelegramGroups";

/** How often to re-ask while a join is actually in flight. */
const POLL_MS = 5000;

/**
 * The employee's required Telegram groups.
 *
 * ================================= WHY IT POLLS, AND WHY IT STOPS ==========
 *
 * A join is ASYNCHRONOUS and happens somewhere else: the employee taps the
 * link on their phone, Telegram delivers the request to our bot, and the bot
 * approves it. Nothing tells this screen - so while something is pending it
 * asks again, and the manager watching sees Join Pending become Joined
 * without refreshing.
 *
 * IT STOPS THE MOMENT NOTHING IS PENDING. Each poll costs the server two
 * Telegram calls per required group; polling a settled list would burn that
 * budget forever on a screen somebody left open.
 *
 * ONLY THE NEWEST RESPONSE IS ALLOWED TO WRITE. A slow request that resolves
 * after a newer one would otherwise put a stale list back on screen - the
 * same ownership guard `useEmployeeTelegram` uses for the identity panel,
 * for the same reason.
 */
export function useEmployeeTelegramGroups(employeeId, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const sequence = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!employeeId || !enabled) return null;
    const ticket = ++sequence.current;
    try {
      setLoading(true);
      const response = await employeeTelegram.getGroups(employeeId);
      // The gate, before ANY state write.
      if (!mounted.current || ticket !== sequence.current) return null;
      if (response && response.code === 200) {
        setData(response.data);
        setError(null);
        return response.data;
      }
      setError(new Error((response && response.msg) || "Could not load required groups"));
      return null;
    } catch (err) {
      if (!mounted.current || ticket !== sequence.current) return null;
      setError(err);
      return null;
    } finally {
      if (mounted.current && ticket === sequence.current) setLoading(false);
    }
  }, [employeeId, enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const polling = shouldPollGroups(data);
  useEffect(() => {
    if (!polling || !enabled) return undefined;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [polling, enabled, refresh]);

  return { data, loading, error, refresh, polling };
}

export default useEmployeeTelegramGroups;
