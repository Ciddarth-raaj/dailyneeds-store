import { useEffect, useState, useCallback } from "react";
import {
  getJobWorksheets,
  deleteJobWorksheet as deleteJobWorksheetApi,
} from "../helper/jobWorksheet";

/**
 * @param {Object} filters - { grn_no, supplier_id, date_from, date_to, limit, offset }
 */
export function useJobWorksheets(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getJobWorksheets(filters);
      setData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [
    filters.grn_no,
    filters.supplier_id,
    filters.date_from,
    filters.date_to,
    filters.limit,
    filters.offset,
  ]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const deleteJobWorksheet = useCallback(async (id) => {
    const res = await deleteJobWorksheetApi(id);
    await fetchList();
    return res;
  }, [fetchList]);

  return {
    jobWorksheets: data,
    loading,
    error,
    refetch: fetchList,
    deleteJobWorksheet,
  };
}
