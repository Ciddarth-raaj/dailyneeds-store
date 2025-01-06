import { useEffect, useState, useCallback } from "react";
import * as AccountsHelper from "../helper/accounts";

export function useAccounts(filters) {
  const [accounts, setAccounts] = useState([]);
  const [isSaved, setIsSaved] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AccountsHelper.getAllAccounts(filters);
      if (data.code === 200) {
        setAccounts(data.data);
        setIsSaved(data.is_saved);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const saveSheet = async () => {
    try {
      const response = await AccountsHelper.saveAccountSheet({
        sheet_date: filters.to_date.split("T")[0],
        store_id: filters.store_id,
      });

      if (response.code === 200) {
        setIsSaved(true);
        return response;
      }
      throw new Error(response.message || "Failed to save sheet");
    } catch (err) {
      console.error("Error saving sheet:", err);
      throw err;
    }
  };

  const unsaveSheet = async () => {
    try {
      const response = await AccountsHelper.unsaveAccountSheet({
        sheet_date: filters.to_date.split("T")[0],
        store_id: filters.store_id,
      });

      if (response.code === 200) {
        setIsSaved(false);
        return response;
      }
      throw new Error(response.message || "Failed to unsave sheet");
    } catch (err) {
      console.error("Error unsaving sheet:", err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    refetch: fetchAccounts,
    isSaved,
    saveSheet,
    unsaveSheet,
  };
}
