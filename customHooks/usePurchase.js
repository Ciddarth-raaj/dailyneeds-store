import { useEffect, useState } from "react";
import {
  deletePurchaseTallyResponseForPurchase,
  getAllPurchases,
  updatePurchase,
  updatePurchaseFlags,
} from "../helper/purchase";

export function usePurchase(filters) {
  const [purchase, setPurchase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPurchase = async (noRefresh = false) => {
    try {
      if (!noRefresh) {
        setLoading(true);
        setPurchase([]);
      }

      const data = await getAllPurchases(filters);
      if (data.code === 200) {
        setPurchase(data.data);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Save, then approve. A save or an approval the server refuses (e.g. a
  // GST discrepancy still open, or an MRC ref no taken in that financial
  // year) is returned as it is, so the screen shows why.
  const updatePurchaseHandler = async (purchase_id, data) => {
    try {
      const response = await updatePurchase(purchase_id, data);
      if (response?.code !== 200) {
        return response;
      }
      const approval = await approvePurchase(purchase_id);
      await fetchPurchase(true);
      if (approval?.code !== 200) {
        return approval;
      }

      return response;
    } catch (err) {
      setError(err);
    }
  };

  const deletePurchaseTallyResponseHandler = async (purchaseId) => {
    try {
      const response = await deletePurchaseTallyResponseForPurchase(purchaseId);

      if (response.code === 200) {
        await fetchPurchase(true);
      }

      return response;
    } catch (err) {
      setError(err);
    }
  };

  const updatePurchaseFlagsHandler = async (purchaseId, flags) => {
    try {
      const response = await updatePurchaseFlags(purchaseId, flags);
      if (response.code === 200) {
        await fetchPurchase(true);
      }

      return response;
    } catch (err) {
      setError(err);
    }
  };

  const approvePurchase = async (purchase_id) => {
    return updatePurchaseFlags(purchase_id, {
      is_approved: true,
      has_updated: false,
    });
  };

  const unapprovePurchase = async (purchase_id) => {
    await updatePurchaseFlags(purchase_id, {
      is_approved: false,
      has_updated: false,
    });
    await fetchPurchase(true);
  };

  useEffect(() => {
    fetchPurchase();
  }, [filters]);

  return {
    purchase,
    setPurchase,
    loading,
    error,
    refetch: fetchPurchase,
    updatePurchase: updatePurchaseHandler,
    updatePurchaseFlags: updatePurchaseFlagsHandler,
    unapprovePurchase: unapprovePurchase,
    deletePurchaseTallyResponse: deletePurchaseTallyResponseHandler,
  };
}
