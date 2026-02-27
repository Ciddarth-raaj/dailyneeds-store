import { useEffect, useState, useCallback } from "react";
import { getStockCheckerById } from "../helper/stockChecker";

export function useStockCheckerById(id, options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOne = useCallback(async () => {
    if (!id || !enabled) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await getStockCheckerById(id);
      setData(result ?? null);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  return {
    stockChecker: data,
    loading,
    error,
    refetch: fetchOne,
  };
}
