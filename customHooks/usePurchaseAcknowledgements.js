import { useEffect, useState, useCallback } from "react";
import {
  getPurchaseAcknowledgements,
  getPurchaseAcknowledgementById,
  createPurchaseAcknowledgement,
  updatePurchaseAcknowledgement,
  deletePurchaseAcknowledgement,
} from "../helper/purchaseAcknowledgement";

export function usePurchaseAcknowledgements() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPurchaseAcknowledgements();
      setData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const create = useCallback(async (body) => {
    const res = await createPurchaseAcknowledgement(body);
    await refetch();
    return res;
  }, [refetch]);

  const update = useCallback(
    async (id, body) => {
      await updatePurchaseAcknowledgement(id, body);
      await refetch();
    },
    [refetch]
  );

  const remove = useCallback(
    async (id) => {
      await deletePurchaseAcknowledgement(id);
      await refetch();
    },
    [refetch]
  );

  return {
    purchaseAcknowledgements: data,
    loading,
    error,
    refetch,
    create,
    update,
    remove,
  };
}

export function usePurchaseAcknowledgementById(id, options = {}) {
  const { enabled = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!id || !enabled) {
      setLoading(false);
      setData(null);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const result = await getPurchaseAcknowledgementById(id);
      setData(result);
      return result;
    } catch (err) {
      setError(err);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const update = useCallback(
    async (body) => {
      await updatePurchaseAcknowledgement(id, body);
      await refetch();
    },
    [id, refetch]
  );

  return {
    purchaseAcknowledgement: data,
    loading,
    error,
    refetch,
    update,
  };
}
