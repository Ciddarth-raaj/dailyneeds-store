import { useCallback, useEffect, useState } from "react";
import { getGrnDetail } from "../helper/grnList";

export function useGrnDetail(refno, { enabled = true } = {}) {
  const [header, setHeader] = useState(null);
  const [items, setItems] = useState([]);
  // Sits beside header/items in the payload rather than inside the header,
  // and is always present -- an unverified GRN arrives as PENDING.
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDetail = useCallback(async () => {
    const key = refno != null ? String(refno).trim() : "";
    if (!enabled || !key) {
      setHeader(null);
      setItems([]);
      setVerification(null);
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
      setVerification(payload.verification ?? null);
    } catch (err) {
      setError(err);
      setHeader(null);
      setItems([]);
      setVerification(null);
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
    verification,
    loading,
    error,
    refetch: fetchDetail,
  };
}
