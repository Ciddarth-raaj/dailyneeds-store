import { useCallback, useEffect, useState } from "react";
import hqOffers from "../helper/hqOffers";

export function useHqOfferByKey(mohOfferId, retailOutletId, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!enabled || mohOfferId == null || retailOutletId == null) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await hqOffers.getByKey(mohOfferId, retailOutletId);
      setData(result);
    } catch (err) {
      setError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, mohOfferId, retailOutletId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    fetch();
  }, [enabled, fetch]);

  return { data, offer: data?.offer, products: data?.products ?? [], loading, error, refetch: fetch };
}
