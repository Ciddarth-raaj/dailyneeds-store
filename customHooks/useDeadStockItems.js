import { useCallback, useEffect, useState } from "react";
import deadStockItems from "../helper/deadStockItems";

/**
 * Fetches pivoted dead-stock rows from GET /dead-stock-items.
 */
export function useDeadStockItems(options = {}) {
  const { enabled = true } = options;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await deadStockItems.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    loading,
    error,
    refetch: fetchItems,
  };
}
