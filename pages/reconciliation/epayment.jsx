import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import FileUpload from "../../components/FileUpload";
import { Button, Flex } from "@chakra-ui/react";
import { isValidFileType } from "../../util/fileImport";
import toast from "react-hot-toast";
import Table from "../../components/table/table";
import { useAccounts } from "../../customHooks/useAccounts";
import useDigitalPayments from "../../customHooks/useDigitalPayments";
import EmptyData from "../../components/EmptyData";
import {
  modifyEpaymentData,
  parseReconciliationFile,
} from "../../util/reconciliations";
import JSZip from "jszip";
import {
  deleteReconciliationEpayment,
  saveReconciliationEpayment,
} from "../../helper/reconciliation";
import moment from "moment";

const HEADINGS = {
  bank_mid: "Bank MID",
  date: "Date",
  outlet_name: "Outlet",
  totalUPI: "Total UPI",
  totalCard: "Total Card",
  // totalSodexo: "Total Sodexo",
  totalPaytm: "Total Paytm",
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
  // sodexoDifference: (
  //   <span>
  //     Total Sodexo{" "}
  //     <i className="fa fa-plus-minus" style={{ fontSize: "10px" }} />
  //   </span>
  // ),
  paytmDifference: (
    <span>
      Total Paytm{" "}
      <i className="fa fa-plus-minus" style={{ fontSize: "10px" }} />
    </span>
  ),
};

const SODEXO_HEADINGS = {
  date: "Date",
  outlet_name: "Outlet",
  totalSodexo: "Total Sodexo",
  sodexoDifference: (
    <span>
      Total Sodexo{" "}
      <i className="fa fa-plus-minus" style={{ fontSize: "10px" }} />
    </span>
  ),
};

function Epayment() {
  const [upiFile, setUpiFile] = useState(null);
  const [cardFile, setCardFile] = useState(null);
  const [sudexoFile, setSudexoFile] = useState(null);
  const [paytmFile, setPaytmFile] = useState(null);
  const [upiParsedData, setUpiParsedData] = useState(null);
  const [cardParsedData, setCardParsedData] = useState(null);
  const [sudexoParsedData, setSudexoParsedData] = useState(null);
  const [paytmParsedData, setPaytmParsedData] = useState(null);

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

  const rows = useMemo(() => {
    return modifyEpaymentData(
      upiParsedData,
      cardParsedData,
      digitalPayments,
      mappedEbooks,
      sudexoParsedData,
      paytmParsedData
    );
  }, [
    upiParsedData?.data,
    cardParsedData?.data,
    sudexoParsedData?.data,
    paytmParsedData?.data,
    digitalPayments,
    mappedEbooks,
  ]);

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

  const onSudexoFileChange = (file) => {
    if (file) {
      setSudexoFile(file);
      parseReconciliationFile(file, setSudexoParsedData, setSelectedDate, [
        "Outlet Name",
        "Transaction Date",
        "Debit Amount",
        "MID",
      ]);
    }
  };

  const onPaytmFileChange = async (file) => {
    if (file) {
      setPaytmFile(file);
      const unzipedFile = await readZipFile(file);

      unzipedFile.forEach((item) => {
        if (!isValidFileType(item)) {
          return;
        }

        parseReconciliationFile(
          item.content,
          setPaytmParsedData,
          setSelectedDate,
          ["original_mid", "transaction_date", "amount"]
        );
      });
    }
  };

  const readZipFile = async (file) => {
    if (!file) return;

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);

      // Process each file in the zip
      const filePromises = [];
      contents.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir) {
          const promise = zipEntry
            .async("blob")
            .then((blob) => {
              // Convert blob to File object
              return new File([blob], relativePath, {
                type: blob.type || "application/octet-stream",
              });
            })
            .then((fileContent) => ({
              name: relativePath,
              content: fileContent,
            }));
          filePromises.push(promise);
        }
      });

      const files = await Promise.all(filePromises);

      return files;
    } catch (error) {
      toast.error(error.message);
      console.error("Error reading zip file:", error);
      return [];
    }
  };

  const getSodexoByMID = (sodexoList, bank_mid) => {
    return sodexoList.find((item) => item.bank_mid == bank_mid);
  };

  const handleSave = () => {
    const dateStr = moment(selectedDate).format("YYYY-MM-DD");

    const { list, sodexoList } = modifyEpaymentData(
      upiParsedData,
      cardParsedData,
      digitalPayments,
      mappedEbooks,
      sudexoParsedData,
      paytmParsedData,
      true
    );

    const modifiedList = list.map((item) => {
      return {
        bill_date: moment(item.date, "DD-MM-YYYY").format("YYYY-MM-DD"),
        card_diff: cardFile ? item.cardDifference : null,
        upi_diff: upiFile ? item.upiDifference : null,
        sodexo_diff: sudexoFile ? item.sodexoDifference : null,
        paytm_diff: paytmFile ? item.paytmDifference : null,
        store_id: item.store_id,
        paytm_tid: item.paytm_tid,
      };
    });

    sodexoList.forEach((item) => {
      const insertedRow = modifiedList.find(
        (listItem) => listItem.paytm_tid === item.paytm_tid
      );

      if (insertedRow) {
        insertedRow.sodexo_diff = item.sodexoDifference;
      } else {
        modifiedList.push({
          bill_date: moment(item.date, "DD-MM-YYYY").format("YYYY-MM-DD"),
          card_diff: null,
          upi_diff: null,
          sodexo_diff: sudexoFile ? item.sodexoDifference : null,
          paytm_diff: null,
          store_id: item.store_id,
          paytm_tid: item.paytm_tid,
        });
      }
    });

    console.log(modifiedList);

    toast.promise(
      Promise.all([
        deleteReconciliationEpayment(dateStr),
        modifiedList.map((item) => saveReconciliationEpayment(item)),
      ]),
      {
        loading: "Saving Differences",
        success: (response) => {
          let success = 0;
          let fail = 0;

          response.forEach((item) => {
            if (item.code === 200) {
              success += 1;
            } else {
              fail += 1;
            }
          });
          return ` ${success} Differences saved successfully${
            fail > 0 ? `, ${fail} Difference failed to save` : ""
          }`;
        },
        error: (err) => {
          console.log(err);
          return "Failed to save differences";
        },
      }
    );
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
            value={sudexoFile}
            onChange={onSudexoFileChange}
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
                  Sodexo Payment
                </span>{" "}
                file here, or click to select
              </span>
            }
          />

          <FileUpload
            width="25%"
            value={paytmFile}
            onChange={onPaytmFileChange}
            accept="zip,application/octet-stream,application/zip,application/x-zip,application/x-zip-compressed"
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
                  Paytm Payment
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
          rightSection={
            <Button colorScheme="purple" onClick={handleSave}>
              Save
            </Button>
          }
        >
          <CustomContainer title="EPayments" filledHeader smallHeader>
            {rows?.list?.length > 0 ? (
              <Table
                variant="plain"
                heading={HEADINGS}
                rows={rows?.list ?? []}
              />
            ) : (
              <EmptyData message="Import data to continue" />
            )}
          </CustomContainer>

          <CustomContainer title="Sodexo" filledHeader smallHeader>
            {rows?.sodexoList?.length > 0 ? (
              <Table
                variant="plain"
                heading={SODEXO_HEADINGS}
                rows={rows?.sodexoList ?? []}
              />
            ) : (
              <EmptyData message="Import data to continue" />
            )}
          </CustomContainer>
        </CustomContainer>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Epayment;
