import { useState, useCallback, useEffect } from "react";
import { getSalesByOutlet } from "../helper/accounts";

function useSalesByStore(filters) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSales = useCallback(async () => {
    if (!filters?.from_date || !filters?.to_date) return;

    try {
      setLoading(true);
      setError(null);
      const response = await getSalesByOutlet(filters);

      if (response.code === 200) {
        setData(response.data || []);
      } else {
        throw new Error(response.message || "Failed to fetch sales data");
      }
    } catch (err) {
      console.error("Error fetching sales by store:", err);
      setError(err.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const getTotalSales = useCallback(() => {
    return data.reduce((storeTotal, store) => {
      const storeSales = store.accounts.reduce(
        (total, account) => total + parseFloat(account.total_sales || 0),
        0
      );
      return storeTotal + storeSales;
    }, 0);
  }, [data]);

  const getTotalLoyalty = useCallback(() => {
    return data.reduce((storeTotal, store) => {
      const storeLoyalty = store.accounts.reduce(
        (total, account) => total + parseFloat(account.loyalty || 0),
        0
      );
      return storeTotal + storeLoyalty;
    }, 0);
  }, [data]);

  const getTotalCardSales = useCallback(() => {
    return data.reduce((storeTotal, store) => {
      const storeCardSales = store.accounts.reduce(
        (total, account) => total + parseFloat(account.card_sales || 0),
        0
      );
      return storeTotal + storeCardSales;
    }, 0);
  }, [data]);

  const getTotalCashSales = useCallback(() => {
    return data.reduce((storeTotal, store) => {
      const storeCashSales = store.accounts.reduce((total, account) => {
        const totalSales = parseFloat(account.total_sales || 0);
        const cardSales = parseFloat(account.card_sales || 0);
        const loyalty = parseFloat(account.loyalty || 0);
        return total + (totalSales - cardSales - loyalty);
      }, 0);
      return storeTotal + storeCashSales;
    }, 0);
  }, [data]);

  const getStoreSummary = useCallback(() => {
    return data.reduce((acc, store) => {
      const storeTotals = store.accounts.reduce(
        (totals, account) => {
          totals.total_sales += parseFloat(account.total_sales || 0);
          totals.card_sales += parseFloat(account.card_sales || 0);
          totals.loyalty += parseFloat(account.loyalty || 0);
          totals.sales_return += parseFloat(account.sales_return || 0);
          totals.cash_sales +=
            parseFloat(account.total_sales || 0) -
            parseFloat(account.card_sales || 0) -
            parseFloat(account.loyalty || 0);
          return totals;
        },
        {
          total_sales: 0,
          card_sales: 0,
          loyalty: 0,
          sales_return: 0,
          cash_sales: 0,
          outlet_name: store.outlet_name,
        }
      );

      acc[store.outlet_name] = storeTotals;
      return acc;
    }, {});
  }, [data]);

  const getAllSales = useCallback(() => {
    return data.flatMap((store) =>
      store.accounts.flatMap((account) => account.sales)
    );
  }, [data]);

  return {
    data,
    loading,
    error,
    refetch: fetchSales,
    getTotalSales,
    getTotalLoyalty,
    getTotalCardSales,
    getTotalCashSales,
    getStoreSummary,
    getAllSales,
  };
}

export default useSalesByStore;
