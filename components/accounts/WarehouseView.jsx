import React, { useMemo } from "react";
import useWarehouseSales from "../../customHooks/useWarehouseSales";
import CustomContainer from "../CustomContainer";
import Table from "../table/table";
import {
  getWarehouseCashbook,
  getWarehouseDenominations,
} from "../../util/account";
import useWarehouseDenomination from "../../customHooks/useWarehouseDenomination";
import EmptyData from "../EmptyData";

const HEADINGS_CASHBOOK = {
  particulars: "Particulars",
  narration: "Narration",
  debit: "Debit",
  credit: "Credit",
};

const HEADINGS_DENOMINATION = {
  denomination: "Denomination",
  count: "Count",
  total: "Total Value",
};

function WarehouseView({ selectedDate }) {
  const filters = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, [selectedDate]);

  const {
    sales,
    denominations: allDenominations,
    startingCash,
  } = useWarehouseSales(filters);
  const { denomination } = useWarehouseDenomination(filters);

  const modifiedDenominations = useMemo(() => {
    return getWarehouseDenominations(denomination);
  }, [denomination]);

  const modifiedCashBook = useMemo(() => {
    return getWarehouseCashbook(
      sales,
      denomination,
      allDenominations,
      startingCash
    );
  }, [sales, denomination, allDenominations, startingCash]);

  return (
    <div>
      <CustomContainer
        title="Cash Denomination Summary"
        filledHeader
        smallHeader
        style={{ marginBottom: "22px" }}
      >
        {denomination?.length === 0 ? (
          <EmptyData />
        ) : (
          <Table
            heading={HEADINGS_DENOMINATION}
            rows={modifiedDenominations}
            variant="plain"
          />
        )}
      </CustomContainer>

      <CustomContainer title="Cash Book" filledHeader>
        {sales?.length === 0 &&
        denomination?.length === 0 &&
        allDenominations?.length === 0 ? (
          <EmptyData />
        ) : (
          <Table
            heading={HEADINGS_CASHBOOK}
            rows={modifiedCashBook}
            variant="plain"
          />
        )}
      </CustomContainer>
    </div>
  );
}

export default WarehouseView;
