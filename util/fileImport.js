import * as XLSX from "xlsx";
import Papa from "papaparse";

const REQUIRED_HEADERS = ["Bill Date", "Outlet Name", "Loyalty", "Cash Sales"];

const validateHeaders = (headers, requiredHeaders) => {
  const missingHeaders = requiredHeaders.filter(
    (required) => !headers.includes(required)
  );

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required columns: ${missingHeaders.join(
        ", "
      )}. Please check the file format.`
    );
  }
};

export const importFileToJSON = (file, requiredHeaders = REQUIRED_HEADERS) => {
  return new Promise((resolve, reject) => {
    try {
      const fileType = file.name.split(".").pop().toLowerCase();

      // Handle CSV files
      if (fileType === "csv") {
        Papa.parse(file, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              // Skip first two rows and get headers from third row
              const [, , headers, ...data] = results.data;

              // Validate required headers
              validateHeaders(headers, requiredHeaders);

              // Convert rows to objects using headers
              const formattedData = data.map((row) =>
                headers.reduce((obj, header, index) => {
                  obj[header] = row[index] || "";
                  return obj;
                }, {})
              );

              resolve({
                data: formattedData,
                headers,
                totalRows: formattedData.length,
              });
            } catch (error) {
              reject(error);
            }
          },
          error: (error) => {
            reject(new Error(`CSV parsing error: ${error}`));
          },
        });
        return;
      }

      // Handle Excel files
      if (["xlsx", "xls"].includes(fileType)) {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

            const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
              header: 1,
              defval: "",
              raw: false,
            });

            // Skip first two rows and get headers from third row
            const [, , headers, ...rows] = jsonData;

            // Validate required headers
            validateHeaders(headers);

            const formattedData = rows.map((row) =>
              headers.reduce((obj, header, index) => {
                obj[header] = row[index] || "";
                return obj;
              }, {})
            );

            resolve({
              data: formattedData,
              headers,
              totalRows: formattedData.length,
              sheetNames: workbook.SheetNames,
            });
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => {
          reject(new Error("Error reading file"));
        };

        reader.readAsArrayBuffer(file);
        return;
      }

      reject(
        new Error("Unsupported file type. Please upload a CSV or Excel file.")
      );
    } catch (error) {
      reject(new Error(`File processing error: ${error.message}`));
    }
  });
};

// Helper to validate file type
export const isValidFileType = (file) => {
  const validTypes = ["csv", "xlsx", "xls"];
  const fileType = file.name.split(".").pop().toLowerCase();
  return validTypes.includes(fileType);
};

// Helper to get file extension
export const getFileExtension = (filename) => {
  return filename
    .slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2)
    .toLowerCase();
};

// Example usage of handling specific Excel date formats
export const formatExcelDate = (serialNumber) => {
  // Excel date serial number to JS Date
  const date = new Date((serialNumber - 25569) * 86400 * 1000);
  return date.toISOString().split("T")[0]; // Returns YYYY-MM-DD
};
