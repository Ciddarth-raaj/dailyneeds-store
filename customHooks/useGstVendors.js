import { useCallback, useEffect, useState } from "react";
import { getGstVendors } from "../helper/gstVendors";

export function useGstVendors() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getGstVendors();
      setVendors(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { vendors, loading, error, refetch: fetchList };
}
