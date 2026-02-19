import * as XLSX from "xlsx";
import Papa from "papaparse";

/**
 * Parse xlsx/csv file and return first row as headers and rest as rows (array of objects keyed by header).
 * @param {File} file
 * @returns {Promise<{ headers: string[], rows: Record<string, unknown>[] }>}
 */
export function parseSpreadsheetFile(file) {
  return new Promise((resolve, reject) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data || [];
          const headers = results.meta?.fields || (rows[0] ? Object.keys(rows[0]) : []);
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
          if (!jsonData.length) {
            resolve({ headers: [], rows: [] });
            return;
          }
          const headers = jsonData[0].map((h) => String(h ?? "").trim());
          const rows = jsonData.slice(1).map((row) => {
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
