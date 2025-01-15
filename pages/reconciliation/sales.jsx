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

function Sales() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);
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
    "Loyalty Difference": "Loyalty Difference",
    "Total Sales Difference": "Total Sales Difference",
  };

  useEffect(() => {
    if (parsedData?.data?.length > 0) {
      setSelectedDate(new Date(parsedData?.data[0]["Bill Date"]));
    }
  }, [parsedData]);

  const rows = useMemo(() => {
    if (!parsedData?.data) return [];

    return parsedData?.data
      .filter((item) => item["Bill Date"] && item["Outlet Name"])
      .map((item) => {
        const salesDifference =
          parseFloat(item["Bill Amt"] || 0) -
          storeSummary[item["Outlet Name"]]?.total_sales;
        const loyaltyDifference =
          parseFloat(item["Loyalty"] || 0) -
          storeSummary[item["Outlet Name"]]?.loyalty;

        return {
          "Bill Date": moment(item["Bill Date"]).format("DD-MM-YYYY"),
          "Outlet Name": item["Outlet Name"]
            .replace("DailyNeeds-", "")
            .replace("Dailyneeds-", ""),
          "Total Sales": currencyFormatter(item["Bill Amt"] || 0),
          Loyalty: currencyFormatter(item["Loyalty"] || 0),
          "Total Sales Difference": salesDifference ? (
            <span
              style={{
                color: salesDifference > 0 ? "green" : "red",
                fontWeight: "bold",
              }}
            >
              {currencyFormatter(salesDifference)}
            </span>
          ) : (
            "-"
          ),
          "Loyalty Difference": loyaltyDifference ? (
            <span
              style={{
                color: loyaltyDifference > 0 ? "green" : "red",
                fontWeight: "bold",
              }}
            >
              {currencyFormatter(loyaltyDifference)}
            </span>
          ) : (
            "-"
          ),
        };
      });
  }, [parsedData, storeSummary]);

  useEffect(() => {
    const readZipFile = async () => {
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
          await parseFile(file.content);
        }
      } catch (error) {
        toast.error(error.message);
        console.error("Error reading zip file:", error);
      } finally {
        setLoading(false);
      }
    };

    readZipFile();
  }, [file]);

  const parseFile = async (file) => {
    if (!isValidFileType(file)) {
      throw new Error("Invalid file type");
    }

    const result = await importFileToJSON(file);
    setParsedData(result);
    toast.success(`Successfully imported ${result.totalRows} rows`);
  };

  const onFileChange = (file) => {
    setFile(file);
    setParsedData(null);
    reset();
  };

  return (
    <GlobalWrapper>
      <CustomContainer title="Sales Reconciliation" filledHeader>
        <FileUpload
          value={file}
          onChange={onFileChange}
          accept="zip,application/octet-stream,application/zip,application/x-zip,application/x-zip-compressed"
          maxSize={5242880}
          disabled={loading}
        />

        <CustomContainer
          title="Imported Data"
          style={{ marginTop: "22px" }}
          smallHeader
          rightSection={<Button colorScheme="purple">Save</Button>}
        >
          {file && parsedData?.data ? (
            <Table heading={HEADERS} rows={rows ?? []} />
          ) : (
            <EmptyData />
          )}
        </CustomContainer>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Sales;
