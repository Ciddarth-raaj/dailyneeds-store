import { useCallback, useEffect, useState } from "react";
import stockReceived from "../helper/stockReceived";

/**
 * All Gofrugal MRC detail lines with optional stock_received row.
 * GET /stock-received/gofrugal-dtl?pending_only=false
 */
function useStockReceivedGofrugal() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await stockReceived.listGofrugalDtl(false);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return { rows, setRows, loading, error, refetch: fetchRows };
}

export default useStockReceivedGofrugal;
