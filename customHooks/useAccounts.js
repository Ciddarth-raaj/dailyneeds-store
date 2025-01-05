import { useEffect, useState, useCallback } from "react";
import * as AccountsHelper from "../helper/accounts";

export function useAccounts(filters) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AccountsHelper.getAllAccounts(filters);
      console.log("CIDD", data);
      if (data.code === 200) {
        setAccounts(data.data);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, error, refetch: fetchAccounts };
}
