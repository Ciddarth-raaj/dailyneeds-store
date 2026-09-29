import { useCallback, useEffect, useRef, useState } from "react";
import stockTransferOut from "../helper/stockTransferOut";

/**
 * Hook to fetch stock transfers (list).
 * One GET /stock-transfer-out for the whole range; the backend filters by
 * date in SQL, so there is no need to fetch day by day.
 * @param {Object} options
 * @param {boolean} [options.is_checked] - when true, only returns transfers where is_checked === true
 * @param {string} [options.from_date] - YYYY-MM-DD inclusive lower bound (document date)
 * @param {string} [options.to_date] - YYYY-MM-DD inclusive upper bound (document date)
 * @param {boolean} [options.enabled=true] - whether the query should run
 */
function useStockTransfer({
  is_checked,
  from_date,
  to_date,
  enabled = true,
} = {}) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const fetchGenerationRef = useRef(0);

  const fetch = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    try {
      setLoading(true);
      setError(null);
      const data = await stockTransferOut.getStockTransfers({
        is_checked,
        from_date,
        to_date,
      });
      if (fetchGenerationRef.current !== generation) return;
      setTransfers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (fetchGenerationRef.current !== generation) return;
      setError(err);
      setTransfers([]);
    } finally {
      if (fetchGenerationRef.current === generation) {
        setLoading(false);
      }
    }
  }, [is_checked, from_date, to_date]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetch();
    return () => {
      fetchGenerationRef.current += 1;
    };
  }, [enabled, fetch]);

  return {
    transfers,
    loading: enabled ? loading : false,
    error,
    // A single request has no per-day progress to report.
    fetchProgress: null,
    refetch: fetch,
  };
}

export default useStockTransfer;
