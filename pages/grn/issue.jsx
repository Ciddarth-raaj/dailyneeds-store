import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import moment from "moment";
import { useRouter } from "next/router";
import {
  Badge,
  Box,
  Button,
  Flex,
  Image,
  Text,
  Tooltip,
  useToken,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import MonthStatusCalendar from "../../components/calendar/MonthStatusCalendar";
import GrnHighlightLoader from "../../components/grn/GrnHighlightLoader";
import GrnPriceCheckerItemsModal from "../../components/grn/GrnPriceCheckerItemsModal";
import AddToOfferV3Modal from "../../components/grn/AddToOfferV3Modal";
import { useGrnIssues } from "../../customHooks/useGrnIssues";
import { ignoreGrnIssues } from "../../helper/grnList";
import usePermissions from "../../customHooks/usePermissions";
import {
  formatDiscountPct,
  formatOfferDetails,
  getGrnLinePriceMismatch,
} from "../../util/grn";
import { capitalize } from "../../util/string";
import toast from "react-hot-toast";

const colWidth = 120;

// Older GRNs were flagged against stale/incomplete Price Checker data and
// are not real issues -- only show mismatches from this date onward.
const ISSUE_MISMATCH_START_DATE = "2026-08-23";

function queryDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return moment(value, "YYYY-MM-DD", true).isValid() ? value : null;
}

function productDisplayName(product) {
  const name = product?.de_name ?? product?.de_display_name;
  return name ? capitalize(String(name)) : "";
}

