import { useCallback, useEffect, useState } from "react";
import { getTelegramGroupById } from "../helper/telegramGroups";

/**
 * One Telegram group, for the View and Edit screens.
 *
 * `{ enabled: false }` keeps the Add screen from asking for an id it does not
 * have. Shaped like `useRemarkMasterById`.
 */
export function useTelegramGroupById(id, options = {}) {
  const { enabled = true } = options;
  const [group, setGroup] = useState(null);
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
      const data = await getTelegramGroupById(id);
      setGroup(data);
      return data;
    } catch (err) {
      setError(err);
      setGroup(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  return { group, loading, error, refetch: fetchOne };
}
