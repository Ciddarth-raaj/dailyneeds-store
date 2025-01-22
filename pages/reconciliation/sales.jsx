import React, { useEffect, useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import FileUpload from "../../components/FileUpload";
import JSZip from "jszip";
import { importFileToJSON, isValidFileType } from "../../util/fileImport";
import toast from "react-hot-toast";
import Table from "../../components/table/table";
import EmptyData from "../../components/EmptyData";
import currencyFormatter from "../../util/currencyFormatter";
import moment from "moment";
import useSalesByStore from "../../customHooks/useSalesByStore";
import { Button } from "@chakra-ui/button";
import { Flex } from "@chakra-ui/react";
import { saveReconciliation } from "../../helper/reconciliation";

const REQUIRED_LOYALTY_HEADERS = [
  "Bill Date",
  "Outlet Name",
  "Loyalty",
  "Cash Sales",
];
const REQUIRED_SALES_RETURN_HEADERS = [
  "Outlet Name",
  "Tran Date",
  "Sales Return Amt",
];

function Sales() {
  const [file, setFile] = useState(null);
  const [salesReturnFile, setSalesReturnFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [parsedSalesReturnData, setParsedSalesReturnData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const filters = useMemo(() => {
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      from_date: endOfDay,
      to_date: endOfDay,
    };
  }, [selectedDate]);

  const {
    loading: salesLoading,
    getStoreSummary,
    reset,
  } = useSalesByStore(filters, setSelectedDate);
  const storeSummary = getStoreSummary();

  const HEADERS = {
    "Bill Date": "Bill Date",
    "Outlet Name": "Outlet Name",
    "Total Sales": "Total Sales",
    Loyalty: "Loyalty",
    "Sales Return": "Sales Return",
    "Loyalty Difference": (
      <span>
        Loyalty <i className="fa fa-plus-minus" style={{ fontSize: "10px" }} />
      </span>
    ),
    "Total Sales Difference": (
      <span>
        Total Sales{" "}
        <i className="fa fa-plus-minus" style={{ fontSize: "10px" }} />
      </span>
    ),
    "Sales Return Difference": (
      <span>
        Sales Return{" "}
        <i className="fa fa-plus-minus" style={{ fontSize: "10px" }} />
      </span>
    ),
  };

  useEffect(() => {
    if (parsedData?.data?.length > 0) {
      setSelectedDate(new Date(parsedData?.data[0]["Bill Date"]));
    }
  }, [parsedData]);

  const mapData = (item, noFormat = false) => {
    const itemBillAmt = parseInt(item["Bill Amt"] || 0);
    const itemLoyalty = parseInt(item["Loyalty"] || 0);
    const actualBillAmt = storeSummary[item["Outlet Name"]]?.total_sales ?? 0;
    const actualItemLoyalty = storeSummary[item["Outlet Name"]]?.loyalty ?? 0;
    const storeId = storeSummary[item["Outlet Name"]]?.store_id;

    const salesObject = parsedSalesReturnData?.data?.find(
      (salesReturn) => salesReturn["Outlet Name"] === item["Outlet Name"]
    );
    const salesReturn = salesObject
      ? parseInt(salesObject["Sales Return Amt"])
      : null;
    const actualSalesReturn =
      storeSummary[item["Outlet Name"]]?.sales_return ?? 0;

    let salesDifference = itemBillAmt - actualBillAmt;
    let loyaltyDifference = itemLoyalty - actualItemLoyalty;
    let salesReturnDifference = salesReturn
      ? salesReturn - actualSalesReturn
      : "-";

    if (salesDifference >= -5 && salesDifference <= 5) {
      salesDifference = 0;
    }

    if (loyaltyDifference >= -5 && loyaltyDifference <= 5) {
      loyaltyDifference = 0;
    }

    if (
      salesReturn &&
      salesReturnDifference >= -5 &&
      salesReturnDifference <= 5
    ) {
      salesReturnDifference = 0;
    }

    const getWrappedValue = (value) => {
      if (noFormat) {
        return value;
      }

      return value ? (
        <span
          style={{
            color: value >= 0 ? "green" : "red",
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

    return {
      storeId,
      "Bill Date": moment(item["Bill Date"]).format("DD-MM-YYYY"),
      "Outlet Name": item["Outlet Name"]
        .replace("DailyNeeds-", "")
        .replace("Dailyneeds-", ""),
      "Total Sales": wrappedCurrencyFormatter(actualBillAmt),
      Loyalty: wrappedCurrencyFormatter(actualItemLoyalty),
      "Total Sales Difference": getWrappedValue(salesDifference),
      "Loyalty Difference": getWrappedValue(loyaltyDifference),
      "Sales Return Difference":
        salesReturnDifference === "-"
          ? "-"
          : getWrappedValue(salesReturnDifference),
      "Sales Return": salesReturn ? wrappedCurrencyFormatter(salesReturn) : "-",
    };
  };

  const rows = useMemo(() => {
    if (!parsedData?.data) return [];

    return parsedData?.data
      .filter((item) => item["Bill Date"] && item["Outlet Name"])
      .map((item) => mapData(item));
  }, [parsedData, storeSummary, parsedSalesReturnData]);

  const readZipFile = async (file, setParsedData, requiredHeaders) => {
    if (!file) return;

    try {
      setLoading(true);
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

      for (const file of files) {
        await parseFile(file.content, setParsedData, requiredHeaders);
      }
    } catch (error) {
      toast.error(error.message);
      console.error("Error reading zip file:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    readZipFile(file, setParsedData, REQUIRED_LOYALTY_HEADERS);
  }, [file]);

  useEffect(() => {
    readZipFile(
      salesReturnFile,
      setParsedSalesReturnData,
      REQUIRED_SALES_RETURN_HEADERS
    );
  }, [salesReturnFile]);

  const parseFile = async (file, setParsedData, validateHeaders = []) => {
    if (!isValidFileType(file)) {
      throw new Error("Invalid file type");
    }

    const result = await importFileToJSON(file, validateHeaders);
    setParsedData(result);
    toast.success(`Successfully imported ${result.totalRows} rows`);
  };

  const onFileChange = (file) => {
    setFile(file);
    setParsedData(null);
    reset();
  };

  const onSalesReturnFileChange = (file) => {
    setSalesReturnFile(file);
  };

  const handleSave = () => {
    if (!parsedData?.data) return [];

    const data = parsedData?.data
      .filter((item) => item["Bill Date"] && item["Outlet Name"])
      .map((item) => mapData(item, true))
      .filter((item) => item["storeId"])
      .map((item) => ({
        store_id: item.storeId,
        sales_diff: item["Total Sales Difference"],
        loyalty_diff: item["Loyalty Difference"],
        return_diff: item["Sales Return Difference"],
        bill_date: new Date(item["Bill Date"].split("-").reverse().join("-")),
      }));

    toast.promise(Promise.all(data.map((item) => saveReconciliation(item))), {
      loading: "Saving Differences",
      success: () => "Differences saved successfully",
      error: (err) => {
        console.log(err);
        return "Failed to save differences";
      },
    });
  };

  return (
    <GlobalWrapper>
      <CustomContainer title="Sales Reconciliation" filledHeader>
        <Flex gap={4}>
          <FileUpload
            value={file}
            onChange={onFileChange}
            accept="zip,application/octet-stream,application/zip,application/x-zip,application/x-zip-compressed"
            maxSize={5242880}
            disabled={loading}
            placeholderText={
              <span>
                Drag & drop a{" "}
                <span
                  style={{
                    color: "var(--chakra-colors-purple-500)",
                    fontWeight: "600",
                  }}
                >
                  Loyalty and Total Sales
                </span>{" "}
                file here, or click to select
              </span>
            }
          />

          <FileUpload
            value={salesReturnFile}
            onChange={onSalesReturnFileChange}
            accept="zip,application/octet-stream,application/zip,application/x-zip,application/x-zip-compressed"
            maxSize={5242880}
            disabled={loading}
            placeholderText={
              <span>
                Drag & drop a{" "}
                <span
                  style={{
                    color: "var(--chakra-colors-purple-500)",
                    fontWeight: "600",
                  }}
                >
                  Sales Return
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
          {file && parsedData?.data ? (
            <Table heading={HEADERS} rows={rows ?? []} />
          ) : (
            <EmptyData message="Import data to continue" />
          )}
        </CustomContainer>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Sales;
