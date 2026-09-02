import { useCallback, useEffect, useState } from "react";
import { getAllAdvanceRequests } from "../helper/advanceRequest";

/**
 * Loads a page of advance requests.
 *
 * `filters` must be memoised by the caller — it is the effect's dependency.
 * An error response carries a `code`; a successful one does not, which is how
 * the rest of the app tells the two apart.
 */
function useAdvanceRequests(filters, { enabled = true } = {}) {
  const [requests, setRequests] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getAllAdvanceRequests(filters);

      if (data && data.code) {
        throw new Error(data.msg || "Could not load advance requests");
      }

      setRequests((data && data.items) || []);
      setCount((data && data.count) || 0);
    } catch (err) {
      setError(err);
      setRequests([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { requests, count, loading, error, refetch: fetchData };
}

export default useAdvanceRequests;
