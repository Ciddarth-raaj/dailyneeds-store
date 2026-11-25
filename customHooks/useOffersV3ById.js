import { useCallback, useEffect, useState } from "react";
import offersV3 from "../helper/offersV3";

/**
 * @param {string|number} id
 * @param {"item"|"batch"} scope
 * @param {Object} options - { enabled: boolean }
 */
export function useOffersV3ById(id, scope, options = {}) {
  const { enabled = true } = options;
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOne = useCallback(async () => {
    const offerId = id != null ? Number(id) : null;
    if (offerId == null || !enabled) {
      setLoading(false);
      setOffer(null);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const data =
        scope === "batch" ? await offersV3.batches.getById(offerId) : await offersV3.items.getById(offerId);
      setOffer(data);
      return data;
    } catch (err) {
      setError(err);
      setOffer(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, scope, enabled]);

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

export default useOffersV3ById;
