import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Flex } from "@chakra-ui/react";
import FromToDateOutletPicker from "../../components/DateOutletPicker/FromToDateOutletPicker";
import useSalesByStore from "../../customHooks/useSalesByStore";
import { useAccounts } from "../../customHooks/useAccounts";
import useEmployees from "../../customHooks/useEmployees";
import currencyFormatter from "../../util/currencyFormatter";
import Table from "../../components/table/table";
import useSalesReconciliation from "../../customHooks/useSalesReconciliation";
import moment from "moment";

const HEADINGS_CASHBOOK = {
  particulars: "Particulars",
  narration: "Narration",
  debit: "Debit",
  credit: "Credit",
};

const HEADINGS_SALES_DIFF = {
  bill_date: "Bill Date",
  outlet_name: "Outlet Name",
  loyalty_diff: "Loyalty",
  sales_diff: "Total Sales",
  return_diff: "Sales Return",
};

function Difference() {
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [storeId, setStoreId] = useState(null);

  const filters = useMemo(() => {
    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      store_id: storeId,
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, [storeId, fromDate, toDate]);

  const { sales } = useSalesReconciliation(filters);
  const { accounts, refetch } = useAccounts(filters);
  const { employees: allEmployees } = useEmployees({
    store_ids: [],
    designation_ids: [],
  });

  const DifferenceWrapper = (value) => {
    return <span style={{ color: value >= 0 ? "green" : "red" }}>{value}</span>;
  };

  const salesList = useMemo(() => {
    return sales
      .filter(
        (item) =>
          item.return_diff != 0 ||
          item.sales_diff != 0 ||
          item.loyalty_diff != 0
      )
      .map((item) => ({
        ...item,
        bill_date: moment(item.bill_date).format("DD-MM-YYYY"),
        loyalty_diff: DifferenceWrapper(item.loyalty_diff),
        sales_diff: DifferenceWrapper(item.sales_diff),
        return_diff: DifferenceWrapper(item.return_diff),
      }));
  }, [sales]);

  const accountList = useMemo(() => {
    const rows = [];

    accounts.forEach((item) => {
      if (item.sales) {
        item.sales
          .filter((item) => !item.is_checked)
          .forEach((item) => {
            if (item.person_type == 5) {
              const employee = allEmployees.find(
                (employee) => employee.employee_id === item.person_id
              );

              rows.push({
                particulars: employee?.employee_name ?? "N/A",
                narration: item.description,
                debit: item.payment_type === 2 ? item.amount : "",
                credit: item.payment_type === 1 ? item.amount : "",
                rank: item.payment_type + 2,
              });
            } else {
              rows.push({
                particulars: item.person_name,
                narration: item.description,
                debit: item.payment_type === 2 ? item.amount : "",
                credit: item.payment_type === 1 ? item.amount : "",
                rank: item.payment_type + 2,
              });
            }
          });
      }
    });

    return rows.map((item) => ({
      ...item,
      debit: !item.debit ? "" : currencyFormatter(item.debit),
      credit: !item.credit ? "" : currencyFormatter(item.credit),
    }));
  }, [accounts, allEmployees]);

  return (
    <GlobalWrapper>
      <CustomContainer title="Difference" filledHeader>
        <Flex flexDirection="column" gap="22px">
          <FromToDateOutletPicker
            fromDate={fromDate}
            toDate={toDate}
            setFromDate={setFromDate}
            setToDate={setToDate}
            selectedOutlet={storeId}
            setSelectedOutlet={setStoreId}
          />
          <CustomContainer title="Sales Difference" smallHeader>
            <Table
              heading={HEADINGS_SALES_DIFF}
              rows={salesList}
              variant="plain"
            />
          </CustomContainer>
          <CustomContainer title="Unchecked Payments / Receipts" smallHeader>
            <Table
              heading={HEADINGS_CASHBOOK}
              rows={accountList}
              variant="plain"
            />
          </CustomContainer>
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Difference;
