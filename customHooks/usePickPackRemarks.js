import { useEffect, useState, useCallback } from "react";
import {
  getPickPackRemarks,
  deletePickPackRemark as deletePickPackRemarkApi,
} from "../helper/pickPackRemarks";

export function usePickPackRemarks() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPickPackRemarks();
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

  const deleteRemark = useCallback(
    async (id) => {
      await deletePickPackRemarkApi(id);
      await fetchList();
    },
    [fetchList]
  );

  return {
    remarks: data,
    loading,
    error,
    refetch: fetchList,
    deleteRemark,
  };
}
