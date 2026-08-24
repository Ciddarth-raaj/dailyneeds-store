import { useCallback, useEffect, useMemo, useState } from "react";
import { getGrnDetail } from "../helper/grnList";

function normalizeRefnos(refnos) {
  if (!Array.isArray(refnos)) return [];
  const seen = new Set();
  const out = [];

  for (const raw of refnos) {
    if (raw == null || raw === "") continue;
    const key = String(raw).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }

  return out;
}

export function useGrnDetailsByRefno(refnos, { enabled = true } = {}) {
  const normalizedRefnos = useMemo(() => normalizeRefnos(refnos), [refnos]);
  const refnosKey = normalizedRefnos.join(",");
  const [detailsByRefno, setDetailsByRefno] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    const keys = normalizeRefnos(refnos);

    if (!enabled || !keys.length) {
      setDetailsByRefno(new Map());
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const results = await Promise.allSettled(
        keys.map(async (refno) => {
          const res = await getGrnDetail(refno);
          const payload = res?.data ?? {};
          return {
            refno,
            items: Array.isArray(payload.items) ? payload.items : [],
          };
        })
      );

      const nextMap = new Map();
      let failedCount = 0;

      for (const result of results) {
        if (result.status === "fulfilled") {
          nextMap.set(result.value.refno, {
            items: result.value.items,
          });
        } else {
          failedCount += 1;
        }
      }

      for (const refno of keys) {
        if (!nextMap.has(refno)) {
          nextMap.set(refno, { items: [] });
        }
      }

      setDetailsByRefno(nextMap);

      if (failedCount > 0) {
        setError(
          new Error(`Failed to load GRN detail for ${failedCount} record(s).`)
        );
      }
    } catch (err) {
      setError(err);
      setDetailsByRefno(new Map());
    } finally {
      setLoading(false);
    }
  }, [enabled, refnosKey, refnos]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    detailsByRefno,
    loading,
    error,
    refetch: fetchAll,
  };
}
