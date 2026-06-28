import { useCallback, useEffect, useState } from "react";
import hqOffers from "../helper/hqOffers";

export function useHqOfferByHqId(mohOfferHqId, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!enabled || mohOfferHqId == null || mohOfferHqId === "") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await hqOffers.getByHqId(mohOfferHqId);
      setData(result);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, mohOfferHqId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetch();
  }, [enabled, fetch]);

  return {
    data,
    offer: data?.offer,
    branches: data?.branches ?? [],
    loading,
    error,
    refetch: fetch,
  };
}

/** @deprecated Use useHqOfferByHqId */
export function useHqOfferById(mohOfferHqId, options = {}) {
  return useHqOfferByHqId(mohOfferHqId, options);
}

/** @deprecated Use useHqOfferByHqId */
export function useHqOfferByKey(mohOfferHqId, _retailOutletId, options = {}) {
  return useHqOfferByHqId(mohOfferHqId, options);
}
