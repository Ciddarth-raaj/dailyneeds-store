import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import FileUpload from "../../components/FileUpload";
import { Flex } from "@chakra-ui/react";
import { importFileToJSON, isValidFileType } from "../../util/fileImport";
import toast from "react-hot-toast";
import moment from "moment";

function Epayment() {
  const [upiFile, setUpiFile] = useState(null);
  const [cardFile, setCardFile] = useState(null);
  const [upiParsedData, setUpiParsedData] = useState(null);
  const [cardParsedData, setCardParsedData] = useState(null);

  const rows = useMemo(() => {
    const combinedRows = [
      ...(upiParsedData?.data ?? []),
      ...(cardParsedData?.data ?? []),
    ];

    return (
      combinedRows.reduce((acc, item) => {
        const date = moment(
          item["Transaction Req Date"] || item["CHG_DATE"]
        ).format("YYYY-MM-DD");
        const bank_mid = item["EXTERNAL MID"] || item["MECODE"];
        const existingRow = acc.find(
          (row) => row.date === date && row.bank_mid === bank_mid
        );

        if (existingRow) {
          if (item["Transaction Amount"]) {
            existingRow.amount += parseFloat(item["Transaction Amount"] ?? 0);
            existingRow.totalUPI += parseFloat(item["Transaction Amount"] ?? 0);
          } else if (item["PYMT_NETAMNT"]) {
            existingRow.amount += parseFloat(item["PYMT_NETAMNT"] ?? 0);
            existingRow.totalCard += parseFloat(item["PYMT_NETAMNT"] ?? 0);
          }
        } else {
          acc.push({
            bank_mid: bank_mid,
            bank_tid: item["EXTERNAL TID"],
            date: date,
            amount: parseFloat(
              item["Transaction Amount"] || item["PYMT_NETAMNT"] || 0
            ),
            totalUPI: parseFloat(item["Transaction Amount"] || 0),
            totalCard: parseFloat(item["PYMT_NETAMNT"] || 0),
          });
        }
        return acc;
      }, []) ?? []
    );
  }, [upiParsedData, cardParsedData]);

  console.log("CIDD", rows);

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
      ]);
    }
  };

  const parseFile = async (file, setParsedData, requiredHeaders = []) => {
    try {
      if (!isValidFileType(file)) {
        throw new Error("Invalid file type");
      }

      const result = await importFileToJSON(file, requiredHeaders, 1);
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
        <Flex gap="12px">
          <FileUpload
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
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Epayment;
