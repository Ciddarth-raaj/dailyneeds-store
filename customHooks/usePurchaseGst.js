import { useCallback, useEffect, useState } from "react";
import { getAllPurchaseGst, getPurchaseGstById } from "../helper/purchaseGst";

export function usePurchaseGst(filters) {
  const [purchaseGst, setPurchaseGst] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPurchaseGst = useCallback(async (noRefresh = false) => {
    try {
      if (!noRefresh) {
        setLoading(true);
        setPurchaseGst([]);
      }

      const data = await getAllPurchaseGst(filters);
      if (data.code === 200) {
        setPurchaseGst(data.data ?? []);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchPurchaseGst();
  }, [fetchPurchaseGst]);

  const fetchPurchaseGstById = useCallback(async (id) => {
    const data = await getPurchaseGstById(id);
    if (data.code === 200) {
      return data.data;
    }
    throw new Error(data?.msg || "Failed to load purchase");
  }, []);

  return {
    purchaseGst,
    loading,
    error,
    refetch: fetchPurchaseGst,
    fetchPurchaseGstById,
  };
}
