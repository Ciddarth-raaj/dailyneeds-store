import { useEffect, useState, useCallback } from "react";
import {
  getStockCheckers,
  deleteStockChecker as deleteStockCheckerApi,
} from "../helper/stockChecker";

export function useStockCheckers() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getStockCheckers();
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

  const deleteStockChecker = useCallback(
    async (id) => {
      await deleteStockCheckerApi(id);
      await fetchList();
    },
    [fetchList]
  );

  return {
    stockCheckers: data,
    loading,
    error,
    refetch: fetchList,
    deleteStockChecker,
  };
}
