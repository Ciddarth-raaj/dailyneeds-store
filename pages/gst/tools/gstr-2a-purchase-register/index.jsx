import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import moment from "moment";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import GlobalWrapper from "../../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../../components/CustomContainer";
import AgGrid from "../../../../components/AgGrid";
import GstModuleWrapper from "../../../../components/gst/GstModuleWrapper";
import Gstr2aAcceptZeroTaxModal from "../../../../components/gst/Gstr2aAcceptZeroTaxModal";
import Gstr2aAutoMatchPreviewModal from "../../../../components/gst/Gstr2aAutoMatchPreviewModal";
import Gstr2aMatchModal from "../../../../components/gst/Gstr2aMatchModal";
import Gstr2aPrSummaryTable from "../../../../components/gst/Gstr2aPrSummaryTable";
import { useModuleTableTheme } from "../../../../contexts/ModuleTableThemeContext";
import { useUser } from "../../../../contexts/UserContext";
import { useGstB2bInvoices } from "../../../../customHooks/useGstB2bInvoices";
import { useGstr2aPurchaseRegisterPr } from "../../../../customHooks/useGstr2aPurchaseRegisterPr";
import { upsertPurchaseGstMatch } from "../../../../helper/purchaseGstMatch";
import {
  acceptPurchaseGstNo2a,
  deletePurchaseGstNo2a,
} from "../../../../helper/purchaseGstNo2a";
import {
  financialYearForPeriodRange,
  financialYearPeriodRange,
  formatFinancialYearLabel,
  listFinancialYears,
} from "../../../../util/gstFinancialYear";
import {
  aggregateGstr2aPeriodSummary,
  aggregatePurchasePeriodSummary,
  buildAcceptedNo2aIds,
  buildAutoMatchPairs,
  buildDocumentViewRows,
  computeTaxDiff,
  enrichDocumentRowsWithMatches,
  enrichRowsWithNo2aAcceptance,
  enrichVendorRowsWithMatchPct,
  formatPeriodRangeLabel,
  getDocumentMatchStatusBadge,
  getPurchaseMatchIds,
  isTaxDiffOutOfRange,
  mergeVendorRowsWithPr,
  periodRangeKey,
} from "../../../../util/gstr2aPurchaseRegister";

