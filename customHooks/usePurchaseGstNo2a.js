import { useCallback, useEffect, useState } from "react";
import { getAllPurchaseGstNo2a } from "../helper/purchaseGstNo2a";

/**
 * Purchases accepted as never appearing in GSTR-2A, for a dist-bill date window.
 */
export function usePurchaseGstNo2a(filters) {
  const [accepted, setAccepted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccepted = useCallback(
    async (noRefresh = false) => {
      const hasDateRange =
        filters?.dist_bill_from_date && filters?.dist_bill_to_date;

      if (!hasDateRange) {
        setAccepted([]);
        setLoading(false);
        setError(null);
        return;
      }

      try {
        if (!noRefresh) {
          setLoading(true);
          setAccepted([]);
        }
        setError(null);

        const data = await getAllPurchaseGstNo2a(filters);
        if (data.code === 200) {
          setAccepted(data.data ?? []);
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
    fetchAccepted();
  }, [fetchAccepted]);

  return {
    accepted,
    loading,
    error,
    refetch: fetchAccepted,
  };
}
