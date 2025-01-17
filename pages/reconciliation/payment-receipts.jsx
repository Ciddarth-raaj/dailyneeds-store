import React, { useEffect, useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { useAccounts } from "../../customHooks/useAccounts";
import useEmployees from "../../customHooks/useEmployees";
import Table from "../../components/table/table";
import currencyFormatter from "../../util/currencyFormatter";
import { Box, Checkbox, Container } from "@chakra-ui/react";
import DateOutletPicker from "../../components/DateOutletPicker";
import { useUser } from "../../contexts/UserContext";
import { updateSales } from "../../helper/accounts";
import EmptyData from "../../components/EmptyData";

const HEADINGS_CASHBOOK = {
  checkbox: "",
  particulars: "Particulars",
  narration: "Narration",
  debit: "Debit",
  credit: "Credit",
};

function PaymentReceipts() {
  const { storeId } = useUser().userConfig;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedOutlet, setSelectedOutlet] = useState(null);

  const filters = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      store_id: selectedOutlet,
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, [selectedOutlet, selectedDate]);

  const { accounts, refetch } = useAccounts(filters);
  const { employees: allEmployees } = useEmployees({
    store_ids: [],
    designation_ids: [],
  });

  useEffect(() => {
    if (storeId) {
      setSelectedOutlet(storeId);
    }
  }, [storeId]);

  const onCheckBoxChange = async (salesId, value) => {
    try {
      await updateSales(salesId, { is_checked: value });
      await refetch();
    } catch (err) {
      console.log(err);
    }
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
        <DateOutletPicker
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          selectedOutlet={selectedOutlet}
          setSelectedOutlet={setSelectedOutlet}
          disabled={storeId !== null}
        />

        {accountList.length === 0 ? (
          <EmptyData />
        ) : (
          <Box mt="22px">
            <Table
              heading={HEADINGS_CASHBOOK}
              rows={accountList}
              variant="plain"
            />
          </Box>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PaymentReceipts;
