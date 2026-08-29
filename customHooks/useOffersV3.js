import { useCallback, useEffect, useState } from "react";
import offersV3 from "../helper/offersV3";

/**
 * Hook to fetch all Offers V3.
 * GET /offers-v3
 */
function useOffersV3() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await offersV3.list();
      setOffers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err);
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { offers, loading, error, refetch: fetch };
}

export default useOffersV3;
