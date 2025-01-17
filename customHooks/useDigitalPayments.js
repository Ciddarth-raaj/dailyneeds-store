import { useState, useCallback, useEffect } from "react";
import { getDigitalPayments } from "../helper/digital-payments";

function useDigitalPayments() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDigitalPayments();

      if (response.code === 200) {
        setData(response.data || []);
      } else {
        throw new Error(response.message || "Failed to fetch digital payments");
      }
    } catch (err) {
      console.error("Error fetching digital payments:", err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const reset = useCallback(() => {
    setData([]);
    setLoading(false);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    reset,
  };
}

export default useDigitalPayments;
