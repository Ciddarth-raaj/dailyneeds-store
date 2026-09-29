import { useCallback, useEffect, useRef, useState } from "react";
import stockTransferOut from "../helper/stockTransferOut";

/**
 * Per-day STO counts for one month, for the calendar only.
 * GET /stock-transfer-out/calendar?year=&month=
 * @param {{ year: number, month: number }} options month is 1-12
 * @returns {{ days: Object<string, { total: number, checked: number, unchecked: number }>, loading: boolean, error: any, refetch: Function }}
 *   `days` is keyed by YYYY-MM-DD; days without STOs are absent.
 */
function useStockTransferCalendar({ year, month }) {
  const [days, setDays] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchGenerationRef = useRef(0);

  const fetch = useCallback(async () => {
    const generation = ++fetchGenerationRef.current;
    try {
      setLoading(true);
      setError(null);
      const rows = await stockTransferOut.getStockTransferCalendar({
        year,
        month,
      });
      if (fetchGenerationRef.current !== generation) return;
      const byDate = {};
      (Array.isArray(rows) ? rows : []).forEach((r) => {
        byDate[r.date] = r;
      });
      setDays(byDate);
    } catch (err) {
      if (fetchGenerationRef.current !== generation) return;
      setError(err);
      setDays({});
    } finally {
      if (fetchGenerationRef.current === generation) {
        setLoading(false);
      }
    }
  }, [year, month]);

  useEffect(() => {
    fetch();
    return () => {
      fetchGenerationRef.current += 1;
    };
  }, [fetch]);

  return { days, loading, error, refetch: fetch };
}

export default useStockTransferCalendar;
