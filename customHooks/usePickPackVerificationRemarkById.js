import { useEffect, useState, useCallback } from "react";
import {
  getPickPackVerificationRemarkById,
  updatePickPackVerificationRemark as updatePickPackVerificationRemarkApi,
} from "../helper/pickPackVerificationRemarks";

/**
 * @param {string|number} id - Remark ID
 * @param {Object} options - { enabled: boolean }
 */
export function usePickPackVerificationRemarkById(id, options = {}) {
  const { enabled = true } = options;
  const [remark, setRemark] = useState(null);
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
      const data = await getPickPackVerificationRemarkById(id);
      setRemark(data);
      return data;
    } catch (err) {
      setError(err);
      setRemark(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  const updateRemark = useCallback(
    async (body) => {
      const res = await updatePickPackVerificationRemarkApi(id, body);
      await fetchOne();
      return res;
    },
    [id, fetchOne]
  );

  return {
    remark,
    loading,
    error,
    refetch: fetchOne,
    updateRemark,
  };
}
