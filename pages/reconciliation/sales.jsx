import React, { useEffect, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import FileUpload from "../../components/FileUpload";
import JSZip from "jszip";

function Sales() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

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
        console.log("Extracted files:", files);
      } catch (error) {
        console.error("Error reading zip file:", error);
      } finally {
        setLoading(false);
      }
    };

    readZipFile();
  }, [file]);

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
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Sales;
