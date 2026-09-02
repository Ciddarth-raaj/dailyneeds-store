import { useCallback, useEffect, useState } from "react";
import offersV3 from "../helper/offersV3";

export function useGrnOutletStockBreakdown(
  productId,
  mrp,
  sellingPrice,
  { enabled = true } = {}
) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchItems = useCallback(async () => {
    if (!enabled || productId == null || productId === "" || mrp == null || sellingPrice == null) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await offersV3.getOutletStockBreakdown(productId, mrp, sellingPrice);
      const payload = res?.data;
      setRows(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [productId, mrp, sellingPrice, enabled]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    rows,
    loading,
    error,
    refetch: fetchItems,
  };
}
