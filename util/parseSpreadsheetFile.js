import * as XLSX from "xlsx";
import Papa from "papaparse";

/**
 * Parse xlsx/csv file and return headers and rows (array of objects keyed by header).
 * @param {File} file
 * @param {Object} options
 * @param {number} [options.skipHeaders=0] - Number of rows to skip before reading headers
 * @returns {Promise<{ headers: string[], rows: Record<string, unknown>[] }>}
 */
export function parseSpreadsheetFile(file, options = {}) {
  const { skipHeaders = 0 } = options;

  return new Promise((resolve, reject) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rawData = results.data || [];
          if (rawData.length <= skipHeaders) {
            resolve({ headers: [], rows: [] });
            return;
          }
          const dataAfterSkip = rawData.slice(skipHeaders);
          const headers = (dataAfterSkip[0] || []).map((h) => String(h ?? "").trim());
          const rows = dataAfterSkip.slice(1).map((row) => {
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = row[i] != null ? row[i] : "";
            });
            return obj;
          });
          resolve({ headers, rows });
        },
        error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
      });
      return;
    }

    if (["xlsx", "xls"].includes(ext)) {
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
          if (jsonData.length <= skipHeaders) {
            resolve({ headers: [], rows: [] });
            return;
          }
          const dataAfterSkip = jsonData.slice(skipHeaders);
          const headers = (dataAfterSkip[0] || []).map((h) => String(h ?? "").trim());
          const rows = dataAfterSkip.slice(1).map((row) => {
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = row[i] != null ? row[i] : "";
            });
            return obj;
          });
          resolve({ headers, rows });
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Error reading file"));
      reader.readAsArrayBuffer(file);
      return;
    }

    reject(new Error("Unsupported file type. Use .csv, .xlsx or .xls"));
  });
}
