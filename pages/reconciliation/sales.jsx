import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Flex,
  Radio,
  RadioGroup,
  Stack,
  Text,
} from "@chakra-ui/react";
import Papa from "papaparse";
import { saveReconciliation } from "../../helper/reconciliation";
import {
  POS_FORMAT,
  computeDifferences,
  matchOutlets,
  parseRetailPilotRows,
  retailPilotSaveBlockers,
} from "../../util/salesReconciliation";

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

// The reports carry paise ("679.50"), and the sales figures they are compared
// against are read with parseFloat — parseInt on this side silently dropped the
// decimals and made the two halves of the comparison disagree.
const parseAmount = (value) => {
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? amount : 0;
};

const ZIP_ACCEPT =
  "zip,application/octet-stream,application/zip,application/x-zip,application/x-zip-compressed";
// Windows reports .csv as application/vnd.ms-excel.
const CSV_ACCEPT = ".csv,text/csv,application/vnd.ms-excel";

const readCsvRows = (file) =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => resolve(results.data),
      error: (error) => reject(new Error(`CSV parsing error: ${error}`)),
    });
  });

function Sales() {
  const [posFormat, setPosFormat] = useState(POS_FORMAT.RETAIL_PILOT);
  const isRetailPilot = posFormat === POS_FORMAT.RETAIL_PILOT;
  const [retailPilotFile, setRetailPilotFile] = useState(null);
  const [retailPilotParsed, setRetailPilotParsed] = useState(null);
  const retailPilotRead = useRef(0);
  const [saving, setSaving] = useState(false);
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
    error: salesError,
    loadedFilters,
    getStoreSummary,
    reset,
  } = useSalesByStore(filters, setSelectedDate);
  const storeSummary = useMemo(() => getStoreSummary(), [getStoreSummary]);
  const salesLoadedForDate = loadedFilters === filters;

  // Retail Pilot rows already carry the Gofrugal field names, so the one file
  // stands in for both Gofrugal reports below.
  const retailPilotData = useMemo(
    () => (retailPilotParsed?.ok ? { data: retailPilotParsed.data } : null),
    [retailPilotParsed]
  );
  const importData = isRetailPilot ? retailPilotData : parsedData;
  const salesReturnData = isRetailPilot
    ? retailPilotData
    : parsedSalesReturnData;

  const outletMatch = useMemo(() => {
    if (!retailPilotParsed?.ok || !salesLoadedForDate) return null;
    return matchOutlets(
      retailPilotParsed.data.map((item) => item["Outlet Name"]),
      Object.keys(storeSummary)
    );
  }, [retailPilotParsed, storeSummary, salesLoadedForDate]);

  const saveBlockers = isRetailPilot
    ? retailPilotSaveBlockers({
        parsed: retailPilotParsed,
        salesLoading,
        salesError,
        salesLoadedForDate,
        match: outletMatch,
      })
    : [];

  const dndsOutletsMissingFromFile = useMemo(() => {
    if (!outletMatch) return [];
    const matched = Object.values(outletMatch.matches);
    return Object.keys(storeSummary).filter((name) => !matched.includes(name));
  }, [outletMatch, storeSummary]);

  const HEADERS = {
    "Bill Date": "Bill Date",
    "Outlet Name": "Outlet Name",
    "Total Sales": isRetailPilot ? "DnDS Total Sales" : "Total Sales",
    Loyalty: isRetailPilot ? "DnDS Loyalty" : "Loyalty",
    "Sales Return": isRetailPilot ? "Retail Pilot Sales Return" : "Sales Return",
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
    if (!isRetailPilot && parsedData?.data?.length > 0) {
      setSelectedDate(new Date(parsedData?.data[0]["Bill Date"]));
    }
  }, [parsedData]);

  const mapData = (item, noFormat = false) => {
    // Gofrugal outlet names are DnDS outlet names verbatim; Retail Pilot ones
    // go through the normalised match, and an unmatched one has no figures.
    const dndsOutletName = isRetailPilot
      ? outletMatch?.matches?.[item["Outlet Name"]] ?? null
      : item["Outlet Name"];
    const summary = dndsOutletName ? storeSummary[dndsOutletName] : undefined;

    const itemBillAmt = parseAmount(item["Bill Amt"]);
    const itemLoyalty = parseAmount(item["Loyalty"]);
    const actualBillAmt = summary?.total_sales ?? 0;
    const actualItemLoyalty = summary?.loyalty ?? 0;
    const storeId = summary?.store_id;

    const salesObject = salesReturnData?.data?.find(
      (salesReturn) => salesReturn["Outlet Name"] === item["Outlet Name"]
    );
    // null means "no sales return file / no row for this outlet", which is not
    // the same as a return of zero — only the former should read as a blank.
    const salesReturn = salesObject
      ? parseAmount(salesObject["Sales Return Amt"])
      : null;
    const actualSalesReturn = summary?.sales_return ?? 0;

    const { salesDifference, loyaltyDifference, salesReturnDifference } =
      computeDifferences({
        billAmt: itemBillAmt,
        loyalty: itemLoyalty,
        salesReturn,
        dndsTotalSales: actualBillAmt,
        dndsLoyalty: actualItemLoyalty,
        dndsSalesReturn: actualSalesReturn,
      });

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

    const billDate = moment(item["Bill Date"]).format("DD-MM-YYYY");

    if (isRetailPilot && !summary) {
      return {
        storeId: undefined,
        "Bill Date": billDate,
        "Outlet Name": noFormat ? (
          item["Outlet Name"]
        ) : (
          <span style={{ color: "red", fontWeight: "bold" }}>
            {item["Outlet Name"]} (not matched)
          </span>
        ),
        "Total Sales": "-",
        Loyalty: "-",
        "Total Sales Difference": "-",
        "Loyalty Difference": "-",
        "Sales Return Difference": "-",
        "Sales Return": wrappedCurrencyFormatter(salesReturn),
      };
    }

    return {
      storeId,
      "Bill Date": billDate,
      "Outlet Name":
        isRetailPilot && !noFormat ? (
          <span>
            {item["Outlet Name"]}{" "}
            <span style={{ color: "var(--chakra-colors-gray-500)" }}>
              ({dndsOutletName})
            </span>
          </span>
        ) : (
          item["Outlet Name"]
            .replace("DailyNeeds-", "")
            .replace("Dailyneeds-", "")
        ),
      "Total Sales": wrappedCurrencyFormatter(actualBillAmt),
      Loyalty: wrappedCurrencyFormatter(actualItemLoyalty),
      "Total Sales Difference": getWrappedValue(salesDifference),
      "Loyalty Difference": getWrappedValue(loyaltyDifference),
      "Sales Return Difference":
        salesReturnDifference === "-"
          ? "-"
          : getWrappedValue(salesReturnDifference),
      "Sales Return":
        salesReturn === null ? "-" : wrappedCurrencyFormatter(salesReturn),
    };
  };

  const rows = useMemo(() => {
    if (!importData?.data) return [];

    return importData.data
      .filter((item) => item["Bill Date"] && item["Outlet Name"])
      .map((item) => mapData(item));
  }, [importData, storeSummary, salesReturnData, outletMatch, isRetailPilot]);

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

  // Switching format starts over: nothing imported in one format may be
  // compared or saved under the other.
  const onPosFormatChange = (format) => {
    retailPilotRead.current += 1;
    setPosFormat(format);
    setFile(null);
    setSalesReturnFile(null);
    setParsedData(null);
    setParsedSalesReturnData(null);
    setRetailPilotFile(null);
    setRetailPilotParsed(null);
    reset();
  };

  const onRetailPilotFileChange = async (file) => {
    const read = ++retailPilotRead.current;
    setRetailPilotFile(file);
    setRetailPilotParsed(null);
    reset();
    if (!file) return;

    let result;
    if (file.name.split(".").pop().toLowerCase() !== "csv") {
      result = {
        ok: false,
        errors: ["The Retail Pilot export must be a .csv file."],
        date: null,
        data: [],
      };
    } else {
      try {
        result = parseRetailPilotRows(await readCsvRows(file));
      } catch (error) {
        result = { ok: false, errors: [error.message], date: null, data: [] };
      }
    }
    // A newer upload (or a format switch) has replaced this file meanwhile.
    if (read !== retailPilotRead.current) return;

    setRetailPilotParsed(result);
    if (result.ok) {
      setSelectedDate(moment(result.date, "YYYY-MM-DD").toDate());
      toast.success(
        `Imported ${result.data.length} outlet(s) for ${moment(
          result.date,
          "YYYY-MM-DD"
        ).format("DD-MM-YYYY")}`
      );
    } else {
      toast.error("The Retail Pilot file could not be imported");
    }
  };

  const handleSave = async () => {
    if (saving) return;
    if (isRetailPilot && saveBlockers.length > 0) {
      toast.error(saveBlockers[0]);
      return;
    }
    if (salesLoading || !salesLoadedForDate) {
      toast.error("DnDS sales are still loading — try again in a moment");
      return;
    }
    if (salesError) {
      toast.error(`DnDS sales could not be loaded: ${salesError}`);
      return;
    }
    if (!importData?.data) return;

    const mapped = importData.data
      .filter((item) => item["Bill Date"] && item["Outlet Name"])
      .map((item) => mapData(item, true));

    const data = mapped
      .filter((item) => item["storeId"])
      .map((item) => ({
        store_id: item.storeId,
        sales_diff: item["Total Sales Difference"],
        loyalty_diff: item["Loyalty Difference"],
        return_diff: item["Sales Return Difference"],
        bill_date: new Date(item["Bill Date"].split("-").reverse().join("-")),
      }));

    // Rows whose outlet has no matching store are dropped here. Saving nothing
    // at all used to still report success.
    if (data.length === 0) {
      toast.error(
        "No outlet in the file could be matched to a store — nothing was saved"
      );
      return;
    }

    const skipped = mapped.length - data.length;
    if (skipped > 0) {
      toast.error(
        `${skipped} outlet(s) could not be matched to a store and were skipped`
      );
    }

    setSaving(true);
    const toastId = toast.loading("Saving Differences");
    const results = await Promise.allSettled(
      data.map((item) => saveReconciliation(item))
    );
    setSaving(false);

    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length === 0) {
      toast.success(`Saved differences for ${data.length} outlet(s)`, {
        id: toastId,
      });
    } else {
      console.log(failed.map((result) => result.reason));
      toast.error(
        `Failed to save differences for ${failed.length} of ${
          data.length
        } outlet(s): ${failed[0].reason?.message}`,
        { id: toastId }
      );
    }
  };

  const purpleLabel = (label) => (
    <span
      style={{
        color: "var(--chakra-colors-purple-500)",
        fontWeight: "600",
      }}
    >
      {label}
    </span>
  );

  return (
    <GlobalWrapper>
      <CustomContainer title="Sales Reconciliation" filledHeader>
        <RadioGroup
          value={posFormat}
          onChange={onPosFormatChange}
          isDisabled={loading || saving}
          mb={4}
        >
          <Stack direction="row" spacing={6}>
            <Text fontWeight="600">POS format</Text>
            <Radio value={POS_FORMAT.RETAIL_PILOT} colorScheme="purple">
              Retail Pilot
            </Radio>
            <Radio value={POS_FORMAT.GOFRUGAL} colorScheme="purple">
              Gofrugal (Legacy)
            </Radio>
          </Stack>
        </RadioGroup>

        {isRetailPilot ? (
          <FileUpload
            value={retailPilotFile}
            onChange={onRetailPilotFileChange}
            accept={CSV_ACCEPT}
            maxSize={5242880}
            disabled={saving}
            placeholderText={
              <span>
                {purpleLabel("Upload Retail Pilot Sales CSV")} — drag & drop
                the daily .csv here, or click to select
              </span>
            }
          />
        ) : (
          <Flex gap={4}>
            <FileUpload
              value={file}
              onChange={onFileChange}
              accept={ZIP_ACCEPT}
              maxSize={5242880}
              disabled={loading}
              placeholderText={
                <span>
                  Drag & drop a {purpleLabel("Loyalty and Total Sales")} file
                  here, or click to select
                </span>
              }
            />

            <FileUpload
              value={salesReturnFile}
              onChange={onSalesReturnFileChange}
              accept={ZIP_ACCEPT}
              maxSize={5242880}
              disabled={loading}
              placeholderText={
                <span>
                  Drag & drop a {purpleLabel("Sales Return")} file here, or
                  click to select
                </span>
              }
            />
          </Flex>
        )}

        {isRetailPilot && retailPilotParsed?.ok === false && (
          <Alert status="error" mt={4} alignItems="flex-start">
            <AlertIcon />
            <Box>
              <AlertDescription display="block" fontWeight="600">
                The file was not imported:
              </AlertDescription>
              {retailPilotParsed.errors.map((error) => (
                <AlertDescription display="block" key={error}>
                  {error}
                </AlertDescription>
              ))}
            </Box>
          </Alert>
        )}

        {isRetailPilot && retailPilotParsed?.ok && (
          <Text mt={3} fontSize="sm">
            Reporting date:{" "}
            <b>{moment(retailPilotParsed.date, "YYYY-MM-DD").format("DD-MM-YYYY")}</b>
          </Text>
        )}

        {isRetailPilot &&
          retailPilotParsed?.ok &&
          saveBlockers.length > 0 && (
            <Alert
              status={salesLoading || !salesLoadedForDate ? "info" : "error"}
              mt={4}
              alignItems="flex-start"
            >
              <AlertIcon />
              <Box>
                {saveBlockers.map((blocker) => (
                  <AlertDescription display="block" key={blocker}>
                    {blocker}
                  </AlertDescription>
                ))}
              </Box>
            </Alert>
          )}

        {isRetailPilot && dndsOutletsMissingFromFile.length > 0 && (
          <Alert status="warning" mt={4}>
            <AlertIcon />
            <AlertDescription>
              DnDS has sales on this date for outlet(s) not in the file:{" "}
              {dndsOutletsMissingFromFile.join(", ")}
            </AlertDescription>
          </Alert>
        )}

        <CustomContainer
          title="Imported Data"
          style={{ marginTop: "22px" }}
          size="xs"
          rightSection={
            <Button
              colorScheme="purple"
              onClick={handleSave}
              size="sm"
              isLoading={saving}
              isDisabled={
                saving ||
                salesLoading ||
                (isRetailPilot && saveBlockers.length > 0)
              }
            >
              Save
            </Button>
          }
        >
          {isRetailPilot && importData?.data && !salesLoadedForDate ? (
            <EmptyData message="Loading DnDS sales for this date…" />
          ) : (isRetailPilot ? retailPilotFile : file) && importData?.data ? (
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
