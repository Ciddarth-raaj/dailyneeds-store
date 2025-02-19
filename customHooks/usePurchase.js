import { useEffect, useState } from "react";
import { getAllPurchases } from "../helper/purchase";

export function usePurchase() {
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPurchase = async () => {
    try {
      setLoading(true);
      const data = await getAllPurchases();
      if (data.code === 200) {
        setPurchase(data.data);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPurchase();
  }, []);

  return { purchase, loading, error, refetch: fetchPurchase };
}
