import { useCallback, useEffect, useState } from "react";
import stockTransferOut from "../helper/stockTransferOut";

/**
 * Hook to fetch stock transfers (list).
 * GET /stock-transfer-out
 * @param {Object} options
 * @param {boolean} [options.is_checked] - when true, only returns transfers where is_checked === true
 * @param {string} [options.from_date] - YYYY-MM-DD inclusive lower bound (document date)
 * @param {string} [options.to_date] - YYYY-MM-DD inclusive upper bound (document date)
 */
function useStockTransfer({ is_checked, from_date, to_date } = {}) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stockTransferOut.getStockTransfers({
        is_checked,
        from_date,
        to_date,
      });
      setTransfers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [is_checked, from_date, to_date]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { transfers, loading, error, refetch: fetch };
}

export default useStockTransfer;
