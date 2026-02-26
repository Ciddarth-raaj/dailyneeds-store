import { jsPDF } from "jspdf";
import moment from "moment";

/**
 * A4 in mm: 210 x 297. Half sheet height = 148.5mm. We fit 2 label tables per page.
 * Each table: two-column layout (label | value) with rows: Supplier, PRN No., PRN Date, Entered By, Carton No.
 * @param {Object} row - Purchase return row: distributor_name, mprh_pr_refno, mprh_pr_dt, created_by_name
 * @param {number} noOfBoxes - Total number of boxes (labels to generate)
 * @param {Object} [options] - { filename?: string, enteredBy?: string, print?: boolean } If print is true, opens print dialog instead of downloading.
 */
export function downloadPurchaseReturnLabelsPdf(row, noOfBoxes, options = {}) {
  const opts = typeof options === "string" ? { filename: options, enteredBy: undefined, print: false } : options;
  const { filename: optionsFilename, enteredBy: optionsEnteredBy, print: usePrint = false } = opts;

  const n = Math.max(1, Number(noOfBoxes) || 0);
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const PAGE_W = 210;
  const PAGE_H = 297;
  const HALF_H = PAGE_H / 2; // 148.5mm per half

  const TABLE_MARGIN = 14; // spacing around each table
  const TABLE_AREA_W = PAGE_W - 2 * TABLE_MARGIN;
  const TABLE_AREA_H = HALF_H - 2 * TABLE_MARGIN; // one table per half, with margin
  const TABLE_W = TABLE_AREA_W;
  const LABEL_COL_W = 48;
  const VALUE_COL_W = TABLE_W - LABEL_COL_W;
  const ROW_COUNT = 5; // Supplier, PRN No., PRN Date, Entered By, Carton No.

  const FONT_SIZE = 22;
  // Supplier row fits 3 lines; other 4 rows share remaining height
  const LINE_HEIGHT_MM = 8; // approx line height at FONT_SIZE in mm
  const SUPPLIER_ROW_H = LINE_HEIGHT_MM * 3;
  const OTHER_ROW_H = (TABLE_AREA_H - SUPPLIER_ROW_H) / (ROW_COUNT - 1);
  const ROW_HEIGHTS = [SUPPLIER_ROW_H, OTHER_ROW_H, OTHER_ROW_H, OTHER_ROW_H, OTHER_ROW_H];

  const supplier = row?.distributor_name ?? "—";
  const prnNo = row?.mprh_pr_refno ?? "—";
  const prnDate = row?.mprh_pr_dt
    ? moment(row.mprh_pr_dt).format("DD/MM/YY")
    : "—";
  const enteredBy =
    (optionsEnteredBy != null && String(optionsEnteredBy).trim() !== "")
      ? String(optionsEnteredBy).trim()
      : (row?.created_by_name != null && String(row.created_by_name).trim() !== "")
        ? String(row.created_by_name).trim()
        : "—";

  const labels = [
    "Supplier",
    "PRN No.",
    "PRN Date",
    "Entered By",
    "Carton No.",
  ];

  const VALUE_PAD = 5;
  const MAX_VALUE_W = VALUE_COL_W - 2 * VALUE_PAD;

  function drawTable(doc, x, y, cartonIndex) {
    const values = [
      supplier,
      prnNo,
      prnDate,
      enteredBy,
      `${cartonIndex}/${n}`,
    ];

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.setFontSize(FONT_SIZE);

    let rowTop = y;
    for (let r = 0; r < ROW_COUNT; r++) {
      const rowH = ROW_HEIGHTS[r];
      const rowY = rowTop;
      // cell borders
      doc.rect(x, rowY, LABEL_COL_W, rowH);
      doc.rect(x + LABEL_COL_W, rowY, VALUE_COL_W, rowH);
      // label text (single line, vertically centered)
      doc.setFont(undefined, "normal");
      doc.text(labels[r], x + 5, rowY + rowH / 2 + 2.5);
      // value text
      const val = String(values[r]);
      doc.setFont(undefined, "bold");
      const valueX = x + LABEL_COL_W + VALUE_PAD;
      if (r === 0) {
        // Supplier: wrap to multiple lines (up to 3) within the cell
        const lines = doc.splitTextToSize(val, MAX_VALUE_W);
        const maxLines = 3;
        const drawnLines = lines.slice(0, maxLines);
        const totalTextH = drawnLines.length * LINE_HEIGHT_MM;
        const blockTop = rowY + (rowH - totalTextH) / 2;
        drawnLines.forEach((line, i) => {
          doc.text(line, valueX, blockTop + (i + 1) * LINE_HEIGHT_MM);
        });
      } else {
        doc.text(val, valueX, rowY + rowH / 2 + 2.5, {
          maxWidth: MAX_VALUE_W,
        });
      }
      rowTop += rowH;
    }
    // outer border for whole table
    doc.rect(x, y, TABLE_W, rowTop - y);
  }

  const table1Y = TABLE_MARGIN;
  const table2Y = HALF_H + TABLE_MARGIN;

  let tableIndex = 0;
  for (let p = 0; p < Math.ceil(n / 2); p++) {
    if (p > 0) doc.addPage();

    drawTable(doc, TABLE_MARGIN, table1Y, tableIndex + 1);
    tableIndex++;
    if (tableIndex < n) {
      drawTable(doc, TABLE_MARGIN, table2Y, tableIndex + 1);
      tableIndex++;
    }
  }

  if (usePrint) {
    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    const isWindows =
      typeof navigator !== "undefined" &&
      /Win(dows|32|64|CE)/i.test(navigator.platform || navigator.userAgent || "");

    const cleanup = () => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    };

    if (isWindows) {
      const runPrintAndCleanup = (win, doCleanup) => {
        try {
          if (win && !win.closed) {
            win.focus();
            win.print();
          }
        } catch (_) {}
        setTimeout(doCleanup, 3000);
      };
      const printWindow = window.open(url, "_blank", "noopener,noreferrer");
      if (printWindow) {
        setTimeout(() => runPrintAndCleanup(printWindow, cleanup), 400);
      } else {
        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.left = "-9999px";
        iframe.style.width = "1px";
        iframe.style.height = "1px";
        iframe.style.border = "none";
        iframe.style.visibility = "hidden";
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          const iframeCleanup = () => {
            try {
              if (iframe.parentNode) document.body.removeChild(iframe);
            } catch (_) {}
            cleanup();
          };
          const win = iframe.contentWindow;
          if (win?.onafterprint) win.onafterprint = iframeCleanup;
          else setTimeout(iframeCleanup, 3000);
          setTimeout(() => {
            try {
              if (win) {
                win.focus();
                win.print();
              }
            } catch (_) {}
          }, 200);
        };
      }
    } else {
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.left = "-9999px";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        const iframeCleanup = () => {
          try {
            if (iframe.parentNode) document.body.removeChild(iframe);
          } catch (_) {}
          cleanup();
        };
        const win = iframe.contentWindow;
        if (win?.onafterprint) win.onafterprint = iframeCleanup;
        else setTimeout(iframeCleanup, 3000);
        setTimeout(() => {
          try {
            if (win) {
              win.focus();
              win.print();
            }
          } catch (_) {}
        }, 200);
      };
    }
  } else {
    const name =
      optionsFilename ||
      `purchase-return-labels-${prnNo || "labels"}-${moment().format("YYYY-MM-DD")}.pdf`;
    doc.save(name);
  }
}
