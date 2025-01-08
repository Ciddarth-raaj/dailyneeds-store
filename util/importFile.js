import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export function handleExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const mappedData = mapDataToHeaders(jsonData);
        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

export function handleCsvFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const text = event.target.result;
        const lines = text.split("\n");
        const jsonData = lines.map((line) => line.split(","));
        const mappedData = mapDataToHeaders(jsonData);
        resolve(mappedData);
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsText(file);
  });
}

function mapDataToHeaders(data) {
  const headers = data[0];
  const rows = data.slice(1);
  const mappedData = rows.map((row) => {
    const mappedRow = {};
    headers.forEach((header, index) => {
      mappedRow[header] = row[index];
    });
    return mappedRow;
  });
  return mappedData;
}

export async function handleFileImport(file) {
  if (file) {
    const fileExtension = file.name.split(".").pop();

    let parsedDataPromise;
    if (["xlsx", "xls"].includes(fileExtension)) {
      parsedDataPromise = handleExcelFile(file);
    } else if (fileExtension === "csv") {
      parsedDataPromise = handleCsvFile(file);
    } else {
      toast.error("File not supported!");
      return;
    }

    if (parsedDataPromise) {
      const parsedData = await parsedDataPromise;

      return parsedData;
    }

    return null;
  }
}
