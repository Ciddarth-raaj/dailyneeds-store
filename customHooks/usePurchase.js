import { useEffect, useState } from "react";
import { getAllPurchases } from "../helper/purchase";

export function usePurchase(filters) {
  const [purchase, setPurchase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPurchase = async () => {
    try {
      setLoading(true);
      setPurchase([]);
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

  useEffect(() => {
    fetchPurchase();
  }, [filters]);

  return { purchase, loading, error, refetch: fetchPurchase };
}
