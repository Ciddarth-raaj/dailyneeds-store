import { useEffect, useState, useCallback } from "react";
import {
  getPurchaseReturnById,
  createPurchaseReturnExtra,
  updatePurchaseReturnExtra,
} from "../helper/purchaseReturn";

/**
 * @param {string} mprh_pr_no - Purchase return number
 * @param {Object} options - { enabled: boolean }
 */
export function usePurchaseReturnById(mprh_pr_no, options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOne = useCallback(async () => {
    if (!mprh_pr_no || !enabled) {
      setLoading(false);
      setData(null);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await getPurchaseReturnById(mprh_pr_no);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [mprh_pr_no, enabled]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  const createExtra = useCallback(
    async (body) => {
      const distId = body.distributor_id;
      const res = await createPurchaseReturnExtra({
        mprh_pr_no,
        no_of_boxes: body.no_of_boxes ?? 0,
        status: body.status ?? "open",
        distributor_id:
          distId !== null && distId !== undefined && String(distId).trim() !== ""
            ? String(distId).trim()
            : undefined,
      });
      await fetchOne();
      return res;
    },
    [mprh_pr_no, fetchOne]
  );

  const updateExtra = useCallback(
    async (body) => {
      await updatePurchaseReturnExtra(mprh_pr_no, body);
      await fetchOne();
    },
    [mprh_pr_no, fetchOne]
  );

  return {
    purchaseReturn: data,
    loading,
    error,
    refetch: fetchOne,
    createExtra,
    updateExtra,
  };
}
