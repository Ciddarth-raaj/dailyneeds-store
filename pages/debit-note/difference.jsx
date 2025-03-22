import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import FromToDateOutletPicker from "../../components/DateOutletPicker/FromToDateOutletPicker";
import { usePurchaseFromTally } from "../../customHooks/usePurchaseFromTally";
import Table from "../../components/table/table";
import moment from "moment";
import { diffWords } from "diff";
import currencyFormatter from "../../util/currencyFormatter";
import { useDebitNoteFromTally } from "../../customHooks/useDebitNoteFromTally";

const HEADINGS = {
  VoucherNo: "MPRH Ref No",
  GSTIN: "GSTIN",
  mprh_pr_dt: "MPRH Date",
  CostCentre: "Outlet Name",
  total_amount: "Total Amount",
  tot_item_value: "MPRH Amount",
  // difference_amount: (
  //   <p>
  //     Difference Amount
  //     <br />
  //     <span style={{ fontSize: "10px", color: "gray" }}>
  //       (Total Amount - Invoice Amount)
  //     </span>
  //   </p>
  // ),
  mprh_difference: (
    <p>
      MPRH Difference Amount
      <br />
      <span style={{ fontSize: "10px", color: "gray" }}>
        (MPRH Amount - Invoice Amount)
      </span>
    </p>
  ),
  difference_name: "GSTIN Difference",
};

function Difference() {
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(1)));
  const [toDate, setToDate] = useState(
    new Date(
      new Date().setDate(
        new Date().getDate() +
          (new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            0
          ).getDate() -
            new Date().getDate())
      )
    )
  );
  const [selectedOutlet, setSelectedOutlet] = useState(null);

  const filters = useMemo(() => {
    const filterItem = {};

    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    filterItem["from_date"] = startOfDay.toISOString();
    filterItem["to_date"] = endOfDay.toISOString();

    if (selectedOutlet) {
      filterItem["outlet_id"] = selectedOutlet;
    }

    return filterItem;
  }, [selectedOutlet, fromDate, toDate]);

  const { purchase } = useDebitNoteFromTally(filters);

  const rows = useMemo(() => {
    return purchase
      .map((item) => {
        let difference = (item.total_amount - item.InvoiceValue).toFixed(2);
        let mprh_difference = (item.tot_item_value - item.InvoiceValue).toFixed(
          2
        );

        if (difference <= 1 && difference >= -1) {
          difference = "-";
        } else {
          difference = (
            <p style={{ color: "red" }}>{currencyFormatter(difference)}</p>
          );
        }

        if (mprh_difference <= 1 && mprh_difference >= -1) {
          mprh_difference = "-";
        } else {
          mprh_difference = (
            <p style={{ color: "red" }}>{currencyFormatter(mprh_difference)}</p>
          );
        }

        const highlightDifferences = (string1, string2) => {
          const diff = diffWords(string1, string2);

          return diff.map((part, index) => {
            if (part.added) {
              return (
                <span
                  key={index}
                  style={{
                    backgroundColor: "#b2d8b2",
                    marginInline: "2.5px",
                    paddingInline: "2.5px",
                    borderRadius: "3px",
                    textTransform: "capitalize",
                  }}
                >
                  {part.value}
                </span>
              );
            } else if (part.removed) {
              return (
                <span
                  key={index}
                  style={{
                    backgroundColor: "#ff9999",
                    textDecoration: "line-through",
                    marginInline: "2.5px",
                    paddingInline: "2.5px",
                    borderRadius: "3px",
                    textTransform: "capitalize",
                  }}
                >
                  {part.value}
                </span>
              );
            } else {
              return (
                <span style={{ textTransform: "capitalize" }} key={index}>
                  {part.value}
                </span>
              );
            }
          });
        };

        // if (difference === "-" && mrcDifference === "-") {
        if (mprh_difference === "-") {
          return null;
        }

        return {
          ...item,
          mprh_pr_dt: moment(item.mprh_pr_dt).format("DD-MM-YYYY"),
          difference_amount: difference,
          mprh_difference: mprh_difference,
          total_amount: currencyFormatter(item.total_amount),
          tot_item_value: currencyFormatter(item.tot_item_value),
          difference_name: highlightDifferences(item.supplier_gstn, item.GSTIN),
        };
      })
      .filter((item) => item !== null);
  }, [purchase]);

  return (
    <GlobalWrapper>
      <CustomContainer title="Difference" filledHeader>
        <FromToDateOutletPicker
          fromDate={fromDate}
          toDate={toDate}
          setFromDate={setFromDate}
          setToDate={setToDate}
          selectedOutlet={selectedOutlet}
          setSelectedOutlet={setSelectedOutlet}
          style={{ marginBottom: "22px" }}
        />

        <Table
          variant="plain"
          heading={HEADINGS}
          rows={rows}
          //   sortCallback={handleSort}
          size="sm"
          //   showPagination
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Difference;
