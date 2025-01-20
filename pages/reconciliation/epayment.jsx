import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import FileUpload from "../../components/FileUpload";
import { Box, Button, Flex } from "@chakra-ui/react";
import { importFileToJSON, isValidFileType } from "../../util/fileImport";
import toast from "react-hot-toast";
import moment from "moment";
import Table from "../../components/table/table";
import currencyFormatter from "../../util/currencyFormatter";
import { useAccounts } from "../../customHooks/useAccounts";
import useDigitalPayments from "../../customHooks/useDigitalPayments";
import EmptyData from "../../components/EmptyData";

const HEADINGS = {
  bank_mid: "Bank MID",
  date: "Date",
  outlet_name: "Outlet",
  totalUPI: "Total UPI",
  totalCard: "Total Card",
  upiDifference: (
    <span>
      Total UPI <i className="fa fa-plus-minus" style={{ fontSize: "10px" }} />
    </span>
  ),
  cardDifference: (
    <span>
      Total Card <i className="fa fa-plus-minus" style={{ fontSize: "10px" }} />
    </span>
  ),
};

function Epayment() {
  const [upiFile, setUpiFile] = useState(null);
  const [cardFile, setCardFile] = useState(null);
  const [upiParsedData, setUpiParsedData] = useState(null);
  const [cardParsedData, setCardParsedData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const filters = useMemo(() => {
    if (!selectedDate) return null;

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, [selectedDate]);

  const { mappedEbooks } = useAccounts(filters);
  const { mappedData: digitalPayments } = useDigitalPayments();

  const modifedData = (noFormat = false) => {
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

  const rows = useMemo(
    () => modifedData(),
    [upiParsedData?.data, cardParsedData?.data, digitalPayments, mappedEbooks]
  );

  const onUpiFileChange = (file) => {
    if (file) {
      setUpiFile(file);
      parseFile(file, setUpiParsedData, [
        "EXTERNAL MID",
        "EXTERNAL TID",
        "Transaction Req Date",
        "Transaction Amount",
      ]);
    }
  };

  const onCardFileChange = (file) => {
    if (file) {
      setCardFile(file);
      parseFile(file, setCardParsedData, [
        "MECODE",
        "CHG_DATE",
        "PYMT_NETAMNT",
        "TERMINAL_NO",
      ]);
    }
  };

  const parseFile = async (file, setParsedData, requiredHeaders = []) => {
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

  return (
    <GlobalWrapper>
      <CustomContainer title="E-Payment Reconciliation" filledHeader>
        <Flex gap="22px">
          <FileUpload
            width="25%"
            value={upiFile}
            onChange={onUpiFileChange}
            accept=".xlsx,.xls,.csv"
            maxSize={5242880}
            placeholderText={
              <span>
                Drag & drop a{" "}
                <span
                  style={{
                    color: "var(--chakra-colors-purple-500)",
                    fontWeight: "600",
                  }}
                >
                  UPI
                </span>{" "}
                file here, or click to select
              </span>
            }
          />

          <FileUpload
            width="25%"
            value={cardFile}
            onChange={onCardFileChange}
            accept=".xlsx,.xls,.csv"
            maxSize={5242880}
            placeholderText={
              <span>
                Drag & drop a{" "}
                <span
                  style={{
                    color: "var(--chakra-colors-purple-500)",
                    fontWeight: "600",
                  }}
                >
                  Card Payment
                </span>{" "}
                file here, or click to select
              </span>
            }
          />

          <FileUpload
            width="25%"
            value={cardFile}
            onChange={onCardFileChange}
            accept=".xlsx,.xls,.csv"
            maxSize={5242880}
            placeholderText={
              <span>
                Drag & drop a{" "}
                <span
                  style={{
                    color: "var(--chakra-colors-purple-500)",
                    fontWeight: "600",
                  }}
                >
                  Card Payment
                </span>{" "}
                file here, or click to select
              </span>
            }
          />

          <FileUpload
            width="25%"
            value={cardFile}
            onChange={onCardFileChange}
            accept=".xlsx,.xls,.csv"
            maxSize={5242880}
            placeholderText={
              <span>
                Drag & drop a{" "}
                <span
                  style={{
                    color: "var(--chakra-colors-purple-500)",
                    fontWeight: "600",
                  }}
                >
                  Card Payment
                </span>{" "}
                file here, or click to select
              </span>
            }
          />
        </Flex>

        <CustomContainer
          title="Imported Data"
          style={{ marginTop: "22px" }}
          smallHeader
          rightSection={<Button colorScheme="purple">Save</Button>}
        >
          {rows.length > 0 ? (
            <Table variant="plain" heading={HEADINGS} rows={rows} />
          ) : (
            <EmptyData message="Import data to continue" />
          )}
        </CustomContainer>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Epayment;
