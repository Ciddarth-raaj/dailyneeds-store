import { useCallback, useEffect, useState } from "react";
import { getAllTickets, getTicketSummary } from "../helper/tickets";

/**
 * Loads a page of work items.
 *
 * `filters` must be memoised by the caller — it is the effect's dependency.
 * A request is skipped entirely while `enabled` is false, so a view that waits
 * on the logged-in employee id never fires a call with a missing filter.
 */
export function useTickets(filters, { enabled = true } = {}) {
  const [tickets, setTickets] = useState(null);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getAllTickets(filters);

      if (data && data.code) {
        throw new Error(data.msg || "Could not load items");
      }

      setTickets((data && data.tickets) || []);
      setCount((data && data.count) || 0);
    } catch (err) {
      setError(err);
      setTickets([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { tickets, count, loading, error, refetch: fetch };
}

/** Status, priority and overdue tallies for the counters above a list. */
export function useTicketSummary(filters, { enabled = true } = {}) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(enabled);

  const fetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getTicketSummary(filters);
      setSummary(data && data.code ? null : data);
    } catch (err) {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [filters, enabled]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { summary, loading, refetch: fetch };
}
