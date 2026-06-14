import { useCallback, useEffect, useRef, useState } from "react";
import moment from "moment";
import stockTransferOut from "../helper/stockTransferOut";

function getDaysInRange(from_date, to_date) {
  if (!from_date || !to_date) return [];
  const days = [];
  const current = moment(from_date, "YYYY-MM-DD");
  const end = moment(to_date, "YYYY-MM-DD");
  if (!current.isValid() || !end.isValid() || current.isAfter(end)) return [];
  while (current.isSameOrBefore(end, "day")) {
    days.push(current.format("YYYY-MM-DD"));
    current.add(1, "day");
  }
  return days;
}

/**
 * Hook to fetch stock transfers (list).
 * When from_date and to_date are set, fetches one day at a time via GET /stock-transfer-out.
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
  const [fetchProgress, setFetchProgress] = useState(null);
  const fetchGenerationRef = useRef(0);

  const fetch = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    const days = getDaysInRange(from_date, to_date);

    try {
      setLoading(true);
      setError(null);

      if (days.length === 0) {
        const data = await stockTransferOut.getStockTransfers({ is_checked });
        if (fetchGenerationRef.current !== generation) return;
        setTransfers(Array.isArray(data) ? data : []);
        setFetchProgress(null);
        return;
      }

      setFetchProgress({ loaded: 0, total: days.length });
      const merged = [];

      for (let i = 0; i < days.length; i++) {
        if (fetchGenerationRef.current !== generation) return;

        const day = days[i];
        const data = await stockTransferOut.getStockTransfers({
          is_checked,
          from_date: day,
          to_date: day,
        });

        if (fetchGenerationRef.current !== generation) return;

        if (Array.isArray(data) && data.length > 0) {
          merged.push(...data);
        }

        setTransfers([...merged]);
        setFetchProgress({ loaded: i + 1, total: days.length });
      }
    } catch (err) {
      if (fetchGenerationRef.current !== generation) return;
      setError(err);
      setTransfers([]);
      setFetchProgress(null);
    } finally {
      if (fetchGenerationRef.current === generation) {
        setLoading(false);
      }
    }
  }, [is_checked, from_date, to_date]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setFetchProgress(null);
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
    fetchProgress: enabled ? fetchProgress : null,
    refetch: fetch,
  };
}

export default useStockTransfer;
