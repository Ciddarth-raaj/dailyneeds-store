import { useEffect, useState } from "react";
import { getPurchaseOrders } from "../helper/purchase";
import toast from "react-hot-toast";

export function usePurchaseOrder() {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPurchaseOrders = async (noRefresh = false) => {
    try {
      if (!noRefresh) {
        setLoading(true);
        setPurchaseOrders([]);
      }

      const response = await getPurchaseOrders();
      if (response.code === 200) {
        setPurchaseOrders(response.data || []);
      } else {
        setError("Failed to fetch purchase orders");
        toast.error("Failed to fetch purchase orders");
      }
    } catch (err) {
      console.error("Error fetching purchase orders:", err);
      setError(err);
      toast.error("Error fetching purchase orders");
    } finally {
      setLoading(false);
    }
  };

  // Get the latest purchase order ID for create mode
  const getLatestPurchaseOrderId = () => {
    if (!purchaseOrders || purchaseOrders.length === 0) {
      return null;
    }

    // Sort by purchase_order_id to get the latest one
    const sortedOrders = [...purchaseOrders].sort((a, b) => {
      const aId = String(a.purchase_order_id || "");
      const bId = String(b.purchase_order_id || "");
      return bId.localeCompare(aId);
    });

    return sortedOrders[0]?.purchase_order_id || null;
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  return {
    purchaseOrders,
    setPurchaseOrders,
    loading,
    error,
    refetch: fetchPurchaseOrders,
    getLatestPurchaseOrderId,
  };
}
