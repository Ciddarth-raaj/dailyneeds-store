import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import FromToDateOutletPicker from "../../components/DateOutletPicker/FromToDateOutletPicker";
import { usePurchaseFromTally } from "../../customHooks/usePurchaseFromTally";
import Table from "../../components/table/table";
import moment from "moment";
import { diffWords } from "diff";
import currencyFormatter from "../../util/currencyFormatter";

const HEADINGS = {
  VoucherNo: "MRC Ref No",
  GSTIN: "GSTIN",
  mmh_mrc_dt: "MRC Date",
  CostCentre: "Outlet Name",
  total_amount: "Total Amount",
  mmh_mrc_amt: "MRC Amount",
  // difference_amount: (
  //   <p>
  //     Difference Amount
  //     <br />
  //     <span style={{ fontSize: "10px", color: "gray" }}>
  //       (Total Amount - Invoice Amount)
  //     </span>
  //   </p>
  // ),
  mrc_difference: (
    <p>
      MRC Difference Amount
      <br />
      <span style={{ fontSize: "10px", color: "gray" }}>
        (MRC Amount - Invoice Amount)
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

  const { purchase } = usePurchaseFromTally(filters);

  const rows = useMemo(() => {
    return purchase
      .map((item) => {
        let difference = (item.total_amount - item.InvoiceValue).toFixed(2);
        let mrcDifference = (item.mmh_mrc_amt - item.InvoiceValue).toFixed(2);

        if (difference <= 1 && difference >= -1) {
          difference = "-";
        } else {
          difference = (
            <p style={{ color: "red" }}>{currencyFormatter(difference)}</p>
          );
        }

        if (mrcDifference <= 1 && mrcDifference >= -1) {
          mrcDifference = "-";
        } else {
          mrcDifference = (
            <p style={{ color: "red" }}>{currencyFormatter(mrcDifference)}</p>
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

        if (
          mrcDifference === "-" &&
          (item.GSTIN == "" || item.supplier_gstn === item.GSTIN)
        ) {
          return null;
        }

        return {
          ...item,
          mmh_mrc_dt: moment(item.mmh_mrc_dt).format("DD-MM-YYYY"),
          difference_amount: difference,
          mrc_difference: mrcDifference,
          total_amount: currencyFormatter(item.total_amount),
          mmh_mrc_amt: currencyFormatter(item.mmh_mrc_amt),
          difference_name: highlightDifferences(
            item.supplier_gstn ?? "",
            item.GSTIN ?? ""
          ),
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
