import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Badge, Flex, IconButton } from "@chakra-ui/react";
import FromToDateOutletPicker from "../../components/DateOutletPicker/FromToDateOutletPicker";
import useSalesByStore from "../../customHooks/useSalesByStore";
import { useAccounts } from "../../customHooks/useAccounts";
import useEmployees from "../../customHooks/useEmployees";
import currencyFormatter from "../../util/currencyFormatter";
import Table from "../../components/table/table";
import useSalesReconciliation from "../../customHooks/useSalesReconciliation";
import moment from "moment";
import EmptyData from "../../components/EmptyData";
import useAccountsGrouped from "../../customHooks/useAccountsGrouped";
import useOutlets from "../../customHooks/useOutlets";
import useEpaymentReconciliation from "../../customHooks/useEpaymentReconciliation";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { saveReconciliationEpayment } from "../../helper/reconciliation";
import toast from "react-hot-toast";

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

const HEADINGS_EPAYMENT_DIFF = {
  bill_date: "Bill Date",
  outlet_name: "Outlet Name",
  paytm_tid: "Paytm TID",
  card_diff: "Card",
  upi_diff: "UPI",
  paytm_diff: "Paytm",
  sodexo_diff: "Sodexo",
  actions: "Actions",
};

const StyledMenuItem = ({ settled, label, onClick }) => (
  <MenuItem disabled={settled} onClick={onClick}>
    {`Settle ${label}`}
    {/* {`${!settled ? "Settle " : ""}${label}`} */}
    {/* {settled ? (
      <Badge colorScheme="green" ml="6px">
        Settled
      </Badge>
    ) : (
      ""
    )} */}
  </MenuItem>
);

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

  const { outlets } = useOutlets();
  const { sales } = useSalesReconciliation(filters);
  const { epayments, refetch } = useEpaymentReconciliation(filters);
  const { accounts } = useAccounts(filters);
  const { groupedAccounts } = useAccountsGrouped(accounts, sales);
  const { employees: allEmployees } = useEmployees({
    store_ids: [],
    designation_ids: [],
  });

  console.log(epayments);

  const DifferenceWrapper = (value) => {
    return (
      <span style={{ color: value <= 0 ? "green" : "red" }}>
        {currencyFormatter(value)}
      </span>
    );
  };

  const updateSettle = async (param) => {
    const data = {
      paytm_tid: param.paytm_tid,
      store_id: param.store_id,
      bill_date: moment(param.bill_date).format("YYYY-MM-DD"),
      card_settled: param.card_settled == 0 ? false : true,
      upi_settled: param.upi_settled == 0 ? false : true,
      paytm_settled: param.paytm_settled == 0 ? false : true,
      sodexo_settled: param.sodexo_settled == 0 ? false : true,
    };
    const reponse = await saveReconciliationEpayment(data);

    if (reponse.code === 200) {
      refetch();
    } else {
      toast.error("Error updating value");
    }
  };

  const OUTLET_MAP = useMemo(() => {
    const outletMap = {};

    outlets.forEach((item) => {
      outletMap[item.outlet_id] = item;
    });

    return outletMap;
  }, [outlets]);

  const salesList = useMemo(() => {
    const salesList = sales
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

    const unsavedAccounts =
      Object.keys(groupedAccounts)?.map((key) => {
        const item = groupedAccounts[key];

        return {
          bill_date: moment(item.date).format("DD-MM-YYYY"),
          outlet_name: OUTLET_MAP[item.store_id]?.outlet_name ?? "N/A",
          loyalty_diff: DifferenceWrapper(item.totals.loyalty),
          sales_diff: DifferenceWrapper(item.totals.total_sales),
          return_diff: DifferenceWrapper(item.totals.sales_return),
        };
      }) ?? [];

    const combinedList = [...salesList, ...unsavedAccounts];
    return combinedList;
  }, [accounts, sales, groupedAccounts, OUTLET_MAP]);

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

  const epaymentsList = useMemo(() => {
    return epayments
      .filter(
        (item) =>
          !(
            (item.card_diff == 0 || item.card_diff == null) &&
            (item.paytm_diff == 0 || item.paytm_diff == null) &&
            (item.sodexo_diff == 0 || item.sodexo_diff == null) &&
            (item.upi_diff == 0 || item.upi_diff == null)
          )
      )
      .map((item) => {
        const cardDiff =
          item.card_diff === null ? "-" : DifferenceWrapper(item.card_diff);
        const upiDiff =
          item.upi_diff === null ? "-" : DifferenceWrapper(item.upi_diff);
        const sodexoDiff =
          item.sodexo_diff === null ? "-" : DifferenceWrapper(item.sodexo_diff);
        const paytmDiff =
          item.paytm_diff === null ? "-" : DifferenceWrapper(item.paytm_diff);

        return {
          ...item,
          card_diff: item.card_settled ? (
            <span>
              <p>{cardDiff}</p>
              <Badge colorScheme="green">Settled</Badge>
            </span>
          ) : (
            cardDiff
          ),
          upi_diff: item.upi_settled ? (
            <span>
              <p>{upiDiff}</p>
              <Badge colorScheme="green">Settled</Badge>
            </span>
          ) : (
            upiDiff
          ),
          sodexo_diff: item.sodexo_settled ? (
            <span>
              <p>{sodexoDiff}</p>
              <Badge colorScheme="green">Settled</Badge>
            </span>
          ) : (
            sodexoDiff
          ),
          paytm_diff: item.paytm_settled ? (
            <span>
              <p>{paytmDiff}</p>
              <Badge colorScheme="green">Settled</Badge>
            </span>
          ) : (
            paytmDiff
          ),
          bill_date: moment(item.bill_date).format("DD-MM-YYYY"),
          actions: (
            <Menu
              align="end"
              gap={5}
              menuButton={
                <IconButton
                  variant="ghost"
                  colorScheme="purple"
                  icon={<i className={`fa fa-ellipsis-v`} />}
                />
              }
              transition
            >
              {item.card_diff !== null && (
                <StyledMenuItem
                  settled={item.card_settled}
                  label="Card"
                  onClick={() => updateSettle({ ...item, card_settled: 1 })}
                />
              )}
              {item.upi_diff !== null && (
                <StyledMenuItem
                  settled={item.upi_settled}
                  label="UPI"
                  onClick={() => updateSettle({ ...item, upi_settled: 1 })}
                />
              )}
              {item.paytm_diff !== null && (
                <StyledMenuItem
                  settled={item.paytm_settled}
                  label="Paytm"
                  onClick={() => updateSettle({ ...item, paytm_settled: 1 })}
                />
              )}
              {item.sodexo_diff !== null && (
                <StyledMenuItem
                  settled={item.sodexo_settled}
                  label="Sodexo"
                  onClick={() => updateSettle({ ...item, sodexo_settled: 1 })}
                />
              )}
            </Menu>
          ),
        };
      });
  }, [epayments]);

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
            {salesList.length === 0 ? (
              <EmptyData />
            ) : (
              <Table heading={HEADINGS_SALES_DIFF} rows={salesList} />
            )}
          </CustomContainer>
          <CustomContainer title="Epayment Difference" smallHeader>
            {epaymentsList.length === 0 ? (
              <EmptyData />
            ) : (
              <Table heading={HEADINGS_EPAYMENT_DIFF} rows={epaymentsList} />
            )}
          </CustomContainer>
          <CustomContainer title="Unchecked Payments / Receipts" smallHeader>
            {accountList.length === 0 ? (
              <EmptyData />
            ) : (
              <Table heading={HEADINGS_CASHBOOK} rows={accountList} />
            )}
          </CustomContainer>
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Difference;
