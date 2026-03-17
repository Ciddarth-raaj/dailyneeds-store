import { useCallback, useEffect, useState } from "react";
import productOffers from "../helper/productOffers";

/**
 * Hook to fetch all product offers.
 * GET /product-offers
 */
function useProductOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productOffers.list();
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

export default useProductOffers;
