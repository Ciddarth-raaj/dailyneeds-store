import { useMemo } from "react";

const useAccountsGrouped = (accounts = [], sales = null) => {
  const checkIfExists = (date, storeId) => {
    if (!sales) {
      return false;
    }

    return sales.some((item) => {
      return (
        new Date(item.bill_date).setHours(23, 0, 0, 0) ===
          new Date(date).setHours(23, 0, 0, 0) && storeId == item.store_id
      );
    });
  };

  const groupedAccounts = useMemo(() => {
    return accounts
      .filter((item) => !checkIfExists(item.date, item.store_id))
      .reduce((acc, account) => {
        const date = new Date(account.date).toISOString().split("T")[0];
        const storeKey = `${account.store_id}_${date}`;

        if (!acc[storeKey]) {
          acc[storeKey] = {
            store_id: account.store_id,
            date: date,
            accounts: [],
            totals: {
              total_sales: 0,
              card_sales: 0,
              loyalty: 0,
              sales_return: 0,
              cash_handover: {
                1: 0,
                2: 0,
                5: 0,
                10: 0,
                20: 0,
                50: 0,
                100: 0,
                200: 0,
                500: 0,
              },
              unchecked_sales: [],
            },
          };
        }

        // Add account to group
        acc[storeKey].accounts.push(account);

        // Update totals
        acc[storeKey].totals.total_sales += parseFloat(
          account.total_sales || 0
        );
        acc[storeKey].totals.card_sales += parseFloat(account.card_sales || 0);
        acc[storeKey].totals.loyalty += parseFloat(account.loyalty || 0);
        acc[storeKey].totals.sales_return += parseFloat(
          account.sales_return || 0
        );

        // Update cash handover
        acc[storeKey].totals.cash_handover[1] += account.cash_handover_1 || 0;
        acc[storeKey].totals.cash_handover[2] += account.cash_handover_2 || 0;
        acc[storeKey].totals.cash_handover[5] += account.cash_handover_5 || 0;
        acc[storeKey].totals.cash_handover[10] += account.cash_handover_10 || 0;
        acc[storeKey].totals.cash_handover[20] += account.cash_handover_20 || 0;
        acc[storeKey].totals.cash_handover[50] += account.cash_handover_50 || 0;
        acc[storeKey].totals.cash_handover[100] +=
          account.cash_handover_100 || 0;
        acc[storeKey].totals.cash_handover[200] +=
          account.cash_handover_200 || 0;
        acc[storeKey].totals.cash_handover[500] +=
          account.cash_handover_500 || 0;

        // Add unchecked sales
        if (account.sales) {
          acc[storeKey].totals.unchecked_sales.push(
            ...account.sales.filter((sale) => !sale.is_checked)
          );
        }

        return acc;
      }, {});
  }, [accounts, sales]);

  return {
    groupedAccounts,
    getStoreData: (storeId, date) => {
      const key = `${storeId}_${date}`;
      return groupedAccounts[key];
    },
    getAllStores: () => Object.values(groupedAccounts),
  };
};

export default useAccountsGrouped;
