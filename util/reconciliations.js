import moment from "moment";
import currencyFormatter from "./currencyFormatter";
import toast from "react-hot-toast";
import { importFileToJSON, isValidFileType } from "./fileImport";

export const modifyEpaymentData = (
  upiParsedData,
  cardParsedData,
  digitalPayments,
  mappedEbooks,
  sudexoParsedData,
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
    ...(sudexoParsedData?.data ?? []),
  ];

  let acc = [];
  combinedRows.forEach((item) => {
    // Handle different date formats
    const date = moment(
      item["Transaction Req Date"] ||
        item["CHG_DATE"] ||
        item["Transaction Date"]
    );

    // Check if date is valid before proceeding
    if (!date.isValid()) return;
    const formattedDate = date.format("DD-MM-YYYY");

    // Handle different MID formats
    const bank_mid = item["EXTERNAL MID"] || item["MECODE"];
    const pluxe_outlet_id = item["Outlet Id"];

    // Check if MID exists and ignore if it doesn't
    if (!bank_mid && !pluxe_outlet_id) return;

    const bank_tid = digitalPayments[bank_mid || pluxe_outlet_id]?.bank_mid;

    let existingRow = acc.find(
      (row) => row.date === formattedDate && row.bank_tid === bank_tid
    );

    if (!existingRow) {
      existingRow = {
        bank_mid: digitalPayments[bank_mid || pluxe_outlet_id]?.bank_mid,
        bank_tid: bank_tid,
        pluxe_outlet_id,
        date: formattedDate,
        amount: 0,
        totalUPI: 0,
        totalCard: 0,
        totalSodexo: 0,
        paytm_tid:
          digitalPayments[bank_mid || pluxe_outlet_id]?.payment_tid ?? null,
        store_id:
          digitalPayments[bank_mid || pluxe_outlet_id]?.store_id ?? null,
        outlet_name: item["Outlet Name"] ?? null,
      };
      acc.push(existingRow);
    }

    // Handle different amount fields
    if (item["Transaction Amount"]) {
      existingRow.amount += parseInt(item["Transaction Amount"] ?? 0);
      existingRow.totalUPI += parseInt(item["Transaction Amount"] ?? 0);
    } else if (item["PYMT_NETAMNT"]) {
      existingRow.amount += parseInt(item["PYMT_NETAMNT"] ?? 0);
      existingRow.totalCard += parseInt(item["PYMT_NETAMNT"] ?? 0);
    } else if (item["Debit Amount"]) {
      existingRow.amount += parseInt(item["Debit Amount"] ?? 0);
      existingRow.totalSodexo += parseInt(item["Debit Amount"] ?? 0);
    }
  });

  return acc.map((item) => {
    const actualUpiVal = mappedEbooks[item.paytm_tid]?.reduce(
      (acc, item) => acc + item.hdur,
      0
    );
    const actualCardVal = mappedEbooks[item.paytm_tid]?.reduce(
      (acc, item) => acc + item.hfpp,
      0
    );
    const actualSodexoVal = mappedEbooks[item.paytm_tid]?.reduce(
      (acc, item) => acc + item.sedc,
      0
    );
    const upiDifference = actualUpiVal - item.totalUPI;
    const cardDifference = actualCardVal - item.totalCard;
    const sodexoDifference = actualSodexoVal - item.totalSodexo;

    return {
      ...item,
      totalCard: wrappedCurrencyFormatter(parseInt(item.totalCard)),
      totalUPI: wrappedCurrencyFormatter(parseInt(item.totalUPI)),
      totalSodexo: wrappedCurrencyFormatter(parseInt(item.totalSodexo)),
      amount: wrappedCurrencyFormatter(parseInt(item.amount)),
      upiDifference: getWrappedValue(upiDifference),
      cardDifference: getWrappedValue(cardDifference),
      sodexoDifference: getWrappedValue(sodexoDifference),
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
          result.data[0]["Transaction Req Date"] ||
            result.data[0]["CHG_DATE"] ||
            result.data[0]["Transaction Date"]
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
