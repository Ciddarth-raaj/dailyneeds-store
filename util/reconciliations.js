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
  paytmParsedData,
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
    ...(paytmParsedData?.data ?? []),
  ];

  let acc = [];
  let sodexoList = [];
  combinedRows.forEach((item) => {
    // Handle different date formats
    let date;

    if (item["transaction_date"]) {
      date = moment(
        item["transaction_date"].replaceAll("'", ""),
        "DD-MM-YYYY hh:mm:ss"
      );
    } else {
      date = moment(
        item["Transaction Req Date"] ||
          item["CHG_DATE"] ||
          item["Transaction Date"]
      );
    }

    // Check if date is valid before proceeding
    if (!date.isValid()) return;
    const formattedDate = date.format("DD-MM-YYYY");

    // Handle different MID formats
    const bank_mid = item["EXTERNAL MID"] || item["MECODE"];
    const pluxe_outlet_id = item["Outlet Id"];
    const paytm_mid = item["original_mid"]?.replaceAll("'", "");

    // Check if MID exists and ignore if it doesn't
    if (!bank_mid && !pluxe_outlet_id && !paytm_mid) return;

    if (pluxe_outlet_id) {
      let existingRow = sodexoList.find(
        (row) =>
          row.date === formattedDate && row.pluxe_outlet_id === pluxe_outlet_id
      );

      if (!existingRow) {
        existingRow = {
          bank_mid: digitalPayments[pluxe_outlet_id]?.bank_mid,
          bank_tid: digitalPayments[pluxe_outlet_id]?.bank_tid,
          pluxe_outlet_id,
          date: formattedDate,
          amount: 0,
          totalUPI: 0,
          totalCard: 0,
          totalSodexo: 0,
          totalPaytm: 0,
          paytm_tid: digitalPayments[pluxe_outlet_id]?.payment_tid ?? null,
          store_id: digitalPayments[pluxe_outlet_id]?.store_id ?? null,
          outlet_name:
            digitalPayments[pluxe_outlet_id]?.outlet_name ?? "Not Found",
        };
        sodexoList.push(existingRow);
      }

      // Handle different amount fields
      if (item["Transaction Amount"]) {
        existingRow.amount += parseInt(item["Transaction Amount"] ?? 0);
        existingRow.totalUPI += parseInt(item["Transaction Amount"] ?? 0);
      } else if (item["PYMT_CHGAMNT"]) {
        existingRow.amount += parseInt(item["PYMT_CHGAMNT"] ?? 0);
        existingRow.totalCard += parseInt(item["PYMT_CHGAMNT"] ?? 0);
      } else if (item["Debit Amount"]) {
        existingRow.amount += parseInt(item["Debit Amount"] ?? 0);
        existingRow.totalSodexo += parseInt(item["Debit Amount"] ?? 0);
      } else if (item["amount"]) {
        existingRow.amount += parseInt(item["amount"].replaceAll("'", "") ?? 0);
        existingRow.totalPaytm += parseInt(
          item["amount"].replaceAll("'", "") ?? 0
        );
      }
      return;
    }

    const digitalPaymentKey = bank_mid || paytm_mid;

    const bank_tid = digitalPayments[digitalPaymentKey]?.bank_mid;

    let existingRow = acc.find(
      (row) => row.date === formattedDate && row.bank_tid === bank_tid
    );

    if (!existingRow) {
      existingRow = {
        bank_mid: digitalPayments[digitalPaymentKey]?.bank_mid,
        bank_tid: bank_tid,
        pluxe_outlet_id,
        date: formattedDate,
        amount: 0,
        totalUPI: 0,
        totalCard: 0,
        totalSodexo: 0,
        totalPaytm: 0,
        paytm_tid: digitalPayments[digitalPaymentKey]?.payment_tid ?? null,
        store_id: digitalPayments[digitalPaymentKey]?.store_id ?? null,
        outlet_name:
          digitalPayments[digitalPaymentKey]?.outlet_name ?? "Not Found",
      };
      acc.push(existingRow);
    }

    // Handle different amount fields
    if (item["Transaction Amount"] && item["CRDR"] === "CR") {
      existingRow.amount += parseInt(item["Transaction Amount"] ?? 0);
      existingRow.totalUPI += parseInt(item["Transaction Amount"] ?? 0);
    } else if (item["PYMT_CHGAMNT"]) {
      existingRow.amount += parseInt(item["PYMT_CHGAMNT"] ?? 0);
      existingRow.totalCard += parseInt(item["PYMT_CHGAMNT"] ?? 0);
    } else if (item["Debit Amount"]) {
      existingRow.amount += parseInt(item["Debit Amount"] ?? 0);
      existingRow.totalSodexo += parseInt(item["Debit Amount"] ?? 0);
    } else if (item["amount"]) {
      existingRow.amount += parseInt(item["amount"].replaceAll("'", "") ?? 0);
      existingRow.totalPaytm += parseInt(
        item["amount"].replaceAll("'", "") ?? 0
      );
    }
  });

  const accModifed = acc.map((item) => {
    const actualUpiVal = mappedEbooks[item.paytm_tid]?.reduce(
      (acc, item) => acc + item.hdur,
      0
    );
    const actualCardVal = mappedEbooks[item.paytm_tid]?.reduce(
      (acc, item) => acc + item.hfpp,
      0
    );
    const actualPaytmVal = mappedEbooks[item.paytm_tid]?.reduce(
      (acc, item) => acc + item.ppbl,
      0
    );
    const upiDifference = item.totalUPI - actualUpiVal;
    const cardDifference = item.totalCard - actualCardVal;
    const paytmDifference = item.totalPaytm - actualPaytmVal;

    return {
      ...item,
      totalCard: wrappedCurrencyFormatter(parseInt(item.totalCard)),
      totalUPI: wrappedCurrencyFormatter(parseInt(item.totalUPI)),
      totalSodexo: wrappedCurrencyFormatter(parseInt(item.totalSodexo)),
      totalPaytm: wrappedCurrencyFormatter(item.totalPaytm),
      amount: wrappedCurrencyFormatter(parseInt(item.amount)),
      upiDifference: getWrappedValue(upiDifference),
      cardDifference: getWrappedValue(cardDifference),
      paytmDifference: getWrappedValue(paytmDifference),
    };
  });

  const sodexoListModified = sodexoList.map((item) => {
    const actualSodexoVal = mappedEbooks[item.pluxe_outlet_id]?.reduce(
      (acc, item) => acc + item.sedc,
      0
    );
    const sodexoDifference = item.totalSodexo - actualSodexoVal;

    return {
      ...item,
      totalCard: wrappedCurrencyFormatter(parseInt(item.totalCard)),
      totalUPI: wrappedCurrencyFormatter(parseInt(item.totalUPI)),
      totalSodexo: wrappedCurrencyFormatter(parseInt(item.totalSodexo)),
      totalPaytm: wrappedCurrencyFormatter(item.totalPaytm),
      amount: wrappedCurrencyFormatter(parseInt(item.amount)),
      sodexoDifference: getWrappedValue(sodexoDifference),
      actualSodexoVal,
    };
  });

  return { list: accModifed, sodexoList: sodexoListModified };
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
      let date;

      if (result.data[0]["transaction_date"]) {
        date = moment(
          result.data[0]["transaction_date"].replaceAll("'", ""),
          "DD-MM-YYYY hh:mm:ss"
        );
      } else {
        date = moment(
          result.data[0]["Transaction Req Date"] ||
            result.data[0]["CHG_DATE"] ||
            result.data[0]["Transaction Date"]
        );
      }

      setSelectedDate(date);
    }

    setParsedData(result);
    toast.success(`Successfully imported ${result.totalRows} rows`);
  } catch (error) {
    console.error(error);
    toast.error(error.message);
  }
};
