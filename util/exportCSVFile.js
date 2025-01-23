import * as XLSX from "xlsx";

export default function exportCSVFile(headers, items, fileTitle) {
  if (headers) {
    items.unshift(headers);
  }
  console.log({ one: exportCSVFile });
  // Convert Object to JSON
  var jsonObject = JSON.stringify(items);
  var csv = convertToCSV(jsonObject);
  var exportedFilenmae = fileTitle + ".csv" || "export.csv";
  var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  if (navigator.msSaveBlob) {
    // IE 10+
    navigator.msSaveBlob(blob, exportedFilenmae);
  } else {
    var link = document.createElement("a");
    if (link.download !== undefined) {
      // feature detection
      // Browsers that support HTML5 download attribute
      var url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", exportedFilenmae);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
}
function convertToCSV(objArray) {
  var array = typeof objArray != "object" ? JSON.parse(objArray) : objArray;
  var str = "";
  for (var i = 0; i < array.length; i++) {
    var line = "";
    for (var index in array[i]) {
      if (line != "") line += ",";
      line += array[i][index];
    }
    str += line + "\r\n";
  }
  return str;
}

function jsonToCsv(jsonArray, delimiter = ",") {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
    return "";
  }

  // Extract headers (keys) from the first object
  const headers = Object.keys(jsonArray[0]);
  const csvRows = [];

  // Add headers as the first row
  csvRows.push(headers.join(delimiter));

  // Add data rows
  for (const obj of jsonArray) {
    const values = headers.map((header) => {
      const value = obj[header];
      // Escape quotes and handle commas
      return typeof value === "string" && value.includes(delimiter)
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    });
    csvRows.push(values.join(delimiter));
  }

  // Join all rows with a newline character
  return csvRows.join("\n");
}

export function downloadCsv(jsonArray, fileName = "data.csv", delimiter = ",") {
  const csv = jsonToCsv(jsonArray, delimiter);
  if (!csv) {
    console.error("Invalid JSON data or empty array.");
    return;
  }

  // Create a blob with the CSV content
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  // Create a link element to trigger download
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;

  // Programmatically click the link to start download
  document.body.appendChild(a);
  a.click();

  // Clean up
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToExcel(lists, sheetNames, fileName = "data.xlsx") {
  if (
    !Array.isArray(lists) ||
    !Array.isArray(sheetNames) ||
    lists.length !== sheetNames.length
  ) {
    console.error("Invalid lists or sheet names.");
    return;
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Add each list as a separate sheet
  lists.forEach((list, index) => {
    if (Array.isArray(list) && list.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(list);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetNames[index]);
    }
  });

  // Export the workbook to a file
  XLSX.writeFile(workbook, fileName);
}
