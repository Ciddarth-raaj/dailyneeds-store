import { useCallback, useEffect, useState } from "react";
import stockTransferOut from "../helper/stockTransferOut";

/**
 * Hook to fetch all stock transfers (list).
 * GET /stock-transfer-out
 * @param {Object} options
 * @param {boolean} [options.is_checked] - when true, only returns transfers where is_checked === true
 */
function useStockTransfer({ is_checked } = {}) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stockTransferOut.getStockTransfers({ is_checked });
      setTransfers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, [is_checked]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { transfers, loading, error, refetch: fetch };
}

export default useStockTransfer;
