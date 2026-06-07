import { useEffect, useState, useCallback } from "react";
import {
  getProductDistributors,
  getProductDistributorByCid,
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
    async (cid) => {
      await deleteProductDistributor(cid);
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

export function useDistributorByCid(cid, options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOne = useCallback(async () => {
    if (!cid || !enabled) {
      setLoading(false);
      setData(null);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await getProductDistributorByCid(cid);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [cid, enabled]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  const saveBuyerMapping = useCallback(
    async (buyer_id) => {
      if (!cid) throw new Error("Distributor CID is required");
      await upsertProductDistributorMapping({
        CID: cid,
        buyer_id:
          buyer_id === "" || buyer_id === undefined ? null : Number(buyer_id),
      });
      await fetchOne();
    },
    [cid, fetchOne]
  );

  return {
    distributor: data,
    loading,
    error,
    refetch: fetchOne,
    saveBuyerMapping,
  };
}

/** @deprecated Use useDistributorByCid */
export function useDistributorByCode(cid, options = {}) {
  return useDistributorByCid(cid, options);
}

export function useCreateDistributor() {
  const createDistributor = useCallback(async (body) => {
    return upsertProductDistributorMapping(body);
  }, []);
  return { createDistributor };
}
