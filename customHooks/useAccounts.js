import { useEffect, useState, useCallback } from "react";
import * as AccountsHelper from "../helper/accounts";
import { getTotals, getTotalsByStore } from "../util/account";
import toast from "react-hot-toast";

export function useAccounts(filters) {
  const [accounts, setAccounts] = useState([]);
  const [mappedAccounts, setMappedAccounts] = useState([]);
  const [epayments, setEpayments] = useState([]);
  const [mappedEbooks, setMappedEbooks] = useState({});
  const [outletData, setOutletData] = useState(null);
  const [isSaved, setIsSaved] = useState(true);
  const [isCounterClosed, setIsCounterClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalData, setTotalData] = useState(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await AccountsHelper.getAllAccounts(filters);
      if (data.code === 200) {
        setAccounts(data.data.account);
        setEpayments(data.data.ebook);
        setOutletData(data.data.outlet);
        setIsSaved(data.data.is_saved);
        setIsCounterClosed(data.data.is_closed);

        const totals = getTotalsByStore(data.data.account, true);
        const totalsWithNoOfBills = getTotals(data.data.account, true);
        setTotalData(totalsWithNoOfBills);
        setMappedAccounts(totals);

        // Create mapped ebooks with paytm_tid as key
        const mappedEbooksData = (data.data.ebook || []).reduce((acc, item) => {
          if (item.paytm_tid) {
            if (!acc[item.paytm_tid]) {
              acc[item.paytm_tid] = [];
            }
            acc[item.paytm_tid].push(item);
          }

          if (item.pluxe_outlet_id) {
            if (!acc[item.pluxe_outlet_id]) {
              acc[item.pluxe_outlet_id] = [];
            }
            acc[item.pluxe_outlet_id].push(item);
          }
          return acc;
        }, {});
        setMappedEbooks(mappedEbooksData);
      }
    } catch (err) {
      console.log(err);
      setError(err);
      setAccounts([]);
      setEpayments([]);
      setMappedEbooks({});
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const saveSheet = async () => {
    try {
      const response = await AccountsHelper.saveAccountSheet({
        sheet_date: filters.to_date.split("T")[0],
        store_id: filters.store_id,
        no_of_bills: isNaN(totalData.no_of_bills) ? 0 : totalData.no_of_bills,
        total_sales: totalData.total_sales,
      });

      if (response.code === 200) {
        setIsSaved(true);
        setIsCounterClosed(true);
        return response;
      }
      throw new Error(response.message || "Failed to save sheet");
    } catch (err) {
      console.error("Error saving sheet:", err);
      throw err;
    }
  };

  const closeCounter = async () => {
    try {
      if (!totalData) {
        return;
      }

      const response = await AccountsHelper.saveAccountSheetMessage({
        sheet_date: filters.to_date.split("T")[0],
        store_id: filters.store_id,
        no_of_bills: isNaN(totalData.no_of_bills) ? 0 : totalData.no_of_bills,
        total_sales: totalData.total_sales,
      });

      if (response.code === 200 || response.code === 400) {
        setIsCounterClosed(true);
        return response;
      }

      throw new Error(response.message || "Failed to close counter");
    } catch (err) {
      console.error("Error closing counter:", err);
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
    epayments,
    mappedEbooks,
    outletData,
    mappedAccounts,
    closeCounter,
    isCounterClosed,
    totalData,
  };
}
