import { useCallback, useEffect, useState } from "react";
import { getAllPurchaseGstMatches } from "../helper/purchaseGstMatch";

export function usePurchaseGstMatch(filters) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMatches = useCallback(
    async (noRefresh = false) => {
      const hasReturnPeriod =
        filters?.year != null && filters?.month != null;
      const hasDateRange = filters?.from_date && filters?.to_date;

      if (!hasReturnPeriod && !hasDateRange) {
        setMatches([]);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        if (!noRefresh) {
          setLoading(true);
          setMatches([]);
        }
        setError(null);

        const data = await getAllPurchaseGstMatches(filters);
        if (data.code === 200) {
          setMatches(data.data ?? []);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
  };
}