function GrnIssueListing() {
  const router = useRouter();
  const [linkColor] = useToken("colors", ["purple.600"]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewingMonth, setViewingMonth] = useState(() =>
    moment().clone().startOf("month")
  );
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addOfferProduct, setAddOfferProduct] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [ignoring, setIgnoring] = useState(false);
  const canIgnore = usePermissions("ignore_grn_issues");
  const canAddOfferV3 = usePermissions("add_offers_v3");
  const hydratedFromQuery = useRef(false);

  useEffect(() => {
    if (!router.isReady || hydratedFromQuery.current) return;
    hydratedFromQuery.current = true;
    const dateFromQuery = queryDate(router.query.date);
    if (dateFromQuery) {
      setSelectedDate(dateFromQuery);
      setViewingMonth(moment(dateFromQuery, "YYYY-MM-DD").startOf("month"));
    }
  }, [router.isReady, router.query.date]);

  useEffect(() => {
    if (!router.isReady || !hydratedFromQuery.current) return;
    const currentQueryDate = router.query.date ?? null;
    if (currentQueryDate === selectedDate) return;
    router.replace(
      {
        pathname: "/grn/issue",
        query: selectedDate ? { date: selectedDate } : {},
      },
      undefined,
      { shallow: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, router.isReady]);

  const viewingMonthDateRange = useMemo(() => {
    const start = moment(viewingMonth).startOf("month");
    const end = moment(viewingMonth).endOf("month");
    const cutoff = moment(ISSUE_MISMATCH_START_DATE, "YYYY-MM-DD");
    if (end.isBefore(cutoff, "day")) {
      return { from_date: null, to_date: null, valid: false };
    }
    const from = moment.max(start, cutoff);
    return {
      from_date: from.format("YYYY-MM-DD"),
      to_date: end.format("YYYY-MM-DD"),
      valid: true,
    };
  }, [viewingMonth]);

  const { items, itemsByProductId, loading, error, refetch } = useGrnIssues(
    viewingMonthDateRange,
    { enabled: viewingMonthDateRange.valid }
  );

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load GRN issues.");
    }
  }, [error]);

  useEffect(() => {
    setSelectedRows([]);
  }, [items]);

  const handleSelectionChanged = useCallback((rows) => {
    setSelectedRows(rows ?? []);
  }, []);

  const handleIgnoreRows = useCallback(
    async (rows) => {
      if (!Array.isArray(rows) || rows.length === 0) return;
      setIgnoring(true);
      try {
        await ignoreGrnIssues(
          rows.map((row) => ({
            refno: row.grn_refno,
            sl_no: row.mmd_mrc_sl_no,
            product_id: row.product_id ?? null,
          }))
        );
        toast.success(
          rows.length === 1
            ? "Item ignored."
            : `${rows.length} items ignored.`
        );
        setSelectedRows([]);
        refetch();
      } catch (err) {
        toast.error(err?.message || "Failed to ignore item(s).");
      } finally {
        setIgnoring(false);
      }
    },
    [refetch]
  );

  const allIssueRows = useMemo(() => {
    return (items || [])
      .filter((item) => {
        const dayKey = String(item?.mmh_mrc_dt ?? "").slice(0, 10);
        return dayKey >= ISSUE_MISMATCH_START_DATE;
      })
      .filter((item) => getGrnLinePriceMismatch(item, itemsByProductId, false))
      .map((item) => ({
        id: `${item.mmh_mrc_refno}-${item.mmd_mrc_sl_no}`,
        grn_refno: item.mmh_mrc_refno,
        mrc_date: item.mmh_mrc_dt,
        supplier_name: item.supplier_name,
        ...item,
      }));
  }, [items, itemsByProductId]);

  const statsByDay = useMemo(() => {
    const map = {};
    allIssueRows.forEach((row) => {
      const raw = row?.mrc_date;
      if (raw == null || raw === "") return;
      const d = String(raw).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      map[d] = (map[d] ?? 0) + 1;
    });
    return map;
  }, [allIssueRows]);

  const getDayVisual = (date) => {
    const key = date.format("YYYY-MM-DD");
    const count = statsByDay[key] ?? 0;
    if (count === 0) {
      return {
        bg: "gray.50",
        border: "gray.200",
        text: "gray.500",
        primary: "0",
        secondary: "No issues",
      };
    }
    return {
      bg: "red.50",
      border: "red.200",
      text: "red.700",
      primary: String(count),
      secondary: count === 1 ? "Issue" : "Issues",
    };
  };

  const displayRowData = useMemo(() => {
    if (!selectedDate) return allIssueRows;
    return allIssueRows.filter(
      (row) => String(row?.mrc_date ?? "").slice(0, 10) === selectedDate
    );
  }, [allIssueRows, selectedDate]);

  const colDefs = useMemo(
    () => [
      {
        field: "grn_refno",
        headerName: "GRN No",
        type: "id",
        pinned: "left",
        flex: 0,
        minWidth: colWidth,
        cellStyle: {
          cursor: "pointer",
          color: linkColor,
          textDecoration: "underline",
        },
        onCellClicked: (params) => {
          const refno = params.data?.grn_refno;
          if (refno == null || refno === "") return;
          const from = encodeURIComponent(router.asPath);
          router.push(
            `/grn/view?refno=${encodeURIComponent(String(refno))}&from=${from}`
          );
        },
      },
      {
        field: "mrc_date",
        headerName: "MRC Date",
        type: "date",
        pinned: "left",
        flex: 0,
        maxWidth: 130,
      },
      {
        field: "supplier_name",
        headerName: "Supplier Name",
        type: "capitalized",
        pinned: "left",
        flex: 0,
        minWidth: 180,
        width: 180,
      },
      {
        field: "product_id",
        headerName: "Product ID",
        type: "id",
        pinned: "left",
        flex: 0,
        minWidth: 100,
        cellStyle: {
          cursor: "pointer",
          color: linkColor,
          textDecoration: "underline",
        },
        onCellClicked: (params) => {
          const productId = params.data?.product_id;
          if (productId == null || productId === "") return;
          setSelectedProduct({
            productId,
            productName: productDisplayName(params.data?.product),
            mrp: params.data.mrp,
            sp: params.data.mmd_sale_rate,
            discountPct: params.data.discount_pct,
            discountAmount: params.data.discount_amount,
            purchasePrice: params.data.mmd_pur_price,
            isIgnored: Boolean(params.data.is_ignored),
          });
        },
      },
      {
        field: "product.image_link",
        headerName: "Image",
        pinned: "left",
        flex: 0,
        minWidth: 72,
        width: 72,
        sortable: false,
        filter: false,
        cellStyle: { lineHeight: 1, paddingTop: 2, paddingBottom: 2 },
        valueGetter: (params) => params.data?.product?.image_link,
        cellRenderer: (params) => {
          if (!params.value) return "—";
          return (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              h="100%"
            >
              <Image
                src={params.value}
                alt=""
                sx={{
                  maxWidth: "48px",
                  maxHeight: "48px",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                }}
                borderRadius="sm"
              />
            </Box>
          );
        },
      },
      {
        headerName: "Name",
        type: "capitalized",
        pinned: "left",
        flex: 0,
        minWidth: 220,
        valueGetter: (params) => {
          const name = productDisplayName(params.data?.product);
          return name || "—";
        },
      },
      {
        field: "is_offer_product",
        headerName: "Offer",
        type: "badge-column",
        pinned: "left",
        flex: 0,
        minWidth: 90,
        maxWidth: canAddOfferV3 ? 110 : 90,
        valueGetter: (params) =>
          params.data?.is_offer_product
            ? { label: "Offer", colorScheme: "blue" }
            : null,
        cellRenderer: (params) => {
          if (params.value) {
            const tooltipLabel = formatOfferDetails(params.data?.offer_details);
            return (
              <Flex alignItems="center" h="100%">
                <Tooltip
                  label={tooltipLabel}
                  whiteSpace="pre-line"
                  isDisabled={!tooltipLabel}
                  hasArrow
                >
                  <Badge colorScheme={params.value.colorScheme}>
                    {params.value.label}
                  </Badge>
                </Tooltip>
              </Flex>
            );
          }
          if (!canAddOfferV3) return null;
          return (
            <Button
              size="xs"
              variant="link"
              colorScheme="purple"
              onClick={() =>
                setAddOfferProduct({
                  productId: params.data?.product_id,
                  productName: productDisplayName(params.data?.product),
                })
              }
            >
              Add
            </Button>
          );
        },
      },
      {
        field: "mmd_recd_qty",
        headerName: "Recd. Qty",
        type: "number",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "mmd_free_qty",
        headerName: "Free Qty",
        type: "number",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "mrp",
        headerName: "MRP",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "mmd_pur_rate",
        headerName: "Pur. Rate",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "mmd_sale_rate",
        headerName: "SP",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "mmd_pur_tax_per",
        headerName: "Pur. Tax %",
        type: "number",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "mmd_pur_tax_amt",
        headerName: "Pur. Tax Amt",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "mmd_pur_price",
        headerName: "Net Cost",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "mmd_pur_amount",
        headerName: "Total Amt",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "discount_amount",
        headerName: "Discount Amount",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "discount_pct",
        headerName: "Discount %",
        flex: 0,
        minWidth: colWidth,
        valueFormatter: (params) => formatDiscountPct(params.value),
        cellRenderer: (params) => formatDiscountPct(params.value),
      },
      ...(canIgnore
        ? [
            {
              headerName: "Actions",
              colId: "actions",
              flex: 0,
              minWidth: colWidth,
              sortable: false,
              filter: false,
              cellRenderer: (params) => (
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="red"
                  isLoading={ignoring}
                  onClick={() => handleIgnoreRows([params.data])}
                >
                  Ignore
                </Button>
              ),
            },
          ]
        : []),
    ],
    [linkColor, router, canIgnore, ignoring, handleIgnoreRows, canAddOfferV3]
  );

  const gridOptions = useMemo(
    () => ({
      getRowId: (params) => String(params.data?.id),
      defaultColDef: {
        flex: 0,
        suppressSizeToFit: true,
      },
      rowHeight: 56,
    }),
    []
  );

  const tableTitle = selectedDate
    ? `Issue GRN (${moment(selectedDate).format("DD/MM/YYYY")})`
    : `Issue GRN (${moment(viewingMonth).format("MMMM YYYY")})`;

  return (
    <GlobalWrapper title="Issue GRN" permissionKey="view_issue_grn">
      <Flex flexDirection="column" gap={6}>
        <MonthStatusCalendar
          title="GRN issues by date"
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          viewingMonth={viewingMonth}
          onViewingMonthChange={setViewingMonth}
          loading={loading}
          getDayVisual={getDayVisual}
          headerRight={
            selectedDate ? (
              <Button
                size="sm"
                variant="outline"
                colorScheme="purple"
                onClick={() => setSelectedDate(null)}
              >
                Show whole month
              </Button>
            ) : null
          }
        />

        <CustomContainer
          title={tableTitle}
          filledHeader
          rightSection={
            canIgnore && selectedRows.length > 0 ? (
              <Button
                size="sm"
                colorScheme="red"
                isLoading={ignoring}
                onClick={() => handleIgnoreRows(selectedRows)}
              >
                Ignore selected ({selectedRows.length})
              </Button>
            ) : null
          }
        >
          {loading ? (
            <GrnHighlightLoader
              label="Loading GRN issues..."
              minH="240px"
            />
          ) : displayRowData.length === 0 ? (
            <Text color="gray.500" py={6} textAlign="center">
              No price mismatches found for this{" "}
              {selectedDate ? "date" : "month"}.
            </Text>
          ) : (
            <AgGrid
              rowData={displayRowData}
              columnDefs={colDefs}
              tableKey="grn-issue-list"
              height="70vh"
              selectMode={canIgnore}
              onSelectionChanged={handleSelectionChanged}
              gridOptions={gridOptions}
            />
          )}
        </CustomContainer>
      </Flex>

      <GrnPriceCheckerItemsModal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        productId={selectedProduct?.productId}
        productName={selectedProduct?.productName}
        grnMrp={selectedProduct?.mrp}
        grnSp={selectedProduct?.sp}
        grnDiscountPct={selectedProduct?.discountPct}
        grnDiscountAmount={selectedProduct?.discountAmount}
        grnPurchasePrice={selectedProduct?.purchasePrice}
        isIgnored={selectedProduct?.isIgnored}
        priceCheckerRows={
          selectedProduct?.productId != null
            ? itemsByProductId.get(selectedProduct.productId) ?? []
            : undefined
        }
        priceCheckerLoading={loading}
      />

      <AddToOfferV3Modal
        isOpen={Boolean(addOfferProduct)}
        onClose={() => setAddOfferProduct(null)}
        productId={addOfferProduct?.productId}
        productName={addOfferProduct?.productName}
        onCreated={() => {
          setAddOfferProduct(null);
          refetch();
        }}
      />
    </GlobalWrapper>
  );
}

export default GrnIssueListing;
