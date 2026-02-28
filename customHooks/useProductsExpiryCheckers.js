import { useEffect, useState, useCallback } from "react";
import {
  getProductsExpiryCheckers,
  deleteProductsExpiryChecker as deleteExpiryCheckerApi,
} from "../helper/productsExpiryChecker";

export function useProductsExpiryCheckers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProductsExpiryCheckers();
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

  const deleteProductsExpiryChecker = useCallback(
    async (id) => {
      await deleteExpiryCheckerApi(id);
      await fetchList();
    },
    [fetchList]
  );

  return {
    expiryCheckers: data,
    loading,
    error,
    refetch: fetchList,
    deleteProductsExpiryChecker,
  };
}
