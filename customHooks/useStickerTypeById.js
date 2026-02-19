import { useEffect, useState, useCallback } from "react";
import {
  getStickerTypeById,
  updateStickerType as updateStickerTypeApi,
} from "../helper/stickerTypes";

/**
 * @param {string|number} id - Sticker type ID
 * @param {Object} options - { enabled: boolean }
 */
export function useStickerTypeById(id, options = {}) {
  const { enabled = true } = options;
  const [stickerType, setStickerType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOne = useCallback(async () => {
    if (!id || !enabled) {
      setLoading(false);
      return null;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getStickerTypeById(id);
      setStickerType(data);
      return data;
    } catch (err) {
      setError(err);
      setStickerType(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  const updateStickerType = useCallback(
    async (body) => {
      const res = await updateStickerTypeApi(id, body);
      await fetchOne();
      return res;
    },
    [id, fetchOne]
  );

  return {
    stickerType,
    loading,
    error,
    refetch: fetchOne,
    updateStickerType,
  };
}
