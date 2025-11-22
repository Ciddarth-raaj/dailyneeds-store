import moment from "moment";
import React, { useMemo } from "react";
import { useAccounts } from "../../customHooks/useAccounts";
import { OverallStatsCard } from "../../pages";

function MTDStatistics({ selectedOutlet }) {
  const mtdFilter = useMemo(() => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    startOfDay.setDate(1);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    return {
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
      store_id: selectedOutlet,
    };
  }, [selectedOutlet]);

  const { totalData: mtdTotalDataP, accounts: mtdAccounts } =
    useAccounts(mtdFilter);
  const mtdTotalData = { ...mtdTotalDataP, accountsList: mtdAccounts };

  const getMTDTitle = () => {
    return `Month to Date Statistics (${moment(mtdFilter.from_date).format(
      "DD/MM/YY"
    )} - ${moment(mtdFilter.to_date).format("DD/MM/YY")})`;
  };

  return OverallStatsCard(mtdTotalData, getMTDTitle(), "blue");
}

export default MTDStatistics;
