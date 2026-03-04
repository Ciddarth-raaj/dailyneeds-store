import { useEffect, useState, useCallback } from "react";
import productsChanges from "../helper/productsChanges";

/**
 * Hook to fetch product changes list with optional filters
 * @param {Object} options - Query options
 * @param {string} options.product_id - Filter by product id
 * @param {boolean} options.is_approved - Filter by approval status
 * @param {number} options.limit - Max rows (default 100)
 * @param {number} options.offset - Pagination offset (default 0)
 * @param {boolean} options.enabled - Whether to fetch (default true)
 */
export function useProductsChanges(options = {}) {
  const {
    product_id = null,
    is_approved = null,
    limit = 100,
    offset = 0,
    enabled = true,
  } = options;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await productsChanges.list({
        product_id: product_id || undefined,
        is_approved: is_approved ?? undefined,
        limit,
        offset,
      });
      setData(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, product_id, is_approved, limit, offset]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const approve = useCallback(async (productsChangeId, isApproved) => {
    const updated = await productsChanges.approve(productsChangeId, isApproved);
    setData((prev) =>
      prev.map((row) =>
        row.products_change_id === productsChangeId ? updated : row
      )
    );
    return updated;
  }, []);

  return { data, loading, error, refetch, approve };
}
