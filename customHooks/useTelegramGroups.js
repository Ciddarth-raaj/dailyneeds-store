import { useCallback, useEffect, useState } from "react";
import {
  getTelegramGroups,
  deleteTelegramGroup as deleteTelegramGroupApi,
} from "../helper/telegramGroups";

/**
 * The Telegram Group Registry list.
 *
 * SEARCH AND THE CATEGORY FILTER ARE SERVER-SIDE, like every other filtered
 * list in this codebase: the grid would otherwise only ever search the page
 * it happens to be holding. `filters` is `{ search, category }`; both are
 * optional and an empty value is dropped rather than sent as "".
 *
 * Shaped like `useRemarksMaster`.
 */
export function useTelegramGroups(filters = {}) {
  const { search = "", category = "" } = filters;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const res = await getTelegramGroups(params);
      setData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [search, category]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const deleteGroup = useCallback(
    async (id) => {
      await deleteTelegramGroupApi(id);
      await fetchList();
    },
    [fetchList]
  );

  return { groups: data, loading, error, refetch: fetchList, deleteGroup };
}
