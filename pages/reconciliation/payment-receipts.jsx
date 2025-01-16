import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { useAccounts } from "../../customHooks/useAccounts";
import useEmployees from "../../customHooks/useEmployees";
import Table from "../../components/table/table";
import currencyFormatter from "../../util/currencyFormatter";
import { Checkbox } from "@chakra-ui/react";

const HEADINGS_CASHBOOK = {
  checkbox: "",
  particulars: "Particulars",
  narration: "Narration",
  debit: "Debit",
  credit: "Credit",
};

function PaymentReceipts() {
  const [selectedDate, setSelectedDate] = useState(new Date("2025-01-11"));

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

  const { accounts } = useAccounts(filters);
  const { employees: allEmployees } = useEmployees({
    store_ids: [],
    designation_ids: [],
  });

  const onCheckBoxChange = (salesId, value) => {
    console.log("CIDD", { salesId, value });
  };

  const CustomCheckbox = (item) => {
    return (
      <Checkbox
        colorScheme="purple"
        isChecked={item?.is_checked}
        onChange={(e) => onCheckBoxChange(item.sales_id, !item?.is_checked)}
      />
    );
  };

  const accountList = useMemo(() => {
    const rows = [];

    accounts.forEach((item) => {
      if (item.sales) {
        item.sales.forEach((item) => {
          if (item.person_type == 5) {
            const employee = allEmployees.find(
              (employee) => employee.employee_id === item.person_id
            );

            rows.push({
              checkbox: CustomCheckbox(item),
              particulars: employee?.employee_name ?? "N/A",
              narration: item.description,
              debit: item.payment_type === 2 ? item.amount : "",
              credit: item.payment_type === 1 ? item.amount : "",
              rank: item.payment_type + 2,
            });
          } else {
            rows.push({
              checkbox: CustomCheckbox(item),
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
      <CustomContainer title="Payment / Receipts Reconciliation" filledHeader>
        <Table heading={HEADINGS_CASHBOOK} rows={accountList} variant="plain" />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PaymentReceipts;
