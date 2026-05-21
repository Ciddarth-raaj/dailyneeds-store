import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Spinner,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import { useUser } from "../../contexts/UserContext";
import {
  deletePurchaseGstMatch,
  upsertPurchaseGstMatch,
} from "../../helper/purchaseGstMatch";
import currencyFormatter from "../../util/currencyFormatter";
import {
  buildPurchasesMatchedElsewhere,
  findMatchForDocument,
  findPurchaseByMatch,
  getPurchaseDisplayTotalAmount,
  getPurchaseMatchIds,
  getPurchaseRegisterRowKey,
  getPurchaseTaxable,
  getPurchaseTotalTax,
  isPurchaseLockedByOtherMatch,
  normalizeGstin,
  parseDecimal,
  stringsMatchInvoice,
} from "../../util/gstr2aPurchaseRegister";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";

function parseDocDate(dateStr) {
  if (!dateStr || dateStr === "—") return null;
  const m = moment(
    dateStr,
    ["DD-MM-YYYY", "D-M-YYYY", "YYYY-MM-DD", moment.ISO_8601],
    true
  );
  return m.isValid() ? m : null;
}

function isMatchablePurchase(item) {
  return item?.gst_tally_purchase_id != null;
}

const MATCH_COLOR = "var(--chakra-colors-green-600)";

function amountsMatch(a, b) {
  return Math.round(parseDecimal(a)) === Math.round(parseDecimal(b));
}

function stringsMatch(a, b) {
  return stringsMatchInvoice(a, b);
}

function datesMatch(purchaseDate, docDateStr) {
  const docMoment = parseDocDate(docDateStr);
  const purchaseMoment = moment(purchaseDate);
  if (!docMoment || !purchaseMoment.isValid()) return false;
  return docMoment.isSame(purchaseMoment, "day");
}

function MatchCell({ match, children }) {
  return (
    <Flex align="center" h="100%">
      <span
        style={{
          color: match ? MATCH_COLOR : undefined,
          fontWeight: match ? 600 : undefined,
        }}
      >
        {children}
      </span>
    </Flex>
  );
}

function invoiceSortRank(invoiceNo, docInvoice) {
  if (stringsMatch(invoiceNo, docInvoice)) return 0;
  const a = String(invoiceNo ?? "")
    .trim()
    .toUpperCase();
  const b = String(docInvoice ?? "")
    .trim()
    .toUpperCase();
  if (!a || !b || a === "—" || b === "—") return 2;
  if (a.includes(b) || b.includes(a)) return 1;
  return 2;
}

function sortPurchasesForMatch(purchases, docInvoice, docDate, docTax) {
  const docMoment = parseDocDate(docDate);
  const docTaxNum = parseDecimal(docTax);

  return [...purchases].sort((a, b) => {
    const invA = invoiceSortRank(a.mmh_dist_bill_no, docInvoice);
    const invB = invoiceSortRank(b.mmh_dist_bill_no, docInvoice);
    if (invA !== invB) return invA - invB;

    const billA = moment(a.mmh_dist_bill_dt);
    const billB = moment(b.mmh_dist_bill_dt);
    const dateDiffA =
      docMoment && billA.isValid()
        ? Math.abs(docMoment.diff(billA, "days"))
        : Number.MAX_SAFE_INTEGER;
    const dateDiffB =
      docMoment && billB.isValid()
        ? Math.abs(docMoment.diff(billB, "days"))
        : Number.MAX_SAFE_INTEGER;
    if (dateDiffA !== dateDiffB) return dateDiffA - dateDiffB;

    const taxDiffA = Math.abs(getPurchaseTotalTax(a) - docTaxNum);
    const taxDiffB = Math.abs(getPurchaseTotalTax(b) - docTaxNum);
    if (taxDiffA !== taxDiffB) return taxDiffA - taxDiffB;

    return getPurchaseDisplayTotalAmount(a) - getPurchaseDisplayTotalAmount(b);
  });
}

function DetailItem({ label, value }) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={0.5}>
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="medium">
        {value ?? "—"}
      </Text>
    </Box>
  );
}

