import { useCallback, useEffect, useState } from "react";
import { getPurchaseRef } from "../helper/purchaseRef";

export function usePurchaseRef({ enabled = true } = {}) {
  const [rows, setRows] = useState([]);
  const [builtAt, setBuiltAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchRows = useCallback(
    async ({ force = false } = {}) => {
      if (!enabled) {
        setRows([]);
        setBuiltAt(null);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        // A forced rebuild replaces rows we already have, so keep them on
        // screen and show a lighter "refreshing" state instead of the spinner.
        if (force) setRefreshing(true);
        else setLoading(true);
        setError(null);
        const res = await getPurchaseRef({ force });
        setRows(Array.isArray(res?.data) ? res.data : []);
        setBuiltAt(res?.built_at ?? null);
      } catch (err) {
        setError(err);
        if (!force) setRows([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled]
  );

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return {
    rows,
    builtAt,
    loading,
    refreshing,
    error,
    refetch: fetchRows,
  };
}
