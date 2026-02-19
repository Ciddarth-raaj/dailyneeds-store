import { useEffect, useState, useCallback } from "react";
import {
  getStickerTypes,
  deleteStickerType as deleteStickerTypeApi,
} from "../helper/stickerTypes";

/**
 * @param {Object} filters - { label, limit, offset }
 */
export function useStickerTypes(filters = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getStickerTypes(filters);
      setData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters.label, filters.limit, filters.offset]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const deleteStickerType = useCallback(
    async (id) => {
      const res = await deleteStickerTypeApi(id);
      await fetchList();
      return res;
    },
    [fetchList]
  );

  return {
    stickerTypes: data,
    loading,
    error,
    refetch: fetchList,
    deleteStickerType,
  };
}
