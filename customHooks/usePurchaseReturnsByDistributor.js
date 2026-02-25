import { useEffect, useState, useCallback } from "react";
import { getPurchaseReturnsByDistributor } from "../helper/purchaseReturn";

export function usePurchaseReturnsByDistributor(distributorId, purchaseAcknowledgementId, options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!distributorId || !enabled) {
      setData([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await getPurchaseReturnsByDistributor(distributorId, purchaseAcknowledgementId);
      setData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [distributorId, purchaseAcknowledgementId, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    purchaseReturns: data,
    loading,
    error,
    refetch,
  };
}
