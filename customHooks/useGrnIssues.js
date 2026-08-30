import { useEffect, useState, useCallback } from "react";
import { getGrnIssues } from "../helper/grnList";

export function useGrnIssues({ from_date, to_date } = {}, { enabled = true } = {}) {
  const [items, setItems] = useState([]);
  const [itemsByProductId, setItemsByProductId] = useState(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIssues = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setItemsByProductId(new Map());
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await getGrnIssues({ from_date, to_date });
      const data = res?.data ?? {};
      setItems(Array.isArray(data.items) ? data.items : []);
      const byProduct = data.price_checker_items_by_product ?? {};
      setItemsByProductId(
        new Map(
          Object.keys(byProduct).map((key) => [Number(key), byProduct[key]])
        )
      );
    } catch (err) {
      setError(err);
      setItems([]);
      setItemsByProductId(new Map());
    } finally {
      setLoading(false);
    }
  }, [enabled, from_date, to_date]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return {
    items,
    itemsByProductId,
    loading,
    error,
    refetch: fetchIssues,
  };
}
