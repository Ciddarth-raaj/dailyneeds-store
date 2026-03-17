import { useCallback, useEffect, useState } from "react";
import productOffers from "../helper/productOffers";

/**
 * @param {string|number} productId - Product ID
 * @param {Object} options - { enabled: boolean }
 */
export function useProductOfferByProductId(productId, options = {}) {
  const { enabled = true } = options;
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOne = useCallback(async () => {
    const id = productId != null ? Number(productId) : null;
    if (id == null || !enabled) {
      setLoading(false);
      setOffer(null);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await productOffers.getByProductId(id);
      setOffer(data);
      return data;
    } catch (err) {
      setError(err);
      setOffer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [productId, enabled]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  return {
    offer,
    loading,
    error,
    refetch: fetchOne,
  };
}

export default useProductOfferByProductId;
