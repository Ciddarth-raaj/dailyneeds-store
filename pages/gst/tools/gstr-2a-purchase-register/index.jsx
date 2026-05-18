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
import Gstr2aAutoMatchPreviewModal from "../../../../components/gst/Gstr2aAutoMatchPreviewModal";
import Gstr2aMatchModal from "../../../../components/gst/Gstr2aMatchModal";
import Gstr2aPrSummaryTable from "../../../../components/gst/Gstr2aPrSummaryTable";
import { useModuleTableTheme } from "../../../../contexts/ModuleTableThemeContext";
import { useUser } from "../../../../contexts/UserContext";
import { useGstB2bInvoices } from "../../../../customHooks/useGstB2bInvoices";
import { useGstr2aPurchaseRegisterPr } from "../../../../customHooks/useGstr2aPurchaseRegisterPr";
import { upsertPurchaseGstMatch } from "../../../../helper/purchaseGstMatch";
import {
  aggregateGstr2aPeriodSummary,
  aggregatePurchasePeriodSummary,
  buildAutoMatchPairs,
  computeTaxDiff,
  enrichDocumentRowsWithMatches,
  enrichVendorRowsWithMatchPct,
  getDocumentMatchStatusBadge,
  getPurchaseMatchIds,
  isTaxDiffOutOfRange,
  mergeVendorRowsWithPr,
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
  const [period, setPeriod] = useState(() =>
    moment().subtract(1, "month").format("YYYY-MM")
  );
  const [tabIndex, setTabIndex] = useState(0);
  const [filterCtin, setFilterCtin] = useState(null);
  const [matchDocument, setMatchDocument] = useState(null);
  const [autoMatching, setAutoMatching] = useState(false);
  const [autoMatchPreviewOpen, setAutoMatchPreviewOpen] = useState(false);
  const [autoMatchPairs, setAutoMatchPairs] = useState([]);
  const [autoMatchUnmatched, setAutoMatchUnmatched] = useState([]);
  /** When true, next switch to Document tab came from vendor GSTIN link — do not clear filter. */
  const documentTabFromGstinLinkRef = useRef(false);
  const { userConfig } = useUser();

  const { invoices, loading, error } = useGstB2bInvoices(period);

  useEffect(() => {
    setFilterCtin(null);
  }, [period]);

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
    vendorPrByGstin,
    loading: prLoading,
    error: prError,
    refetch: refetchPr,
  } = useGstr2aPurchaseRegisterPr(period);

  const vendorRows = useMemo(() => {
    const from2A = aggregateVendors(invoices);
    const merged = mergeVendorRowsWithPr(from2A, vendorPrByGstin);
    return enrichVendorRowsWithMatchPct(merged, invoices, matches);
  }, [invoices, vendorPrByGstin, matches]);

  const documentRows = useMemo(() => {
    const rows = enrichDocumentRowsWithMatches(
      buildDocumentRows(invoices),
      purchases,
      matches
    );
    const f = (filterCtin || "").trim();
    if (!f) return rows;
    return rows.filter((r) => (r.ctin || "").trim() === f);
  }, [invoices, filterCtin, purchases, matches]);

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
    const employeeId = parseInt(String(userConfig?.employeeId ?? ""), 10);
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
  }, [autoMatchPairs, userConfig?.employeeId, refetchPr]);

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
          const matched = Boolean(params.data?.isMatched);
          return [
            {
              label: matched ? "Matched" : "Match",
              icon: matched ? "fa-solid fa-check" : "fa-solid fa-link",
              colorScheme,
              onClick: () => onOpenMatch(params.data),
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
    [onOpenMatch, colorScheme]
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
        Return month
      </FormLabel>
      <Input
        type="month"
        size="sm"
        maxW="168px"
        value={period}
        max={moment().format("YYYY-MM")}
        onChange={(e) => setPeriod(e.target.value)}
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
          period={period}
          purchases={purchases}
          matches={matches}
          prLoading={prLoading}
          prError={prError}
          onMatchChanged={refetchPr}
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
                      tableKey={`gst-gstr2a-pr-vendor-${period}`}
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
                      <Button
                        type="button"
                        colorScheme={colorScheme}
                        size="sm"
                        leftIcon={
                          <i className="fa-solid fa-wand-magic-sparkles" />
                        }
                        onClick={handleOpenAutoMatchPreview}
                        isLoading={autoMatching && !autoMatchPreviewOpen}
                        isDisabled={pageLoading || unmatchedDocumentCount === 0}
                      >
                        Auto match
                        {unmatchedDocumentCount > 0
                          ? ` (${unmatchedDocumentCount} unmatched)`
                          : ""}
                      </Button>
                    </Flex>
                    <AgGrid
                      rowData={documentRows}
                      columnDefs={documentColDefs}
                      tableKey={`gst-gstr2a-pr-doc-${period}`}
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
