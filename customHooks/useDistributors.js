import { useEffect, useState, useCallback } from "react";
import {
  getProductDistributors,
  getProductDistributorByCode,
  upsertProductDistributorMapping,
  deleteProductDistributor,
} from "../helper/productDistributors";

export function useDistributors() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getProductDistributors();
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

  const deleteDistributor = useCallback(
    async (code) => {
      await deleteProductDistributor(code);
      await fetchList();
    },
    [fetchList]
  );

  return {
    distributors: data,
    loading,
    error,
    refetch: fetchList,
    deleteDistributor,
  };
}

export function useDistributorByCode(code, options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOne = useCallback(async () => {
    if (!code || !enabled) {
      setLoading(false);
      setData(null);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await getProductDistributorByCode(code);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [code, enabled]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  const saveBuyerMapping = useCallback(
    async (buyer_id) => {
      if (!code) throw new Error("Distributor code is required");
      await upsertProductDistributorMapping({
        MDM_DIST_CODE: code,
        buyer_id:
          buyer_id === "" || buyer_id === undefined ? null : Number(buyer_id),
      });
      await fetchOne();
    },
    [code, fetchOne]
  );

  return {
    distributor: data,
    loading,
    error,
    refetch: fetchOne,
    saveBuyerMapping,
  };
}

export function useCreateDistributor() {
  const createDistributor = useCallback(async (body) => {
    return upsertProductDistributorMapping(body);
  }, []);
  return { createDistributor };
}
