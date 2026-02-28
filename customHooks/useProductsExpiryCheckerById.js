import { useEffect, useState, useCallback } from "react";
import { getProductsExpiryCheckerById } from "../helper/productsExpiryChecker";

export function useProductsExpiryCheckerById(id, options = {}) {
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
      const result = await getProductsExpiryCheckerById(id);
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
    expiryChecker: data,
    loading,
    error,
    refetch: fetchOne,
  };
}
