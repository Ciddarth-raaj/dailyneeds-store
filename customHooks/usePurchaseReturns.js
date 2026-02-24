import { useEffect, useState, useCallback } from "react";
import { getPurchaseReturns } from "../helper/purchaseReturn";

export function usePurchaseReturns() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPurchaseReturns();
      setData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return {
    purchaseReturns: data,
    loading,
    error,
    refetch: fetchList,
  };
}
