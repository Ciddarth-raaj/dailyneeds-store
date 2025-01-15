import React, { useEffect, useState } from "react";
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

function Sales() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState(null);

  const HEADERS = {
    "Bill Date": "Bill Date",
    "Outlet Name": "Outlet Name",
    "Cash Sales": "Cash Sales",
    Loyalty: "Loyalty",
  };

  const rows = parsedData?.data
    .filter((item) => item["Bill Date"] && item["Outlet Name"])
    .map((item) => {
      return {
        "Bill Date": moment(item["Bill Date"]).format("DD-MM-YYYY"),
        "Outlet Name": item["Outlet Name"],
        "Cash Sales": currencyFormatter(item["Cash Sales"] || 0),
        Loyalty: currencyFormatter(item["Loyalty"] || 0),
      };
    });

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

  return (
    <GlobalWrapper>
      <CustomContainer title="Sales Reconciliation" filledHeader>
        <FileUpload
          value={file}
          onChange={setFile}
          accept="zip,application/octet-stream,application/zip,application/x-zip,application/x-zip-compressed"
          maxSize={5242880}
          disabled={loading}
        />

        <CustomContainer title="Imported Data" style={{ marginTop: "22px" }}>
          {parsedData?.data ? (
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
