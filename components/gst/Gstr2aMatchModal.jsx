import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import { getAllPurchases } from "../../helper/purchase";
import currencyFormatter from "../../util/currencyFormatter";
import { shouldShowIGST } from "../../util/purchase";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";

function parseDecimal(v) {
  if (v == null || v === "") return 0;
  const n = parseFloat(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function parseDocDate(dateStr) {
  if (!dateStr || dateStr === "—") return null;
  const m = moment(
    dateStr,
    ["DD-MM-YYYY", "D-M-YYYY", "YYYY-MM-DD", moment.ISO_8601],
    true
  );
  return m.isValid() ? m : null;
}

function normalizeGstin(g) {
  return (g || "").trim().toUpperCase();
}

function isPushedToTally(item) {
  return Boolean(item?.tally_response?.voucher_no);
}

function isZeroTotalAmount(item) {
  return parseDecimal(item?.total_amount) === 0;
}

function getPurchaseTotalTax(item) {
  if (!item) return 0;
  if (shouldShowIGST(item)) {
    return parseDecimal(item.tot_igst_amt);
  }
  return parseDecimal(item.tot_sgst_amt) + parseDecimal(item.tot_cgst_amt);
}

/** When total amount is 0, taxable is 0; otherwise total amount − tax */
function getPurchaseTaxable(item) {
  if (isZeroTotalAmount(item)) return 0;
  return parseDecimal(item?.total_amount) - getPurchaseTotalTax(item);
}

/** When total amount is 0, show total tax as the total amount */
function getDisplayTotalAmount(item) {
  if (isZeroTotalAmount(item)) return getPurchaseTotalTax(item);
  return parseDecimal(item?.total_amount);
}

const MATCH_COLOR = "var(--chakra-colors-green-600)";

function amountsMatch(a, b) {
  return Math.round(parseDecimal(a)) === Math.round(parseDecimal(b));
}

function stringsMatch(a, b) {
  const na = String(a ?? "")
    .trim()
    .toUpperCase();
  const nb = String(b ?? "")
    .trim()
    .toUpperCase();
  if (!na || !nb || na === "—" || nb === "—") return false;
  return na === nb;
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

    return getDisplayTotalAmount(a) - getDisplayTotalAmount(b);
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
}) {
  const { colorScheme: cs } = useModuleTableTheme();
  const gridRef = useRef(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  const periodRange = useMemo(() => {
    const m = moment(period, "YYYY-MM", true);
    if (!m.isValid()) return null;
    return {
      from: m.clone().startOf("month").toDate(),
      to: m.clone().endOf("month").toDate(),
    };
  }, [period]);

  const loadPurchases = useCallback(async () => {
    if (!isOpen || !periodRange || !documentRow) return;
    setLoading(true);
    setFetchError(null);
    setPurchases([]);
    setSelectedPurchase(null);
    try {
      const startOfDay = new Date(periodRange.from);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(periodRange.to);
      endOfDay.setHours(23, 59, 59, 999);

      const data = await getAllPurchases({
        from_date: startOfDay.toISOString(),
        to_date: endOfDay.toISOString(),
        is_pushed: true,
      });
      if (data.code === 200) {
        const gstin = normalizeGstin(documentRow.ctin);
        const filtered = (data.data || []).filter(
          (p) => normalizeGstin(p.supplier_gstn) === gstin && isPushedToTally(p)
        );
        const sorted = sortPurchasesForMatch(
          filtered,
          documentRow.docNo2A,
          documentRow.docDate2A,
          documentRow.totalTax2A
        );
        setPurchases(sorted);
      } else {
        setFetchError("Failed to load purchases");
      }
    } catch (e) {
      setFetchError(e?.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, [isOpen, periodRange, documentRow]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

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
          const display =
            v == null || v === "" ? "—" : String(v);
          return (
            <MatchCell match={stringsMatch(v, doc.docNo2A)}>
              {display}
            </MatchCell>
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
        valueGetter: (p) => getDisplayTotalAmount(p.data),
        cellRenderer: (params) => {
          const val = params.value;
          if (val === undefined || val === null) return "—";
          return currencyFormatter(val);
        },
      },
    ];
  }, [documentRow]);

  const handleSelectionChanged = useCallback((rows) => {
    if (!rows?.length) {
      setSelectedPurchase(null);
      return;
    }
    if (rows.length === 1) {
      setSelectedPurchase(rows[0]);
      return;
    }
    const last = rows[rows.length - 1];
    const api = gridRef.current?.api;
    if (api) {
      api.deselectAll();
      api.getRowNode(String(last.mmh_mrc_refno))?.setSelected(true);
    }
    setSelectedPurchase(last);
  }, []);

  const handleClose = () => {
    setSelectedPurchase(null);
    onClose();
  };

  const footer = (
    <Flex justify="flex-end" gap={3} w="100%">
      <Button variant="ghost" onClick={handleClose}>
        Cancel
      </Button>
      <Button colorScheme={cs} isDisabled={!selectedPurchase}>
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
        are shown in green.
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
          onSelectionChanged={handleSelectionChanged}
          getRowId={(params) => String(params.data?.mmh_mrc_refno ?? "")}
        />
      )}
    </CustomModal>
  );
}
