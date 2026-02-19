import { useEffect, useState, useCallback } from "react";
import {
  getJobWorksheetWithItems,
  getJobWorksheetById,
  updateJobWorksheet as updateJobWorksheetApi,
} from "../helper/jobWorksheet";

/**
 * @param {string|number} id - Job worksheet ID
 * @param {Object} options - { enabled: boolean, withItems: boolean }
 */
export function useJobWorksheetById(id, options = {}) {
  const { enabled = true, withItems = true } = options;
  const [worksheet, setWorksheet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOne = useCallback(async () => {
    if (!id || !enabled) {
      setLoading(false);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const data = withItems
        ? await getJobWorksheetWithItems(id)
        : await getJobWorksheetById(id);
      setWorksheet(data);
      return data;
    } catch (err) {
      setError(err);
      setWorksheet(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, enabled, withItems]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  const updateJobWorksheet = useCallback(
    async (body) => {
      const res = await updateJobWorksheetApi(id, body);
      await fetchOne();
      return res;
    },
    [id, fetchOne]
  );

  return {
    worksheet,
    loading,
    error,
    refetch: fetchOne,
    updateJobWorksheet,
  };
}
