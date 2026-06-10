import { useCallback, useEffect, useState } from "react";
import priceChecker from "../helper/priceChecker";

export function usePriceChecker(options = {}) {
  const { enabled = true } = options;
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await priceChecker.list();
      setProducts(Array.isArray(result.data) ? result.data : []);
      setMeta(result.meta ?? null);
    } catch (err) {
      setError(err);
      setProducts([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    products,
    meta,
    loading,
    error,
    refetch: fetchData,
  };
}
