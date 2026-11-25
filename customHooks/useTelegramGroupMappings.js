import { useCallback, useEffect, useState } from "react";
import {
  getTelegramGroupMappings,
  getTelegramGroupMatchedEmployees,
} from "../helper/telegramGroups";

/**
 * One group's mapping configuration, for the Map screen.
 *
 * Shaped like `useTelegramGroupById`: `{ enabled: false }` keeps it from
 * asking for an id the router has not produced yet, which on a Next.js page
 * is the first render of every direct navigation.
 *
 * EVERY COUNT IN `data` CAME FROM ONE SERVER SNAPSHOT, so the rows and the
 * total cannot disagree. Refetching after a write replaces the whole object
 * rather than patching a row, for the same reason: a locally adjusted count
 * would be this screen's arithmetic rather than the server's answer, and the
 * two would drift the moment somebody transferred branch.
 */
export function useTelegramGroupMappings(id, options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMappings = useCallback(async () => {
    if (!id || !enabled) {
      setLoading(false);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await getTelegramGroupMappings(id);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  return { data, loading, error, refetch: fetchMappings };
}

/**
 * The matched employees, fetched on demand when View Employees is opened.
 *
 * NOT LOADED WITH THE PAGE. The mapping list needs only counts, and counts
 * name nobody; the employee list is the one response that carries names, so
 * it is fetched when somebody actually asks to see it.
 *
 * `mappingId` of null means the deduplicated union of every rule.
 *
 * THE RESPONSE IS REPLACED WHOLESALE, never merged. `total_matched` is
 * company-wide and `employees` is branch-scoped; keeping a stale list beside
 * a fresh total is exactly the mismatch that would make somebody believe a
 * rule matches people it does not.
 */
export function useTelegramGroupMatchedEmployees(id) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (mappingId = null) => {
      if (!id) return null;
      try {
        setLoading(true);
        setError(null);
        setResult(null);
        const data = await getTelegramGroupMatchedEmployees(id, mappingId);
        setResult(data);
        return data;
      } catch (err) {
        setError(err);
        setResult(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, loading, error, load, reset };
}
