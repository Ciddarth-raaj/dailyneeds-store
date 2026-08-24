import { useCallback, useEffect, useState } from "react";
import { getGrnDetail } from "../helper/grnList";

export function useGrnDetail(refno, { enabled = true } = {}) {
  const [header, setHeader] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    const key = refno != null ? String(refno).trim() : "";
    if (!enabled || !key) {
      setHeader(null);
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getGrnDetail(key);
      const payload = res?.data ?? {};
      setHeader(payload.header ?? null);
      setItems(Array.isArray(payload.items) ? payload.items : []);
    } catch (err) {
      setError(err);
      setHeader(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [refno, enabled]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return {
    header,
    items,
    loading,
    error,
    refetch: fetchDetail,
  };
}
