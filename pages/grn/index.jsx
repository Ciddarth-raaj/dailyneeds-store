import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import moment from "moment";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import GrnMonthCalendar from "../../components/grn/GrnMonthCalendar";
import GrnHighlightLoader from "../../components/grn/GrnHighlightLoader";
import { Flex, IconButton, Tooltip, useToken } from "@chakra-ui/react";
import { useGrnList } from "../../customHooks/useGrnList";
import { useGrnDetailsByRefno } from "../../customHooks/useGrnDetailsByRefno";
import { useGrnPriceCheckerItemsMap } from "../../customHooks/useGrnPriceCheckerItemsMap";
import {
  getMismatchRowStyle,
  grnDetailHasPriceMismatch,
  sortRowsMismatchFirst,
} from "../../util/grn";
import toast from "react-hot-toast";

function queryDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  return moment(value, "YYYY-MM-DD", true).isValid() ? value : null;
}

function GrnListing() {
  const router = useRouter();
  const [mismatchBg] = useToken("colors", ["red.100"]);
  const [selectedDate, setSelectedDate] = useState(() =>
    moment().format("YYYY-MM-DD")
  );
  const [viewingMonth, setViewingMonth] = useState(() =>
    moment().clone().startOf("month")
  );
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
    if (router.query.date === selectedDate) return;
    router.replace(
      { pathname: "/grn", query: { date: selectedDate } },
      undefined,
      { shallow: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, router.isReady]);

  const viewingMonthDateRange = useMemo(() => {
    const start = moment(viewingMonth).startOf("month");
    const end = moment(viewingMonth).endOf("month");
    return {
      from_date: start.format("YYYY-MM-DD"),
      to_date: end.format("YYYY-MM-DD"),
    };
  }, [viewingMonth]);

  const { grnList, loading, error } = useGrnList(viewingMonthDateRange);

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load GRN list.");
    }
  }, [error]);

  const rowData = useMemo(() => {
    return (grnList || []).filter((row) => {
      const raw = row?.mmh_mrc_dt;
      if (raw == null || raw === "") return false;
      const dayKey = String(raw).slice(0, 10);
      return dayKey === selectedDate;
    });
  }, [grnList, selectedDate]);

  const refnos = useMemo(
    () => rowData.map((row) => row?.mmh_mrc_refno).filter(Boolean),
    [rowData]
  );

  const { detailsByRefno, loading: detailsLoading } = useGrnDetailsByRefno(
    refnos,
    { enabled: !loading && refnos.length > 0 }
  );

  const productIds = useMemo(() => {
    const ids = new Set();
    detailsByRefno.forEach((detail) => {
      (detail?.items ?? []).forEach((item) => {
        if (item?.product_id != null) ids.add(item.product_id);
      });
    });
    return [...ids];
  }, [detailsByRefno]);

  const { itemsByProductId, loading: pcLoading } = useGrnPriceCheckerItemsMap(
    productIds,
    { enabled: !detailsLoading && productIds.length > 0 }
  );

  const highlightReady = !detailsLoading && !pcLoading;
  const highlightLoading =
    !loading && refnos.length > 0 && (detailsLoading || pcLoading);

  const displayRowData = useMemo(() => {
    const withFlags = rowData.map((row) => {
      const refno = row?.mmh_mrc_refno != null ? String(row.mmh_mrc_refno) : "";
      const items = detailsByRefno.get(refno)?.items ?? [];
      return {
        ...row,
        _priceMismatch:
          highlightReady &&
          grnDetailHasPriceMismatch(items, itemsByProductId, false),
      };
    });
    return sortRowsMismatchFirst(withFlags, (row) => row._priceMismatch);
  }, [rowData, detailsByRefno, itemsByProductId, highlightReady]);

  const colDefs = useMemo(
    () => [
      {
        field: "mmh_mrc_refno",
        headerName: "GRN No",
        type: "id",
        flex: 1,
      },
      {
        field: "mmh_mrc_dt",
        headerName: "MRC Date",
        type: "date",
        maxWidth: 130,
      },
      {
        field: "supplier_name",
        headerName: "Supplier Name",
        type: "capitalized",
        flex: 2,
      },
      {
        field: "mmh_mrc_amt",
        headerName: "MRC Amount",
        type: "currency",
        maxWidth: 140,
      },
      {
        field: "product_count",
        headerName: "No of products",
        type: "number",
        maxWidth: 160,
      },
      {
        colId: "purchase_uom_action",
        headerName: "",
        flex: 0,
        minWidth: 60,
        maxWidth: 60,
        sortable: false,
        filter: false,
        cellRenderer: (params) => {
          const refno = params.data?.mmh_mrc_refno;
          if (refno == null || refno === "") return null;
          return (
            <Tooltip label="Purchase UOM" hasArrow>
              <IconButton
                aria-label="Purchase UOM"
                icon={<i className="fa fa-ruler-combined" />}
                size="xs"
                variant="outline"
                colorScheme="purple"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(
                    `/grn/purchase-uom?refno=${encodeURIComponent(String(refno))}`
                  );
                }}
              />
            </Tooltip>
          );
        },
      },
    ],
    [router]
  );

  const handleRowClicked = useCallback(
    (event) => {
      const refno = event?.data?.mmh_mrc_refno;
      if (refno == null || refno === "") return;
      const from = encodeURIComponent(router.asPath);
      router.push(
        `/grn/view?refno=${encodeURIComponent(String(refno))}&from=${from}`
      );
    },
    [router]
  );

  const gridOptions = useMemo(
    () => ({
      onRowClicked: handleRowClicked,
      getRowStyle: (params) => ({
        cursor: "pointer",
        ...getMismatchRowStyle(params.data?._priceMismatch, mismatchBg),
      }),
    }),
    [handleRowClicked, mismatchBg]
  );

  return (
    <GlobalWrapper title="All GRN" permissionKey="view_all_grn">
      <Flex flexDirection="column" gap={6}>
        <GrnMonthCalendar
          grnList={grnList}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          viewingMonth={viewingMonth}
          onViewingMonthChange={setViewingMonth}
          loading={loading}
        />

        <CustomContainer
          title={`All GRN (${moment(selectedDate).format("DD/MM/YYYY")})`}
          filledHeader
        >
          {loading || highlightLoading ? (
            <GrnHighlightLoader
              label={
                loading
                  ? "Loading GRN list..."
                  : "Checking price mismatches..."
              }
              minH={loading ? "120px" : "240px"}
            />
          ) : (
            <AgGrid
              rowData={displayRowData}
              columnDefs={colDefs}
              tableKey="grn-list"
              gridOptions={gridOptions}
            />
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default GrnListing;
