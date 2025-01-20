import moment from "moment";
import currencyFormatter from "./currencyFormatter";
import toast from "react-hot-toast";
import { importFileToJSON, isValidFileType } from "./fileImport";

export const modifyEpaymentData = (
  upiParsedData,
  cardParsedData,
  digitalPayments,
  mappedEbooks,
  noFormat = false
) => {
  const getWrappedValue = (value) => {
    if (noFormat) {
      return value;
    }

    return value ? (
      <span
        style={{
          color: value > 0 ? "green" : "red",
          fontWeight: "bold",
        }}
      >
        {currencyFormatter(value)}
      </span>
    ) : (
      "-"
    );
  };

  const wrappedCurrencyFormatter = (value) => {
    if (noFormat) {
      return value;
    }

    return currencyFormatter(value);
  };

  const combinedRows = [
    ...(upiParsedData?.data ?? []),
    ...(cardParsedData?.data ?? []),
  ];

  let acc = [];
  combinedRows.forEach((item) => {
    const date = moment(item["Transaction Req Date"] || item["CHG_DATE"]);
    // Check if date is valid before proceeding
    if (!date.isValid()) return;
    const formattedDate = date.format("DD-MM-YYYY");
    const bank_mid = item["EXTERNAL MID"] || item["MECODE"];
    // Check if MID exists and ignore if it doesn't
    if (!bank_mid) return;
    let existingRow = acc.find(
      (row) => row.date === formattedDate && row.bank_mid === bank_mid
    );

    if (!existingRow) {
      existingRow = {
        bank_mid: bank_mid,
        bank_tid: item["EXTERNAL TID"] || item["TERMINAL_NO"],
        date: formattedDate,
        amount: 0,
        totalUPI: 0,
        totalCard: 0,
        paytm_tid: digitalPayments[bank_mid]?.payment_tid ?? null,
        store_id: digitalPayments[bank_mid]?.store_id ?? null,
        outlet_name: digitalPayments[bank_mid]?.outlet_name ?? null,
      };
      acc.push(existingRow);
    }

    if (item["Transaction Amount"]) {
      existingRow.amount += parseInt(item["Transaction Amount"] ?? 0);
      existingRow.totalUPI += parseInt(item["Transaction Amount"] ?? 0);
    } else if (item["PYMT_NETAMNT"]) {
      existingRow.amount += parseInt(item["PYMT_NETAMNT"] ?? 0);
      existingRow.totalCard += parseInt(item["PYMT_NETAMNT"] ?? 0);
    }
  });

  return acc.map((item) => {
    const upiDifference =
      (mappedEbooks[item.paytm_tid]?.hdur || 0) - item.totalUPI;
    const cardDifference =
      (mappedEbooks[item.paytm_tid]?.hfpp || 0) - item.totalCard;

    return {
      ...item,
      totalCard: wrappedCurrencyFormatter(parseInt(item.totalCard)),
      totalUPI: wrappedCurrencyFormatter(parseInt(item.totalUPI)),
      amount: wrappedCurrencyFormatter(parseInt(item.amount)),
      upiDifference: getWrappedValue(upiDifference),
      cardDifference: getWrappedValue(cardDifference),
    };
  });
};

export const parseReconciliationFile = async (
  file,
  setParsedData,
  setSelectedDate,
  requiredHeaders = []
) => {
  try {
    if (!isValidFileType(file)) {
      throw new Error("Invalid file type");
    }

    const result = await importFileToJSON(file, requiredHeaders, 1);

    if (result.totalRows > 0) {
      setSelectedDate(
        moment(
          result.data[0]["Transaction Req Date"] || result.data[0]["CHG_DATE"]
        )
      );
    }

    setParsedData(result);
    toast.success(`Successfully imported ${result.totalRows} rows`);
  } catch (error) {
    console.error(error);
    toast.error(error.message);
  }
};
