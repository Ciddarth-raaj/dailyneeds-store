import { useEffect, useState } from "react";
import { getAllDebitNoteFromTally } from "../helper/debit_note";

export function useDebitNoteFromTally(filters) {
  const [purchase, setPurchase] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPurchase = async (noRefresh = false) => {
    try {
      if (!noRefresh) {
        setLoading(true);
        setPurchase([]);
      }

      const data = await getAllDebitNoteFromTally(filters);
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

  return {
    purchase,
    setPurchase,
    loading,
    error,
    refetch: fetchPurchase,
  };
}
