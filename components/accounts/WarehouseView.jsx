import React, { useMemo } from "react";
import useWarehouseSales from "../../customHooks/useWarehouseSales";
import CustomContainer from "../CustomContainer";
import Table from "../table/table";
import { getWarehouseCashbook } from "../../util/account";

const HEADINGS_CASHBOOK = {
  particulars: "Particulars",
  narration: "Narration",
  debit: "Debit",
  credit: "Credit",
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

  const { sales } = useWarehouseSales(filters);

  const modifiedCashBook = useMemo(() => {
    return getWarehouseCashbook(sales);
  }, [sales]);

  return (
    <div>
      <CustomContainer title="Cash Book">
        <Table
          heading={HEADINGS_CASHBOOK}
          rows={modifiedCashBook}
          variant="plain"
        />
      </CustomContainer>
    </div>
  );
}

export default WarehouseView;
