import { useCallback, useEffect, useState } from "react";
import {
  getTelegramGroups,
  deleteTelegramGroup as deleteTelegramGroupApi,
} from "../helper/telegramGroups";

/**
 * The Telegram Group Registry list.
 *
 * EVERY FILTER IS SERVER-SIDE, like every other filtered list in this
 * codebase: the grid would otherwise only ever search the page it happens to
 * be holding. `filters` is `{ search, category, outlet_id, bot_is_admin,
 * is_active }`; all are optional and an empty value is dropped rather than
 * sent as "". `outlet_id: "none"` asks for the company-wide groups.
 *
 * Shaped like `useRemarksMaster`.
 */
export function useTelegramGroups(filters = {}) {
  const {
    search = "",
    category = "",
    outlet_id = "",
    bot_is_admin = "",
    is_active = "",
  } = filters;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // An empty filter is DROPPED rather than sent as "": the server
      // validates every filter it is given, so sending an empty one would be
      // asking it to narrow by nothing.
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (outlet_id) params.outlet_id = outlet_id;
      if (bot_is_admin) params.bot_is_admin = bot_is_admin;
      if (is_active) params.is_active = is_active;
      const res = await getTelegramGroups(params);
      setData(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [search, category, outlet_id, bot_is_admin, is_active]);

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
