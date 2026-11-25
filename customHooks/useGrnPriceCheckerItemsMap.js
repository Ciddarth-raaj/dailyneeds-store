import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import offersV3 from "../helper/offersV3";

function normalizeProductIds(productIds) {
  if (!Array.isArray(productIds)) return [];
  const seen = new Set();
  const out = [];

  for (const raw of productIds) {
    if (raw == null || raw === "") continue;
    const id = parseInt(String(raw).trim(), 10);
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }

  return out;
}

export function useGrnPriceCheckerItemsMap(productIds, { enabled = true } = {}) {
  const normalizedIds = useMemo(
    () => normalizeProductIds(productIds),
    [productIds]
  );
  const idsKey = normalizedIds.join(",");
  const [itemsByProductId, setItemsByProductId] = useState(() => new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const toastShownRef = useRef(false);

  const fetchAll = useCallback(async () => {
    const ids = normalizeProductIds(productIds);

    if (!enabled || !ids.length) {
      setItemsByProductId(new Map());
      setLoading(false);
      setError(null);
      toastShownRef.current = false;
      return;
    }

    try {
      setLoading(true);
      setError(null);
      toastShownRef.current = false;

      // One request for every product on the GRN. This used to fan out to one
      // request per product, which on a large GRN dominated the page's load
      // time -- the browser only runs a handful of them at a time.
      const res = await offersV3.getItemsByProducts(ids);
      const byProduct = res?.data ?? {};

      const nextMap = new Map();
      for (const productId of ids) {
        const rows = byProduct[String(productId)];
        nextMap.set(productId, Array.isArray(rows) ? rows : []);
      }

      setItemsByProductId(nextMap);
    } catch (err) {
      setError(err);
      setItemsByProductId(new Map());
      if (!toastShownRef.current) {
        toast.error(err?.message || "Failed to load price checker items.");
        toastShownRef.current = true;
      }
    } finally {
      setLoading(false);
    }
    // productIds is read through the ref-stable idsKey on purpose: depending on
    // the array itself re-runs this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, idsKey]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    itemsByProductId,
    loading,
    error,
    refetch: fetchAll,
  };
}
