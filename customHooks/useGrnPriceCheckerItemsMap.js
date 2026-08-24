import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import priceChecker from "../helper/priceChecker";

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

      const results = await Promise.allSettled(
        ids.map(async (productId) => {
          const res = await priceChecker.getItemsByProduct(productId);
          const rows = Array.isArray(res?.data) ? res.data : [];
          return { productId, rows };
        })
      );

      const nextMap = new Map();
      let failedCount = 0;

      for (const result of results) {
        if (result.status === "fulfilled") {
          nextMap.set(result.value.productId, result.value.rows);
        } else {
          failedCount += 1;
        }
      }

      for (const productId of ids) {
        if (!nextMap.has(productId)) {
          nextMap.set(productId, []);
        }
      }

      setItemsByProductId(nextMap);

      if (failedCount > 0) {
        const err = new Error(
          `Failed to load price checker data for ${failedCount} product(s).`
        );
        setError(err);
        if (!toastShownRef.current) {
          toast.error(err.message);
          toastShownRef.current = true;
        }
      }
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
  }, [enabled, idsKey, productIds]);

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