export default function Gstr2aMatchModal({
  isOpen,
  onClose,
  documentRow,
  period,
  purchases: allPurchases = [],
  matches = [],
  prLoading = false,
  prError = null,
  onMatchChanged,
}) {
  const { colorScheme: cs } = useModuleTableTheme();
  const { userConfig } = useUser();
  const gridRef = useRef(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const existingMatch = useMemo(() => {
    if (!documentRow) return null;
    return findMatchForDocument(documentRow, allPurchases, matches);
  }, [documentRow, allPurchases, matches]);

  const lockedByOtherMatch = useMemo(
    () =>
      buildPurchasesMatchedElsewhere(
        matches,
        documentRow?.gst_b2b_invoice_id
      ),
    [matches, documentRow?.gst_b2b_invoice_id]
  );

  const purchases = useMemo(() => {
    if (!isOpen || !documentRow) return [];
    const gstin = normalizeGstin(documentRow.ctin);
    const filtered = (allPurchases || []).filter(
      (p) =>
        normalizeGstin(p.supplier_gstn) === gstin && isMatchablePurchase(p)
    );
    return sortPurchasesForMatch(
      filtered,
      documentRow.docNo2A,
      documentRow.docDate2A,
      documentRow.totalTax2A
    ).map((p) => ({
      ...p,
      _lockedByOtherMatch: isPurchaseLockedByOtherMatch(p, lockedByOtherMatch),
    }));
  }, [isOpen, documentRow, allPurchases, lockedByOtherMatch]);

  const isRowSelectable = useCallback(
    (node) => !node.data?._lockedByOtherMatch,
    []
  );

  const matchedPurchaseInGrid = useMemo(() => {
    if (!existingMatch?.match || !purchases.length) return null;
    return findPurchaseByMatch(existingMatch.match, purchases);
  }, [existingMatch, purchases]);

  const loading = isOpen && prLoading;
  const fetchError = isOpen ? prError : null;

  const applyPreselection = useCallback(() => {
    const api = gridRef.current?.api;
    if (!api) return;

    if (!matchedPurchaseInGrid) {
      api.deselectAll();
      return;
    }

    const rowId = getPurchaseRegisterRowKey(matchedPurchaseInGrid);
    if (!rowId) return;

    api.deselectAll();
    const node = api.getRowNode(rowId);
    if (node && !node.data?._lockedByOtherMatch) {
      node.setSelected(true);
      setSelectedPurchase(node.data);
    }
  }, [matchedPurchaseInGrid]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedPurchase(null);
      return;
    }
    if (matchedPurchaseInGrid) {
      setSelectedPurchase(matchedPurchaseInGrid);
    } else {
      setSelectedPurchase(null);
    }
  }, [isOpen, documentRow, period, matchedPurchaseInGrid]);

  useEffect(() => {
    if (!isOpen || !matchedPurchaseInGrid) return;
    const id = requestAnimationFrame(() => applyPreselection());
    return () => cancelAnimationFrame(id);
  }, [isOpen, purchases, matchedPurchaseInGrid, applyPreselection]);

  const gridOptions = useMemo(
    () => ({
      getRowStyle: (params) =>
        params.data?._lockedByOtherMatch
          ? { opacity: 0.45, cursor: "not-allowed" }
          : undefined,
      onFirstDataRendered: () => applyPreselection(),
      onRowDataUpdated: () => applyPreselection(),
    }),
    [applyPreselection]
  );

  const columnDefs = useMemo(() => {
    const doc = documentRow;
    if (!doc) return [];

    return [
      {
        field: "mmh_mrc_refno",
        headerName: "MRC Ref No",
        filter: true,
        sortable: false,
      },
      {
        field: "mmh_dist_bill_no",
        headerName: "Invoice No",
        filter: true,
        sortable: false,
        minWidth: 130,
        cellRenderer: (params) => {
          const v = params.value;
          const display = v == null || v === "" ? "—" : String(v);
          return (
            <MatchCell match={stringsMatch(v, doc.docNo2A)}>{display}</MatchCell>
          );
        },
      },
      {
        field: "mmh_dist_bill_dt",
        headerName: "Dist Bill Date",
        sortable: false,
        minWidth: 130,
        cellRenderer: (params) => {
          const display = params.value
            ? moment(params.value).format("DD/MM/YYYY")
            : "—";
          return (
            <MatchCell match={datesMatch(params.value, doc.docDate2A)}>
              {display}
            </MatchCell>
          );
        },
      },
      {
        colId: "taxable_value",
        headerName: "Taxable Value",
        sortable: false,
        minWidth: 120,
        valueGetter: (p) => getPurchaseTaxable(p.data),
        cellRenderer: (params) => {
          const val = params.value;
          if (val === undefined || val === null) return "—";
          return (
            <MatchCell match={amountsMatch(val, doc.taxable2A)}>
              {currencyFormatter(val)}
            </MatchCell>
          );
        },
      },
      {
        colId: "total_tax",
        headerName: "Total Tax",
        sortable: false,
        minWidth: 110,
        valueGetter: (p) => getPurchaseTotalTax(p.data),
        cellRenderer: (params) => {
          const val = params.value;
          if (val === undefined || val === null) return "—";
          return (
            <MatchCell match={amountsMatch(val, doc.totalTax2A)}>
              {currencyFormatter(val)}
            </MatchCell>
          );
        },
      },
      {
        colId: "display_total_amount",
        headerName: "Total Amount",
        sortable: false,
        minWidth: 120,
        valueGetter: (p) => getPurchaseDisplayTotalAmount(p.data),
        cellRenderer: (params) => {
          const val = params.value;
          if (val === undefined || val === null) return "—";
          return currencyFormatter(val);
        },
      },
    ];
  }, [documentRow]);

  const handleSelectionChanged = useCallback((rows) => {
    const selectable = (rows || []).filter((r) => !r._lockedByOtherMatch);
    if (!selectable.length) {
      setSelectedPurchase(null);
      return;
    }
    if (selectable.length === 1) {
      setSelectedPurchase(selectable[0]);
      return;
    }
    const last = selectable[selectable.length - 1];
    const api = gridRef.current?.api;
    if (api) {
      api.deselectAll();
      api.getRowNode(getPurchaseRegisterRowKey(last))?.setSelected(true);
    }
    setSelectedPurchase(last);
  }, []);

  const handleClose = () => {
    setSelectedPurchase(null);
    onClose();
  };

  const handleMatch = useCallback(async () => {
    if (!selectedPurchase || !documentRow) return;

    const employeeId = parseInt(String(userConfig?.employeeId ?? ""), 10);
    if (!Number.isFinite(employeeId)) {
      toast.error("Employee ID not found. Please sign in again.");
      return;
    }

    const invoiceId = documentRow.gst_b2b_invoice_id;
    if (invoiceId == null) {
      toast.error("GSTR-2A invoice id not found for this document.");
      return;
    }

    const ids = getPurchaseMatchIds(selectedPurchase);
    if (ids.purchase_id == null && ids.gst_tally_purchase_id == null) {
      toast.error("Could not resolve purchase id for the selected row.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        gst_b2b_invoice_id: invoiceId,
        ...ids,
        matched_by: employeeId,
      };
      const matchId =
        existingMatch?.match?.gst_purchase_match_id ??
        documentRow.gst_purchase_match_id;
      if (matchId != null) {
        body.gst_purchase_match_id = matchId;
      }

      const data = await upsertPurchaseGstMatch(body);
      if (data.code === 200) {
        toast.success(data.updated ? "Match updated" : "Match saved");
        await onMatchChanged?.();
        onClose();
      } else {
        toast.error(data?.msg || "Failed to save match");
      }
    } catch (e) {
      toast.error(e?.message || "Failed to save match");
    } finally {
      setSaving(false);
    }
  }, [
    selectedPurchase,
    documentRow,
    userConfig?.employeeId,
    existingMatch,
    onMatchChanged,
    onClose,
  ]);

  const handleClearMatch = useCallback(async () => {
    const matchId =
      existingMatch?.match?.gst_purchase_match_id ??
      documentRow?.gst_purchase_match_id;
    if (!matchId) return;

    setClearing(true);
    try {
      const data = await deletePurchaseGstMatch(matchId);
      if (data.code === 200) {
        toast.success("Match cleared");
        await onMatchChanged?.();
        onClose();
      } else {
        toast.error(data?.msg || "Failed to clear match");
      }
    } catch (e) {
      toast.error(e?.message || "Failed to clear match");
    } finally {
      setClearing(false);
    }
  }, [existingMatch, documentRow, onMatchChanged, onClose]);

  const hasExistingMatch = Boolean(existingMatch?.match);

  const footer = (
    <Flex justify="flex-end" gap={3} w="100%">
      {hasExistingMatch ? (
        <Button
          variant="outline"
          colorScheme="red"
          onClick={handleClearMatch}
          isLoading={clearing}
          isDisabled={saving}
        >
          Clear match
        </Button>
      ) : null}
      <Button variant="ghost" onClick={handleClose} isDisabled={saving || clearing}>
        Cancel
      </Button>
      <Button
        colorScheme={cs}
        isDisabled={!selectedPurchase}
        isLoading={saving}
        onClick={handleMatch}
      >
        Match
      </Button>
    </Flex>
  );

  if (!documentRow) return null;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Match document"
      size="6xl"
      scrollBehavior="inside"
      bodyProps={{ p: "24px" }}
      footer={footer}
    >
      <Text fontSize="sm" fontWeight="semibold" color={`${cs}.700`} mb={3}>
        GSTR-2A document
      </Text>
      <Grid
        templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
        gap={4}
        mb={6}
        p={4}
        bg="gray.50"
        borderRadius="md"
        borderWidth="1px"
        borderColor="gray.100"
      >
        <GridItem>
          <DetailItem label="Supplier" value={documentRow.supplierName} />
        </GridItem>
        <GridItem>
          <DetailItem label="GSTIN" value={documentRow.ctin} />
        </GridItem>
        <GridItem>
          <DetailItem label="Document No." value={documentRow.docNo2A} />
        </GridItem>
        <GridItem>
          <DetailItem label="Document Date" value={documentRow.docDate2A} />
        </GridItem>
        <GridItem>
          <DetailItem
            label="Taxable Value"
            value={currencyFormatter(documentRow.taxable2A)}
          />
        </GridItem>
        <GridItem>
          <DetailItem
            label="Total Tax"
            value={currencyFormatter(documentRow.totalTax2A)}
          />
        </GridItem>
        <GridItem>
          <DetailItem
            label="Total Value"
            value={currencyFormatter(documentRow.totalValue2A)}
          />
        </GridItem>
      </Grid>

      <Text fontSize="sm" fontWeight="semibold" color={`${cs}.700`} mb={2}>
        Purchases ({period ? moment(period, "YYYY-MM").format("MMMM YYYY") : ""}
        )
      </Text>
      <Text fontSize="xs" color="gray.600" mb={3}>
        Showing pushed-to-Tally purchases for GSTIN {documentRow.ctin}. Sorted
        by invoice no, bill date, total tax, then total amount. Matching fields
        are shown in green. Rows already matched to another document cannot be
        selected.
      </Text>

      {loading ? (
        <Flex justify="center" py={8}>
          <Spinner color={`${cs}.500`} />
        </Flex>
      ) : fetchError ? (
        <Text color="red.500" fontSize="sm">
          {fetchError}
        </Text>
      ) : purchases.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No pushed-to-Tally purchases found for this GSTIN in the selected
          period.
        </Text>
      ) : (
        <AgGrid
          ref={gridRef}
          rowData={purchases}
          columnDefs={columnDefs}
          tableKey={`gst-gstr2a-match-${period}`}
          tableColorScheme={cs}
          selectMode
          isRowSelectable={isRowSelectable}
          onSelectionChanged={handleSelectionChanged}
          getRowId={(params) => getPurchaseRegisterRowKey(params.data)}
          gridOptions={gridOptions}
        />
      )}
    </CustomModal>
  );
}
