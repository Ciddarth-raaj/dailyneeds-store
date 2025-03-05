import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import FromToDateOutletPicker from "../../components/DateOutletPicker/FromToDateOutletPicker";
import { usePurchaseFromTally } from "../../customHooks/usePurchaseFromTally";
import Table from "../../components/table/table";
import moment from "moment";
import { diffWords } from "diff";

const HEADINGS = {
  VoucherNo: "MRC Ref No",
  supplier_name: "Supplier Name",
  mmh_mrc_dt: "MRC Date",
  CostCentre: "Outlet Name",
  total_amount: "Total Amount",
  difference_amount: "Difference Amount",
  difference_name: "Difference Name",
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
    return purchase.map((item) => {
      let difference = (item.total_amount - item.InvoiceValue).toFixed(2);

      if (difference == 0) {
        difference = "-";
      } else {
        difference = <p style={{ color: "red" }}>{difference}</p>;
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
                }}
              >
                {part.value}
              </span>
            );
          } else {
            return <span key={index}>{part.value}</span>;
          }
        });
      };

      return {
        ...item,
        mmh_mrc_dt: moment(item.mmh_mrc_dt).format("DD-MM-YYYY"),
        difference_amount: difference,
        difference_name: highlightDifferences(
          item.supplier_name,
          item.SupplierName
        ),
      };
    });
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