function parseDecimal(v) {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function lineTaxSum(it) {
  return (
    parseDecimal(it?.iamt) +
    parseDecimal(it?.camt) +
    parseDecimal(it?.samt) +
    parseDecimal(it?.csamt) +
    parseDecimal(it?.cesamt)
  );
}

/** PR grid values: null when missing or zero (displays "—"). */
function prValueGetter(field) {
  return (params) => {
    const v = params.data?.[field];
    if (v == null || v === 0) return null;
    return v;
  };
}

function taxDiffColumnDef(tax2AField, taxPrField) {
  return {
    colId: "taxDiff",
    headerName: "Tax Diff",
    type: "currency",
    minWidth: 100,
    filter: true,
    sortable: true,
    valueGetter: (params) =>
      computeTaxDiff(params.data?.[tax2AField], params.data?.[taxPrField]),
    cellStyle: (params) =>
      isTaxDiffOutOfRange(params.value)
        ? { color: "var(--chakra-colors-red-600)", fontWeight: 600 }
        : undefined,
  };
}

function vendorKey(inv) {
  const c = (inv.ctin || "").trim();
  if (c) return c;
  const vid = inv.gst_vendor_id;
  return vid != null ? `__vid_${vid}` : "__unknown";
}

function aggregateVendors(invoices) {
  const by = new Map();
  for (const inv of invoices) {
    const key = vendorKey(inv);
    if (!by.has(key)) {
      by.set(key, {
        _rowId: key,
        ctin: (inv.ctin || "").trim() || "—",
        vendorName: inv.vendor_name || "—",
        totalTax2A: 0,
        totalTaxPr: null,
        docCount2A: 0,
        docCountPr: null,
        taxable2A: 0,
        taxablePr: null,
      });
    }
    const row = by.get(key);
    if (inv.vendor_name) row.vendorName = inv.vendor_name;
    if ((inv.ctin || "").trim()) row.ctin = (inv.ctin || "").trim();

    const items = Array.isArray(inv.items) ? inv.items : [];
    for (const it of items) {
      row.taxable2A += parseDecimal(it.txval);
      row.totalTax2A += lineTaxSum(it);
    }
    row.docCount2A += 1;
  }
  return Array.from(by.values()).sort((a, b) =>
    String(a.vendorName || "").localeCompare(
      String(b.vendorName || ""),
      undefined,
      {
        sensitivity: "base",
      }
    )
  );
}

function buildDocumentRows(invoices) {
  return invoices.map((inv) => {
    const items = Array.isArray(inv.items) ? inv.items : [];
    let taxable2A = 0;
    let igst2A = 0;
    let cgst2A = 0;
    let sgst2A = 0;
    let totalTax2A = 0;
    for (const it of items) {
      taxable2A += parseDecimal(it.txval);
      igst2A += parseDecimal(it.iamt);
      cgst2A += parseDecimal(it.camt);
      sgst2A += parseDecimal(it.samt);
      totalTax2A += lineTaxSum(it);
    }
    const declaredVal = parseDecimal(inv.val);
    const totalValue2A = declaredVal > 0 ? declaredVal : taxable2A + totalTax2A;
    const id =
      inv.gst_b2b_invoice_id != null
        ? String(inv.gst_b2b_invoice_id)
        : `${vendorKey(inv)}|${inv.inum}|${inv.idt}`;
    return {
      _rowId: id,
      gst_b2b_invoice_id: inv.gst_b2b_invoice_id ?? null,
      supplierName: inv.vendor_name || "—",
      ctin: (inv.ctin || "").trim() || "—",
      docNo2A: inv.inum || "—",
      docNoPr: null,
      docDate2A: inv.idt || "—",
      docDatePr: null,
      taxable2A,
      taxablePr: null,
      igst2A,
      igstPr: null,
      cgst2A,
      cgstPr: null,
      sgst2A,
      sgstPr: null,
      totalTax2A,
      totalTaxPr: null,
      totalValue2A,
      totalValuePr: null,
    };
  });
}

export default function GstGstr2aPurchaseRegisterPage() {
  const { colorScheme } = useModuleTableTheme();
  const [fromPeriod, setFromPeriod] = useState(() =>
    moment().subtract(1, "month").format("YYYY-MM")
  );
  const [toPeriod, setToPeriod] = useState(() =>
    moment().subtract(1, "month").format("YYYY-MM")
  );
  const [tabIndex, setTabIndex] = useState(0);
  const [filterCtin, setFilterCtin] = useState(null);
  const [matchDocument, setMatchDocument] = useState(null);
  const [autoMatching, setAutoMatching] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptPreviewOpen, setAcceptPreviewOpen] = useState(false);
  const [autoMatchPreviewOpen, setAutoMatchPreviewOpen] = useState(false);
  const [autoMatchPairs, setAutoMatchPairs] = useState([]);
  const [autoMatchUnmatched, setAutoMatchUnmatched] = useState([]);
  /** When true, next switch to Document tab came from vendor GSTIN link — do not clear filter. */
  const documentTabFromGstinLinkRef = useRef(false);
  const { userConfig } = useUser();

  const { invoices, loading, error } = useGstB2bInvoices(
    fromPeriod,
    toPeriod
  );

  const periodKey = useMemo(
    () => periodRangeKey(fromPeriod, toPeriod),
    [fromPeriod, toPeriod]
  );

  const periodLabel = useMemo(
    () => formatPeriodRangeLabel(fromPeriod, toPeriod),
    [fromPeriod, toPeriod]
  );

  useEffect(() => {
    setFilterCtin(null);
  }, [periodKey]);

  const onGstinNavigate = useCallback((ctin) => {
    const c = (ctin || "").trim();
    if (!c || c === "—") return;
    documentTabFromGstinLinkRef.current = true;
    setFilterCtin(c);
    setTabIndex(1);
  }, []);

  const onOpenMatch = useCallback((row) => {
    if (!row) return;
    setMatchDocument(row);
  }, []);

  const onCloseMatch = useCallback(() => {
    setMatchDocument(null);
  }, []);

  const handleTabChange = useCallback((index) => {
    if (index === 1 && !documentTabFromGstinLinkRef.current) {
      setFilterCtin(null);
    }
    documentTabFromGstinLinkRef.current = false;
    setTabIndex(index);
  }, []);

  const {
    purchases,
    matches,
    acceptedNo2a,
    vendorPrByGstin,
    loading: prLoading,
    error: prError,
    refetch: refetchPr,
  } = useGstr2aPurchaseRegisterPr(fromPeriod, toPeriod);

  const vendorRows = useMemo(() => {
    const from2A = aggregateVendors(invoices);
    const merged = mergeVendorRowsWithPr(from2A, vendorPrByGstin);
    return enrichVendorRowsWithMatchPct(merged, invoices, matches);
  }, [invoices, vendorPrByGstin, matches]);

  const acceptedNo2aIds = useMemo(
    () => buildAcceptedNo2aIds(acceptedNo2a),
    [acceptedNo2a]
  );

  const documentRows = useMemo(() => {
    const rows = enrichRowsWithNo2aAcceptance(
      buildDocumentViewRows(
        enrichDocumentRowsWithMatches(
          buildDocumentRows(invoices),
          purchases,
          matches
        ),
        purchases,
        matches
      ),
      acceptedNo2aIds
    );
    const f = (filterCtin || "").trim();
    if (!f) return rows;
    return rows.filter((r) => (r.ctin || "").trim() === f);
  }, [invoices, filterCtin, purchases, matches, acceptedNo2aIds]);

  /** PR-only, zero-tax and not yet accepted - what "Accept zero-tax" would take. */
  const acceptableRows = useMemo(
    () =>
      documentRows.filter(
        (r) =>
          r.isPrOnly &&
          r.isZeroTax &&
          !r.isNo2aAccepted &&
          r.gst_tally_purchase_id != null
      ),
    [documentRows]
  );

  const summary2A = useMemo(
    () => aggregateGstr2aPeriodSummary(invoices),
    [invoices]
  );

  const summaryPD = useMemo(
    () => aggregatePurchasePeriodSummary(purchases),
    [purchases]
  );

  const unmatchedDocumentCount = useMemo(
    () =>
      documentRows.filter((r) => !r.isMatched && r.gst_b2b_invoice_id != null)
        .length,
    [documentRows]
  );

  const employeeId = useMemo(
    () => parseInt(String(userConfig?.employeeId ?? ""), 10),
    [userConfig]
  );

  const acceptNo2aRows = useCallback(
    async (rows) => {
      if (!Number.isFinite(employeeId)) {
        toast.error("Employee ID not found. Please sign in again.");
        return;
      }
      const ids = rows
        .map((r) => r.gst_tally_purchase_id)
        .filter((id) => id != null);
      if (!ids.length) return;

      setAccepting(true);
      try {
        const data = await acceptPurchaseGstNo2a({
          gst_tally_purchase_ids: ids,
          accepted_by: employeeId,
        });
        if (data.code !== 200) {
          toast.error(data?.msg || "Could not accept");
          return;
        }
        await refetchPr();
        const count = data.accepted_count ?? ids.length;
        const skipped = (data.rejected ?? []).length;
        toast.success(
          `Accepted ${count} invoice${count === 1 ? "" : "s"} as not in 2A` +
            (skipped ? `. ${skipped} skipped - tax is not zero.` : "")
        );
      } catch (e) {
        toast.error(e?.message || "Could not accept");
      } finally {
        setAccepting(false);
      }
    },
    [employeeId, refetchPr]
  );

  const handleAcceptRow = useCallback(
    (row) => acceptNo2aRows([row]),
    [acceptNo2aRows]
  );

  const handleOpenAcceptPreview = useCallback(() => {
    if (!acceptableRows.length) return;
    setAcceptPreviewOpen(true);
  }, [acceptableRows]);

  const handleCloseAcceptPreview = useCallback(() => {
    if (accepting) return;
    setAcceptPreviewOpen(false);
  }, [accepting]);

  const handleConfirmAcceptZeroTax = useCallback(async () => {
    await acceptNo2aRows(acceptableRows);
    setAcceptPreviewOpen(false);
  }, [acceptableRows, acceptNo2aRows]);

  const handleUnacceptRow = useCallback(
    async (row) => {
      const id = row?.gst_tally_purchase_id;
      if (id == null) return;
      setAccepting(true);
      try {
        const data = await deletePurchaseGstNo2a(id);
        if (data.code !== 200) {
          toast.error(data?.msg || "Could not undo");
          return;
        }
        await refetchPr();
        toast.success("Back to unmatched");
      } catch (e) {
        toast.error(e?.message || "Could not undo");
      } finally {
        setAccepting(false);
      }
    },
    [refetchPr]
  );

  const handleOpenAutoMatchPreview = useCallback(() => {
    const pairs = buildAutoMatchPairs(documentRows, purchases, matches);
    const pairedIds = new Set(pairs.map((p) => p.document.gst_b2b_invoice_id));
    const unmatched = documentRows.filter(
      (r) =>
        !r.isMatched &&
        r.gst_b2b_invoice_id != null &&
        !pairedIds.has(r.gst_b2b_invoice_id)
    );

    if (!pairs.length && !unmatched.length) {
      toast("No unmatched documents to review.");
      return;
    }

    setAutoMatchPairs(pairs);
    setAutoMatchUnmatched(unmatched);
    setAutoMatchPreviewOpen(true);
  }, [documentRows, purchases, matches]);

  const handleCloseAutoMatchPreview = useCallback(() => {
    if (autoMatching) return;
    setAutoMatchPreviewOpen(false);
    setAutoMatchPairs([]);
    setAutoMatchUnmatched([]);
  }, [autoMatching]);

  const handleConfirmAutoMatch = useCallback(async () => {
    if (!Number.isFinite(employeeId)) {
      toast.error("Employee ID not found. Please sign in again.");
      return;
    }

    if (!autoMatchPairs.length) return;

    setAutoMatching(true);
    let success = 0;
    let failed = 0;

    try {
      for (const { document: doc, purchase } of autoMatchPairs) {
        try {
          const data = await upsertPurchaseGstMatch({
            gst_b2b_invoice_id: doc.gst_b2b_invoice_id,
            ...getPurchaseMatchIds(purchase),
            matched_by: employeeId,
          });
          if (data.code === 200) success += 1;
          else failed += 1;
        } catch {
          failed += 1;
        }
      }

      await refetchPr();
      setAutoMatchPreviewOpen(false);
      setAutoMatchPairs([]);
      setAutoMatchUnmatched([]);

      if (success > 0) {
        toast.success(
          `Auto-matched ${success} document${success === 1 ? "" : "s"}${
            failed > 0 ? ` (${failed} failed)` : ""
          }`
        );
      } else {
        toast.error("Auto-match failed for all candidates.");
      }
    } finally {
      setAutoMatching(false);
    }
  }, [autoMatchPairs, employeeId, refetchPr]);

  const vendorColDefs = useMemo(
    () => [
      {
        headerName: "Supplier Details",
        children: [
          {
            field: "ctin",
            headerName: "GSTIN",
            pinned: "left",
            lockPosition: true,
            width: 150,
            flex: 0,
            filter: true,
            sortable: true,
            cellRenderer: (params) => {
              const v = params.value;
              if (!v || v === "—") return "—";
              return (
                <Button
                  type="button"
                  variant="link"
                  colorScheme={colorScheme}
                  size="xs"
                  fontWeight="normal"
                  onClick={() => onGstinNavigate(v)}
                >
                  {v}
                </Button>
              );
            },
          },
          {
            field: "vendorName",
            headerName: "Name",
            type: "capitalized",
            pinned: "left",
            lockPosition: true,
            width: 200,
            flex: 0,
            filter: true,
            sortable: true,
          },
          {
            field: "matchedPct",
            headerName: "Matched",
            pinned: "left",
            flex: 0,
            width: 110,
            valueFormatter: (p) => (!p.value ? null : p.value),
            cellRenderer: (p) => (!p.value ? "-" : `${p.value}%`),
          },
        ],
      },
      {
        headerName: "No. of Documents",
        children: [
          {
            field: "docCount2A",
            headerName: "2A",
            filter: true,
            sortable: true,
            minWidth: 80,
          },
          {
            field: "docCountPr",
            headerName: "PR",
            filter: false,
            sortable: true,
            minWidth: 80,
            valueGetter: prValueGetter("docCountPr"),
          },
        ],
      },
      {
        headerName: "Total Taxable Value",
        children: [
          {
            field: "taxable2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "taxablePr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
            valueGetter: prValueGetter("taxablePr"),
          },
        ],
      },
      {
        headerName: "Total Tax",
        children: [
          {
            field: "totalTax2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "totalTaxPr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
            valueGetter: prValueGetter("totalTaxPr"),
          },
          taxDiffColumnDef("totalTax2A", "totalTaxPr"),
        ],
      },
    ],
    [onGstinNavigate, colorScheme]
  );

  const pageLoading = loading || prLoading;
  const pageError = error || prError || null;

  const documentColDefs = useMemo(
    () => [
      {
        field: "_matchAction",
        headerName: "Action",
        type: "action-icons",
        pinned: "left",
        lockPosition: true,
        width: 0,
        maxWidth: 80,
        flex: 0,
        filter: false,
        sortable: false,
        valueGetter: (params) => {
          const row = params.data;
          const matched = Boolean(row?.isMatched);
          const prOnly = Boolean(row?.isPrOnly);

          // A zero-tax purchase has no 2A document to match, so its action is
          // to accept that absence rather than to open the match modal.
          if (prOnly && row?.isNo2aAccepted) {
            return [
              {
                label: "Accepted - undo",
                icon: "fa-solid fa-rotate-left",
                colorScheme: "green",
                onClick: () => handleUnacceptRow(row),
              },
            ];
          }
          if (prOnly && row?.isZeroTax) {
            return [
              {
                label: "Accept - no 2A expected",
                icon: "fa-solid fa-circle-check",
                colorScheme: "green",
                onClick: () => handleAcceptRow(row),
              },
            ];
          }

          return [
            {
              label: matched ? "Matched" : "Match",
              icon: matched ? "fa-solid fa-check" : "fa-solid fa-link",
              colorScheme,
              disabled: prOnly,
              onClick: prOnly ? undefined : () => onOpenMatch(params.data),
            },
          ];
        },
      },
      {
        headerName: "Supplier Details",
        children: [
          {
            field: "supplierName",
            headerName: "Name",
            type: "capitalized",
            pinned: "left",
            lockPosition: true,
            width: 200,
            flex: 0,
            filter: true,
            sortable: true,
          },
          {
            field: "ctin",
            headerName: "GSTIN",
            pinned: "left",
            lockPosition: true,
            width: 155,
            flex: 0,
            filter: true,
            sortable: true,
          },
          {
            field: "matchStatus",
            headerName: "Status",
            type: "badge-column",
            pinned: "left",
            lockPosition: true,
            width: 120,
            flex: 0,
            valueGetter: (params) => getDocumentMatchStatusBadge(params.data),
          },
        ],
      },
      {
        headerName: "Document Number",
        children: [
          {
            field: "docNo2A",
            headerName: "2A",
            filter: true,
            sortable: true,
            minWidth: 140,
            valueFormatter: (p) =>
              p.value == null || p.value === "" ? "—" : String(p.value),
          },
          {
            field: "docNoPr",
            headerName: "PR",
            filter: true,
            sortable: true,
            minWidth: 140,
            valueFormatter: (p) =>
              p.value == null || p.value === "" ? "—" : String(p.value),
          },
        ],
      },
      {
        headerName: "Document Date",
        children: [
          {
            field: "docDate2A",
            headerName: "2A",
            filter: true,
            sortable: true,
            minWidth: 118,
            valueFormatter: (p) =>
              p.value == null || p.value === "" ? "—" : String(p.value),
          },
          {
            field: "docDatePr",
            headerName: "PR",
            filter: true,
            sortable: true,
            minWidth: 118,
            valueFormatter: (p) =>
              p.value == null || p.value === "" ? "—" : String(p.value),
          },
        ],
      },
      {
        headerName: "Taxable Value",
        children: [
          {
            field: "taxable2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "taxablePr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
      {
        headerName: "IGST",
        children: [
          {
            field: "igst2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "igstPr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
      {
        headerName: "CGST",
        children: [
          {
            field: "cgst2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "cgstPr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
      {
        headerName: "SGST",
        children: [
          {
            field: "sgst2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "sgstPr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
      {
        headerName: "Total Tax Value",
        children: [
          {
            field: "totalTax2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "totalTaxPr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
          taxDiffColumnDef("totalTax2A", "totalTaxPr"),
        ],
      },
      {
        headerName: "Total Value",
        children: [
          {
            field: "totalValue2A",
            headerName: "2A",
            type: "currency",
            minWidth: 110,
          },
          {
            field: "totalValuePr",
            headerName: "PR",
            type: "currency",
            minWidth: 110,
          },
        ],
      },
    ],
    [onOpenMatch, colorScheme, handleAcceptRow, handleUnacceptRow]
  );

  const currentMonth = moment().format("YYYY-MM");

  const financialYears = useMemo(
    () => listFinancialYears(currentMonth),
    [currentMonth]
  );

  /** The FY the range covers exactly, or "" while the range is a custom span. */
  const selectedFinancialYear = useMemo(() => {
    const fy = financialYearForPeriodRange(fromPeriod, toPeriod, currentMonth);
    return fy == null ? "" : String(fy);
  }, [fromPeriod, toPeriod, currentMonth]);

  const handleFinancialYearChange = useCallback(
    (e) => {
      const value = e.target.value;
      if (!value) return;
      const range = financialYearPeriodRange(Number(value), currentMonth);
      if (!range) return;
      setFromPeriod(range.from);
      setToPeriod(range.to);
    },
    [currentMonth]
  );

  /** Keep the range ordered: moving one end past the other drags the other with it. */
  const handleFromPeriodChange = useCallback(
    (e) => {
      const next = e.target.value;
      setFromPeriod(next);
      if (next && toPeriod && next > toPeriod) {
        setToPeriod(next);
      }
    },
    [toPeriod]
  );

  const handleToPeriodChange = useCallback(
    (e) => {
      const next = e.target.value;
      setToPeriod(next);
      if (next && fromPeriod && next < fromPeriod) {
        setFromPeriod(next);
      }
    },
    [fromPeriod]
  );

  const monthPicker = (
    <FormControl display="flex" alignItems="center" gap={2} w="auto" m={0}>
      <FormLabel
        fontSize="xs"
        m={0}
        whiteSpace="nowrap"
        color={`${colorScheme}.700`}
        fontWeight="medium"
      >
        Return period
      </FormLabel>
      <Select
        size="sm"
        maxW="150px"
        value={selectedFinancialYear}
        onChange={handleFinancialYearChange}
        placeholder="Custom"
      >
        {financialYears.map((fy) => (
          <option key={fy} value={fy}>
            {formatFinancialYearLabel(fy)}
          </option>
        ))}
      </Select>
      <Input
        type="month"
        size="sm"
        maxW="168px"
        value={fromPeriod}
        max={toPeriod || currentMonth}
        onChange={handleFromPeriodChange}
      />
      <Text fontSize="xs" color="gray.600">
        to
      </Text>
      <Input
        type="month"
        size="sm"
        maxW="168px"
        value={toPeriod}
        min={fromPeriod || undefined}
        max={currentMonth}
        onChange={handleToPeriodChange}
      />
    </FormControl>
  );

  return (
    <GlobalWrapper
      title="GSTR 2A v Purchase Register"
      permissionKey={["view_gst_gstr2a_purchase_register"]}
    >
      <GstModuleWrapper>
        <Gstr2aMatchModal
          isOpen={matchDocument != null}
          onClose={onCloseMatch}
          documentRow={matchDocument}
          fromPeriod={fromPeriod}
          toPeriod={toPeriod}
          purchases={purchases}
          matches={matches}
          prLoading={prLoading}
          prError={prError}
          onMatchChanged={refetchPr}
        />
        <Gstr2aAcceptZeroTaxModal
          isOpen={acceptPreviewOpen}
          onClose={handleCloseAcceptPreview}
          rows={acceptableRows}
          confirming={accepting}
          onConfirm={handleConfirmAcceptZeroTax}
        />
        <Gstr2aAutoMatchPreviewModal
          isOpen={autoMatchPreviewOpen}
          onClose={handleCloseAutoMatchPreview}
          pairs={autoMatchPairs}
          unmatchedDocuments={autoMatchUnmatched}
          confirming={autoMatching}
          onConfirm={handleConfirmAutoMatch}
        />
        <CustomContainer
          title="GSTR 2A v Purchase Register"
          filledHeader
          rightSection={monthPicker}
        >
          {pageLoading ? (
            <Text mt={3}>Loading…</Text>
          ) : pageError ? (
            <Alert status="error" borderRadius="md" mt={3}>
              <AlertIcon />
              {pageError}
            </Alert>
          ) : (
            <>
              <Text fontSize="xs" color="gray.600" mb={2}>
                Return period: {periodLabel}
              </Text>
              <Gstr2aPrSummaryTable
                summary2A={summary2A}
                summaryPD={summaryPD}
                colorScheme={colorScheme}
              />
              <Tabs
                index={tabIndex}
                onChange={handleTabChange}
                colorScheme={colorScheme}
                variant="enclosed"
              >
                <TabList>
                  <Tab fontSize="sm">Vendor View</Tab>
                  <Tab fontSize="sm">Document View</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <AgGrid
                      rowData={vendorRows}
                      columnDefs={vendorColDefs}
                      tableKey={`gst-gstr2a-pr-vendor-${periodKey}`}
                      gridOptions={{
                        getRowId: (params) => String(params.data?._rowId ?? ""),
                      }}
                    />
                  </TabPanel>
                  <TabPanel px={0}>
                    <Flex
                      justify="space-between"
                      align="center"
                      flexWrap="wrap"
                      gap={2}
                      mb={2}
                    >
                      <Box>
                        {filterCtin ? (
                          <Text as="span" fontSize="sm" color="gray.700">
                            Showing documents for GSTIN{" "}
                            <Text as="span" fontWeight="semibold">
                              {filterCtin}
                            </Text>
                            <Button
                              type="button"
                              variant="link"
                              colorScheme={colorScheme}
                              size="sm"
                              ml={3}
                              onClick={() => setFilterCtin(null)}
                            >
                              Show all
                            </Button>
                          </Text>
                        ) : null}
                      </Box>
                      <Flex gap={2}>
                        {acceptableRows.length > 0 ? (
                          <Button
                            type="button"
                            colorScheme="green"
                            variant="outline"
                            size="sm"
                            leftIcon={
                              <i className="fa-solid fa-circle-check" />
                            }
                            onClick={handleOpenAcceptPreview}
                            isLoading={accepting}
                            isDisabled={pageLoading}
                          >
                            {`Accept zero-tax (${acceptableRows.length})`}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          colorScheme={colorScheme}
                          size="sm"
                          leftIcon={
                            <i className="fa-solid fa-wand-magic-sparkles" />
                          }
                          onClick={handleOpenAutoMatchPreview}
                          isLoading={autoMatching && !autoMatchPreviewOpen}
                          isDisabled={
                            pageLoading || unmatchedDocumentCount === 0
                          }
                        >
                          Auto match
                          {unmatchedDocumentCount > 0
                            ? ` (${unmatchedDocumentCount} unmatched)`
                            : ""}
                        </Button>
                      </Flex>
                    </Flex>
                    <AgGrid
                      rowData={documentRows}
                      columnDefs={documentColDefs}
                      tableKey={`gst-gstr2a-pr-doc-${periodKey}`}
                      gridOptions={{
                        getRowId: (params) => String(params.data?._rowId ?? ""),
                      }}
                    />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </>
          )}
        </CustomContainer>
      </GstModuleWrapper>
    </GlobalWrapper>
  );
}
