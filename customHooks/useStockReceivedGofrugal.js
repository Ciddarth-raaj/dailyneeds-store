import { useCallback, useEffect, useState } from "react";
import stockReceived from "../helper/stockReceived";

/**
 * All Gofrugal MRC detail lines with optional stock_received row.
 * GET /stock-received/gofrugal-dtl?pending_only=false&days_buffer=
 *
 * @param {{ daysBuffer?: number }} [options]
 */
function useStockReceivedGofrugal({ daysBuffer = 0 } = {}) {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, meta: m } = await stockReceived.listGofrugalDtl(
        false,
        daysBuffer
      );
      setRows(Array.isArray(data) ? data : []);
      setMeta(m && typeof m === "object" ? m : {});
    } catch (err) {
      setError(err);
      setRows([]);
      setMeta({});
    } finally {
      setLoading(false);
    }
  }, [daysBuffer]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return { rows, setRows, loading, error, meta, refetch: fetchRows };
}

export default useStockReceivedGofrugal;
