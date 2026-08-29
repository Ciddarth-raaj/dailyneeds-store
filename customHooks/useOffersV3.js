import { useCallback, useEffect, useState } from "react";
import offersV3 from "../helper/offersV3";

/**
 * Hook to fetch item-level Offers V3.
 * GET /offers-v3/items
 */
export function useOffersV3Items(status) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await offersV3.items.list(status);
      setOffers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { offers, loading, error, refetch: fetch };
}

/**
 * Hook to fetch batch-specific Offers V3.
 * GET /offers-v3/batches
 */
export function useOffersV3Batches(filters) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const filterKey = JSON.stringify(filters ?? {});

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await offersV3.batches.list(JSON.parse(filterKey));
      setOffers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      setOffers([]);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { offers, loading, error, refetch: fetch };
}

export default useOffersV3Items;
