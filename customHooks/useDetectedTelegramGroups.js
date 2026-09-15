import { useCallback, useState } from "react";
import { getDetectedTelegramGroups } from "../helper/telegramGroups";

/**
 * Telegram groups that have sent `/setup` and are not yet registered.
 *
 * DELIBERATELY NOT FETCHED ON MOUNT. Detection is an action somebody takes -
 * they add the bot, send `/setup`, then click Detect Group - and a list
 * fetched before any of that happened would always be empty and would teach
 * people the button does not work. `detect()` is called by the button.
 *
 * `detected` stays null until the first attempt, so "not asked yet" and
 * "asked, found nothing" are different states: only the second one should
 * say there is nothing there.
 */
export function useDetectedTelegramGroups() {
  const [detected, setDetected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const detect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const groups = await getDetectedTelegramGroups();
      setDetected(groups);
      return groups;
    } catch (err) {
      setError(err);
      setDetected(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setDetected(null);
    setError(null);
  }, []);

  return { detected, loading, error, detect, reset };
}
