import { useCallback, useEffect, useState } from "react";
import { getTelegramGroupMembership } from "../helper/telegramGroups";

/**
 * ONE GROUP'S MANAGED MEMBERSHIP, for the Map screen. Phase 3C.
 *
 * Shaped like `useTelegramGroupMappings`: `{ enabled: false }` keeps it from
 * asking for an id the router has not produced yet.
 *
 * A WRITE REFETCHES RATHER THAN PATCHING A ROW. Revoking does not set the row
 * to "removed" locally, because that is not what happened: the server moved
 * the claim to a pending state and a worker will decide the rest. Showing
 * the server's answer is the only way this screen stays honest about a
 * removal that has been asked for and not yet performed.
 */
export function useTelegramGroupMembership(id, options = {}) {
  const { enabled = true } = options;
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refetch = useCallback(async () => {
    if (!id || !enabled) {
      setLoading(false);
      return [];
    }
    try {
      setLoading(true);
      setError(null);
      const rows = await getTelegramGroupMembership(id);
      setClaims(rows);
      return rows;
    } catch (err) {
      setError(err);
      setClaims([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [id, enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { claims, loading, error, refetch };
}

export default useTelegramGroupMembership;
