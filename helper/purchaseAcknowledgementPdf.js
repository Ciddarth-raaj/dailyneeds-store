import { jsPDF } from "jspdf";
import moment from "moment";

const STORE_ADDRESS =
  "188/1 & 188/3, Iyyanar Koil Street, Muthirayarpalayam Puducherry-605009.";
const PURCHASE_NO = "9788599744";
const ACCOUNTS_NO = "9788599044";
const NOTE_LINE_1 =
  "Note: Kindly Issue Credit Note for Due/Return Items";
const NOTE_LINE_2 =
  "Pls Do not send New Bill Copy or Due/Return Items";

const PAGE_W = 210;
const MARGIN = 5;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const LINE_H = 5;
const FONT_NORMAL = 10;
const FONT_TITLE = 12;
const LOGO_MAX_HEIGHT = 18;
const LOGO_MAX_WIDTH = 45;

/**
 * Load image from URL; return data URL and dimensions for aspect-ratio-safe drawing.
 * @param {string} url - Image URL (e.g. /assets/dnds-logo.png)
 * @returns {Promise<{ dataUrl: string, width: number, height: number }|null>}
 */
function loadImageWithDimensions(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve({
          dataUrl: canvas.toDataURL("image/png"),
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Draw a solid horizontal line.
 */
function solidLine(doc, x, y, w, lineWidth = 0.25) {
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(lineWidth);
  doc.setLineDashPattern([], 0);
  doc.line(x, y, x + w, y);
}

/**
 * Build purchase acknowledgement data suitable for PDF (normalize list vs detail shape).
 * Ack date and out time are set at print time in the PDF, not from this data.
 */
function normalizeAcknowledgementData(raw) {
  const supplierName =
    raw?.distributor_name ?? raw?.distributor_id ?? "—";
  const purAckNo = raw?.purchase_acknowledgement_id != null
    ? String(raw.purchase_acknowledgement_id)
    : "—";

  const invoices = Array.isArray(raw?.invoices) ? raw.invoices : [];
  const invoiceRows = invoices.map((inv, idx) => ({
    sno: idx + 1,
    invoiceDate: inv.invoice_date
      ? moment(inv.invoice_date).format("DD/MM/YY")
      : "—",
    invNo: inv.invoice_no ?? "—",
    invAmt: Number(inv.amount) || 0,
  }));
  const total = invoiceRows.reduce((s, r) => s + r.invAmt, 0);

  return { supplierName, purAckNo, invoiceRows, total };
}

/**
 * Generate and download PDF for a purchase acknowledgement.
 * Layout for A4; includes optional Purchase Returns table at the end.
 * @param {Object} acknowledgement - API shape
 * @param {Object} [options] - { filename?: string, linkedPurchaseReturns?: Array<{ prNo, qty, amt, boxes }> }
 */
export async function downloadPurchaseAcknowledgementPdf(
  acknowledgement,
  options = {}
) {
  const { supplierName, purAckNo, invoiceRows, total } =
    normalizeAcknowledgementData(acknowledgement);
  const linkedPurchaseReturns = options.linkedPurchaseReturns || [];

  const printDateTime = moment().format("DD/MM/YY HH:mm");
  const printTimeOnly = moment().format("HH:mm");

  let logoData = null;
  try {
    logoData = await loadImageWithDimensions("/assets/dnds-logo.png");
  } catch {
    // continue without logo
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  let y = MARGIN;
  const rightEdge = MARGIN + CONTENT_W;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FONT_NORMAL);
  doc.setDrawColor(60, 60, 60);

  // Logo (centered, aspect ratio preserved)
  if (logoData && logoData.width > 0 && logoData.height > 0) {
    const scale = Math.min(
      LOGO_MAX_WIDTH / logoData.width,
      LOGO_MAX_HEIGHT / logoData.height,
      1
    );
    const logoW = logoData.width * scale;
    const logoH = logoData.height * scale;
    doc.addImage(
      logoData.dataUrl,
      "PNG",
      PAGE_W / 2 - logoW / 2,
      y,
      logoW,
      logoH
    );
    y += logoH + 2;
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const addrLines = doc.splitTextToSize(STORE_ADDRESS, CONTENT_W);
  addrLines.forEach((line) => {
    doc.text(line, PAGE_W / 2, y, { align: "center" });
    y += LINE_H - 0.5;
  });
  y += 3;

  solidLine(doc, MARGIN, y, CONTENT_W, 0.35);
  y += LINE_H;

  doc.setFontSize(FONT_TITLE);
  doc.setFont("helvetica", "bold");
  doc.text("PURCHASE ACKNOWLEDGEMENT", PAGE_W / 2, y, { align: "center" });
  y += 2;
  solidLine(doc, MARGIN, y, CONTENT_W, 0.3);
  y += LINE_H + 1;

  // Supplier (left), Pur Ack No & Ack Date (right, labels start at same place); ack date = print time
  doc.setFontSize(FONT_NORMAL);
  doc.setFont("helvetica", "normal");
  doc.text("Supplier Name:", MARGIN, y);
  doc.text(doc.splitTextToSize(supplierName, 70)[0] || supplierName, MARGIN + 28, y);
  const labelStartX = rightEdge - 48;
  doc.text("Pur Ack No:", labelStartX, y);
  doc.text(purAckNo, rightEdge, y, { align: "right" });
  y += LINE_H;
  doc.text("Ack Date:", labelStartX, y);
  doc.text(printDateTime, rightEdge, y, { align: "right" });
  y += LINE_H + 2;

  solidLine(doc, MARGIN, y, CONTENT_W, 0.3);
  y += LINE_H;

  const colSno = MARGIN;
  const colDate = MARGIN + 12;
  const colInvNo = MARGIN + 38;
  const colAmt = rightEdge - 20;
  const colAmtRight = rightEdge;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(FONT_NORMAL);
  doc.text("S.no", colSno, y);
  doc.text("Invoice Date", colDate, y);
  doc.text("Invno", colInvNo, y);
  doc.text("InvAmt", colAmtRight, y, { align: "right" });
  y += 2;

  solidLine(doc, MARGIN, y, CONTENT_W, 0.3);
  y += LINE_H;

  doc.setFont("helvetica", "normal");
  if (invoiceRows.length === 0) {
    doc.text("—", colSno, y);
    y += LINE_H;
  } else {
    invoiceRows.forEach((row) => {
      doc.text(String(row.sno), colSno, y);
      doc.text(row.invoiceDate, colDate, y);
      doc.text(String(row.invNo).slice(0, 20), colInvNo, y);
      doc.text(Number(row.invAmt).toFixed(2), colAmtRight, y, {
        align: "right",
      });
      y += LINE_H;
    });
  }

  y += 1;
  solidLine(doc, MARGIN, y, CONTENT_W, 0.3);
  y += LINE_H;
  doc.setFontSize(FONT_NORMAL);
  doc.text("Remarks:", MARGIN, y);
  y += LINE_H;
  const remarksSpaceLines = 2;
  y += LINE_H * remarksSpaceLines;
  doc.setFont("helvetica", "bold");
  doc.text("Total:", colAmtRight, y, { align: "right" });
  doc.text(Number(total).toFixed(2), colAmtRight, y + LINE_H, {
    align: "right",
  });
  doc.setFont("helvetica", "normal");
  y += LINE_H + 3;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text("For Daily Needs Department Store", PAGE_W / 2, y, {
    align: "center",
  });
  doc.setTextColor(0, 0, 0);
  y += LINE_H;
  solidLine(doc, MARGIN + 35, y, CONTENT_W - 70, 0.25);
  y += LINE_H + 2;

  doc.text("For Enquiries:", MARGIN, y);
  doc.text(`Purchase No: ${PURCHASE_NO}`, MARGIN, y + LINE_H - 0.5);
  doc.text(`Accounts No: ${ACCOUNTS_NO}`, MARGIN, y + 2 * (LINE_H - 0.5));

  const timeLabelX = rightEdge - 36;
  doc.text("In Time :", timeLabelX, y);
  doc.text("Out Time: " + printTimeOnly, timeLabelX, y + LINE_H - 0.5);
  y += 2.5 * LINE_H;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(NOTE_LINE_1, PAGE_W / 2, y, { align: "center" });
  y += LINE_H - 0.3;
  doc.text(NOTE_LINE_2, PAGE_W / 2, y, { align: "center" });
  y += LINE_H;
  solidLine(doc, MARGIN, y, CONTENT_W, 0.25);

  // Purchase Returns table at the end (after the end line)
  if (linkedPurchaseReturns.length > 0) {
    y += LINE_H + 2;
    doc.setFontSize(FONT_TITLE);
    doc.setFont("helvetica", "bold");
    doc.text("PURCHASE RETURNS", PAGE_W / 2, y, { align: "center" });
    y += 2;
    solidLine(doc, MARGIN, y, CONTENT_W, 0.3);
    y += LINE_H + 1;
    const prColNo = MARGIN;
    const prColQty = MARGIN + 45;
    const prColAmt = rightEdge - 32;
    const prColBoxes = rightEdge;
    doc.setFontSize(FONT_NORMAL);
    doc.setFont("helvetica", "bold");
    doc.text("PR No", prColNo, y);
    doc.text("Qty", prColQty, y);
    doc.text("Amt", prColAmt, y, { align: "right" });
    doc.text("Boxes", prColBoxes, y, { align: "right" });
    y += 2;
    solidLine(doc, MARGIN, y, CONTENT_W, 0.3);
    y += LINE_H;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(FONT_NORMAL);
    linkedPurchaseReturns.forEach((row) => {
      doc.text(String(row.prNo).slice(0, 28), prColNo, y);
      doc.text(String(row.qty), prColQty, y);
      doc.text(Number(row.amt).toFixed(2), prColAmt, y, { align: "right" });
      doc.text(row.boxes === "—" ? "—" : String(row.boxes), prColBoxes, y, {
        align: "right",
      });
      y += LINE_H;
    });
  }

  const filename =
    options.filename ||
    `purchase-acknowledgement-${purAckNo}-${moment().format("YYYY-MM-DD")}.pdf`;
  doc.save(filename);
}
