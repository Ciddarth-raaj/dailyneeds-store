import React, { useMemo, useCallback, useRef, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Text, Button, Flex } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { usePurchaseAcknowledgements } from "../../../customHooks/usePurchaseAcknowledgements";
import { usePurchaseAcknowledgementPrint } from "../../../customHooks/usePurchaseAcknowledgementPrint";
import usePermissions from "../../../customHooks/usePermissions";
import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import moment from "moment";
import MonthStatusCalendar from "../../../components/calendar/MonthStatusCalendar";
import { syncPurchaseAcknowledgement } from "../../../helper/purchaseAcknowledgement";

function PurchaseAckListing() {
  const router = useRouter();
  const canAdd = usePermissions("add_purchase_acknowledgement");
  const { purchaseAcknowledgements, loading, remove, refetch } =
    usePurchaseAcknowledgements();
  const { print: printAcknowledgement, download: downloadAcknowledgementPdf } =
    usePurchaseAcknowledgementPrint();
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAllDates, setShowAllDates] = useState(false);
  const [viewingMonth, setViewingMonth] = useState(() =>
    moment().startOf("month")
  );

  /** YYYY-MM-DD -> how many acknowledgements carry that memo date. */
  const statsByDay = useMemo(() => {
    const map = {};
    (purchaseAcknowledgements || []).forEach((row) => {
      const raw = row?.mmm_date;
      if (raw == null || raw === "") return;
      const day = String(raw).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
      map[day] = (map[day] ?? 0) + 1;
    });
    return map;
  }, [purchaseAcknowledgements]);

  const getDayVisual = useCallback(
    (date) => {
      const count = statsByDay[date.format("YYYY-MM-DD")] ?? 0;
      if (count === 0) {
        return {
          bg: "gray.50",
          border: "gray.200",
          text: "gray.500",
          primary: "0",
          secondary: "No acknowledgements",
        };
      }
      return {
        bg: "green.50",
        border: "green.200",
        text: "green.700",
        primary: String(count),
        secondary: count === 1 ? "Acknowledgement" : "Acknowledgements",
      };
    },
    [statsByDay]
  );

  // A day if one is picked, else the month on show - unless the user has
  // asked for everything, which is the only way to reach an acknowledgement
  // with no memo date, since it belongs to no month.
  const displayRowData = useMemo(() => {
    const rows = purchaseAcknowledgements || [];
    if (showAllDates) return rows;
    if (selectedDate) {
      return rows.filter(
        (row) => String(row?.mmm_date ?? "").slice(0, 10) === selectedDate
      );
    }
    const month = viewingMonth.format("YYYY-MM");
    return rows.filter(
      (row) => String(row?.mmm_date ?? "").slice(0, 7) === month
    );
  }, [purchaseAcknowledgements, selectedDate, showAllDates, viewingMonth]);

  // Changing the filter replaces the rows under the grid, and AG Grid keeps
  // whatever page you were on as long as it still exists - so asking for a
  // month while deep in another one would land you in the middle of it.
  const gridRef = useRef(null);
  const resetPage = useCallback(() => {
    gridRef.current?.api?.paginationGoToPage?.(0);
  }, []);

  const handleSelectDate = useCallback(
    (date) => {
      resetPage();
      setShowAllDates(false);
      // Clicking the selected day again clears it, back to the whole month.
      setSelectedDate((current) => (current === date ? null : date));
    },
    [resetPage]
  );

  const handleViewingMonthChange = useCallback(
    (next) => {
      resetPage();
      setShowAllDates(false);
      setSelectedDate(null);
      setViewingMonth(next);
    },
    [resetPage]
  );

  const handleToggleAllDates = useCallback(() => {
    resetPage();
    setShowAllDates((on) => !on);
    setSelectedDate(null);
  }, [resetPage]);

  const handleDeleteClick = useCallback((row) => {
    setDeleteItem(row);
  }, []);

  const handleDeleteClose = useCallback(() => {
    if (!deleting) setDeleteItem(null);
  }, [deleting]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteItem?.purchase_acknowledgement_id) return;
    setDeleting(true);
    try {
      await remove(deleteItem.purchase_acknowledgement_id);
      toast.success("Deleted");
      setDeleteItem(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }, [deleteItem, remove]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncPurchaseAcknowledgement();
      const n = result?.groups_imported ?? 0;
      const backfilled = result?.mrc_no_backfilled ?? 0;

      if (n > 0) {
        toast.success(`${n} Purchase Acknowledgements imported`);
      } else {
        toast.success("No Purchase Acknowledgements to import");
      }

      // An acknowledgement imported before MRC No existed is only filled in
      // by the backfill - the sync itself never revisits a memo it has read.
      if (backfilled > 0) {
        toast.success(`MRC No filled in on ${backfilled} existing records`);
      } else if (result?.mrc_no_available === false) {
        toast("MRC No is not available from the source system", { icon: "⚠️" });
      }

      if (n > 0 || backfilled > 0) {
        refetch();
      }
    } catch (err) {
      toast.error(err?.message || "Purchase Acknowledgements sync failed");
    } finally {
      setSyncing(false);
    }
  }, [refetch, syncing]);

  const colDefs = useMemo(
    () => [
      {
        field: "mmm_refno",
        headerName: "Ref No",
        type: "id",
      },
      {
        field: "mmm_mrc_no",
        headerName: "MRC No",
        type: "id",
      },
      {
        field: "purchase_acknowledgement_id",
        headerName: "ID",
        type: "id",
        hideByDefault: true,
        // Tie-breaker for the Date sort below. A day's sync lands dozens of
        // acknowledgements on one date, and the date alone cannot order them;
        // the id is creation order, so within a date the newest comes first.
        sort: "desc",
        sortIndex: 1,
      },
      {
        field: "distributor_id",
        headerName: "Distributor ID",
        type: "id",
        hideByDefault: true,
      },
      {
        field: "distributor_name",
        headerName: "Distributor",
        type: "capitalized",
        flex: 2,
      },
      {
        field: "mmm_date",
        headerName: "Date",
        type: "date",
        sort: "desc",
        sortIndex: 0,
      },
      {
        field: "invoices",
        headerName: "Invoices",
        type: "number",
        valueGetter: (params) => {
          const invoices = params.data?.invoices;
          return Array.isArray(invoices) ? invoices.length : 0;
        },
      },
      {
        field: "invoices_total_amount",
        headerName: "Total Amount",
        type: "currency",
        valueGetter: (params) => {
          const invoices = params.data?.invoices;
          if (!Array.isArray(invoices)) return null;
          return invoices.reduce(
            (sum, inv) => sum + (Number(inv?.amount) || 0),
            0
          );
        },
      },
      {
        field: "purchase_acknowledgement_id",
        type: "action-icons",
        headerName: "Action",
        minWidth: 150,
        maxWidth: 150,
        width: 150,
        valueGetter: (params) => {
          const row = params.data;
          const id = row?.purchase_acknowledgement_id;
          const actions = [
            {
              label: "Print",
              icon: "fa-solid fa-print",
              colorScheme: "blue",
              onClick: () => printAcknowledgement(row),
            },
            {
              label: "Download",
              icon: "fa-solid fa-file-pdf",
              colorScheme: "red",
              onClick: () => downloadAcknowledgementPdf(row),
            },
            {
              label: "View",
              icon: "fa-solid fa-eye",
              redirectionUrl: `/purchase/purchase-acknowledgement/view?id=${encodeURIComponent(
                id
              )}`,
            },
          ];
          if (canAdd) {
            actions.push({
              label: "Edit",
              icon: "fa-solid fa-pen",
              redirectionUrl: `/purchase/purchase-acknowledgement/edit?id=${encodeURIComponent(
                id
              )}`,
            });
            actions.push({
              label: "Delete",
              icon: "fa-solid fa-trash",
              colorScheme: "red",
              onClick: () => handleDeleteClick(row),
            });
          }
          return actions;
        },
      },
    ],
    [
      canAdd,
      handleDeleteClick,
      printAcknowledgement,
      downloadAcknowledgementPdf,
    ]
  );

  const gridOptions = useMemo(
    () => ({
      getRowId: (params) =>
        String(params.data?.purchase_acknowledgement_id ?? ""),
    }),
    []
  );

  const emptyMessage = showAllDates
    ? "No purchase acknowledgements found."
    : `No purchase acknowledgements for this ${
        selectedDate ? "date" : "month"
      }.`;

  const tableTitle = showAllDates
    ? "Purchase Acknowledgement (all dates)"
    : selectedDate
    ? `Purchase Acknowledgement (${moment(selectedDate).format("DD/MM/YYYY")})`
    : `Purchase Acknowledgement (${viewingMonth.format("MMMM YYYY")})`;

  return (
    <GlobalWrapper
      title="Purchase Acknowledgement"
      permissionKey="view_purchase_acknowledgement"
    >
      <ConfirmDeleteModal
        isOpen={deleteItem != null}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        title="Delete Purchase Acknowledgement"
        body="Are you sure you want to delete this purchase acknowledgement?"
      />
      <Flex flexDirection="column" gap={6}>
        <MonthStatusCalendar
          title="Purchase Acknowledgements by date"
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          viewingMonth={viewingMonth}
          onViewingMonthChange={handleViewingMonthChange}
          loading={loading}
          getDayVisual={getDayVisual}
          headerRight={
            <Flex gap="8px" alignItems="center">
              {selectedDate && !showAllDates && (
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="purple"
                  onClick={() => setSelectedDate(null)}
                >
                  Show whole month
                </Button>
              )}
              <Button
                size="sm"
                variant={showAllDates ? "solid" : "outline"}
                colorScheme="purple"
                onClick={handleToggleAllDates}
              >
                {showAllDates ? "Back to month" : "All dates"}
              </Button>
            </Flex>
          }
        />

        <CustomContainer
          title={tableTitle}
          filledHeader
          rightSection={
            <Flex gap="12px" alignItems="center">
              {canAdd && (
                <Button
                  colorScheme="purple"
                  size="sm"
                  onClick={() =>
                    router.push("/purchase/purchase-acknowledgement/create")
                  }
                >
                  Add
                </Button>
              )}

              <Button
                colorScheme="purple"
                variant="outline"
                size="sm"
                onClick={handleSync}
                isLoading={syncing}
                loadingText="Syncing..."
              >
                Sync
              </Button>
            </Flex>
          }
        >
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            <>
              {/* Beside the grid, never instead of it. Swapping the element
                  out would unmount AG Grid on an empty month and lose the
                  sort, column filters and page size the user had set. */}
              {displayRowData.length === 0 && (
                <Text color="gray.500" py={6} textAlign="center">
                  {emptyMessage}
                </Text>
              )}
              <AgGrid
                ref={gridRef}
                rowData={displayRowData}
                columnDefs={colDefs}
                tableKey="purchase-acknowledgement"
                gridOptions={gridOptions}
              />
            </>
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default PurchaseAckListing;
