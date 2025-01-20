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
import {
  modifyEpaymentData,
  parseReconciliationFile,
} from "../../util/reconciliations";

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

  const rows = useMemo(
    () =>
      modifyEpaymentData(
        upiParsedData,
        cardParsedData,
        digitalPayments,
        mappedEbooks
      ),
    [upiParsedData?.data, cardParsedData?.data, digitalPayments, mappedEbooks]
  );

  const onUpiFileChange = (file) => {
    if (file) {
      setUpiFile(file);
      parseReconciliationFile(file, setUpiParsedData, setSelectedDate, [
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
      parseReconciliationFile(file, setCardParsedData, setSelectedDate, [
        "MECODE",
        "CHG_DATE",
        "PYMT_NETAMNT",
        "TERMINAL_NO",
      ]);
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
