import { useCallback, useEffect, useState } from "react";
import { getPurchaseRef } from "../helper/purchaseRef";

export function usePurchaseRef({ enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRows = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getPurchaseRef();
      setRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return {
    rows,
    loading,
    error,
    refetch: fetchRows,
  };
}
