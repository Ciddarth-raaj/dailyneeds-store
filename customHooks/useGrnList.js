import { useEffect, useState, useCallback } from "react";
import { getGrnList } from "../helper/grnList";

export function useGrnList({ from_date, to_date } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getGrnList({ from_date, to_date });
      setData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [from_date, to_date]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return {
    grnList: data,
    loading,
    error,
    refetch: fetchList,
  };
}
