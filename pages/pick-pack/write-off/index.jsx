import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import WriteOffMonthCalendar from "../../../components/pick-pack/WriteOffMonthCalendar";
import FileUploaderWithColumnMapping from "../../../components/FileUploaderWithColumnMapping";
import WriteOffRemarkCell from "../../../components/pick-pack/WriteOffRemarkCell";
import usePermissions from "../../../customHooks/usePermissions";
import { usePickPackRemarks } from "../../../customHooks/usePickPackRemarks";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import { useProducts } from "../../../customHooks/useProducts";
import {
  listPickPackWriteOffs,
  createPickPackWriteOff,
  deletePickPackWriteOff,
} from "../../../helper/pickPackWriteOff";

/** Matches FileUploaderWithColumnMapping: keys are API fields; labels are targets to map from file headers. */
const WRITE_OFF_IMPORT_CONFIG = [
  {
    key: "product_id",
    label: "Article Id",
    required: true,
    suggestedKey: "Article Id",
    type: "number",
  },
  {
    key: "mismatch_qty",
    label: "Mismatch Quantity",
    required: true,
    suggestedKey: "Mismatch Quantity",
    type: "number",
  },
];

function PickPackWriteOffPage() {
  const { products } = useProducts({
    limit: 50000,
    fetchAll: true,
    fetchNonOnline: true,
  });

  const mappedProducts = useMemo(() => {
    if (!products?.length) return {};
    const map = {};
    products.forEach((p) => {
      map[p.product_id] = p;
    });
    return map;
  }, [products]);

  const yesterday = useMemo(() => moment().subtract(1, "day"), []);
  const [selectedDate, setSelectedDate] = useState(() =>
    yesterday.format("YYYY-MM-DD")
  );
  const [viewingMonth, setViewingMonth] = useState(() =>
    yesterday.clone().startOf("month")
  );
  const [monthRows, setMonthRows] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [importing, setImporting] = useState(false);

  const canAdd = usePermissions("add_pick_pack_write_off");
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  const { remarks: pickPackRemarksList } = usePickPackRemarks();

  const activePickPackRemarks = useMemo(
    () =>
      (pickPackRemarksList || []).filter(
        (r) => r.is_active === true || r.is_active === 1
      ),
    [pickPackRemarksList]
  );

  const loadMonth = useCallback(async () => {
    const from = viewingMonth.clone().startOf("month").format("YYYY-MM-DD");
    const to = viewingMonth.clone().endOf("month").format("YYYY-MM-DD");
    setLoadingMonth(true);
    try {
      const data = await listPickPackWriteOffs({
        from_date: from,
        to_date: to,
      });
      setMonthRows(data);
    } catch (e) {
      toast.error(e?.message || "Failed to load write-offs");
      setMonthRows([]);
    } finally {
      setLoadingMonth(false);
    }
  }, [viewingMonth]);

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const rowsForSelectedDay = useMemo(() => {
    return monthRows.filter(
      (r) => r?.date && moment(r.date).format("YYYY-MM-DD") === selectedDate
    );
  }, [monthRows, selectedDate]);

  const handleRemarkUpdated = useCallback((writeOffId, updates) => {
    setMonthRows((prev) =>
      prev.map((r) =>
        r.pick_pack_write_off_id === writeOffId ? { ...r, ...updates } : r
      )
    );
  }, []);

  const handleImportMapped = useCallback(
    async (mappedRows) => {
      if (!selectedDate) return;
      const valid = mappedRows.filter(
        (r) =>
          r.product_id != null &&
          r.mismatch_qty != null &&
          !Number.isNaN(Number(r.product_id)) &&
          !Number.isNaN(Number(r.mismatch_qty))
      );
      if (!valid.length) {
        toast.error("No valid rows to import");
        return;
      }
      setImporting(true);
      try {
        await Promise.all(
          valid.map((r) =>
            createPickPackWriteOff({
              product_id: Number(r.product_id),
              mismatch_qty: Number(r.mismatch_qty),
              date: selectedDate,
            })
          )
        );
        toast.success(`Imported ${valid.length} row(s)`);
        await loadMonth();
      } catch (e) {
        toast.error(e?.message || "Import failed");
      } finally {
        setImporting(false);
      }
    },
    [selectedDate, loadMonth]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "product_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "_image_url",
        headerName: "Image",
        type: "image",
      },
      {
        field: "_product_name",
        headerName: "Name",
        type: "capitalized",
        flex: 2,
      },
      {
        field: "mismatch_qty",
        headerName: "Mismatch Qty",
        type: "number",
      },
      {
        field: "remark_id",
        headerName: "Remark",
        minWidth: 130,
        autoHeight: true,
        cellRenderer: (params) => (
          <WriteOffRemarkCell
            data={params.data}
            remarkOptions={activePickPackRemarks}
            onRemarkUpdated={handleRemarkUpdated}
            isEditable={canAdd}
          />
        ),
      },
      {
        field: "actions",
        type: "action-icons",
        headerName: "Actions",
        valueGetter: (params) => {
          const row = params.data;
          const id = row?.pick_pack_write_off_id;
          const actions = [];
          if (canAdd) {
            actions.push({
              label: "Delete",
              icon: "fa-solid fa-trash",
              colorScheme: "red",
              onClick: () =>
                confirmDelete({
                  title: "Delete write-off",
                  message: `Remove write-off #${id} for product ${row?.product_id}?`,
                  onConfirm: async () => {
                    await deletePickPackWriteOff(id);
                    toast.success("Deleted");
                    loadMonth();
                  },
                }),
            });
          }
          return actions;
        },
      },
    ],
    [
      activePickPackRemarks,
      canAdd,
      confirmDelete,
      loadMonth,
      handleRemarkUpdated,
    ]
  );

  const gridRows = useMemo(() => {
    return rowsForSelectedDay.map((r) => {
      const pid = r.product_id;
      const p =
        mappedProducts[pid] ??
        mappedProducts[Number(pid)] ??
        mappedProducts[String(pid)];
      return {
        ...r,
        _product_name:
          p?.gf_item_name ?? p?.de_display_name ?? r.product_name ?? "—",
        _image_url: p?.image_url ?? r.product_image_url ?? "",
      };
    });
  }, [rowsForSelectedDay, mappedProducts]);

  return (
    <GlobalWrapper
      title="Pick & Pack Write Off"
      permissionKey="view_pick_pack_write_off"
    >
      <ConfirmDeleteDialog />

      <Flex flexDirection="column" gap={6}>
        <WriteOffMonthCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          writeOffsList={monthRows}
          viewingMonth={viewingMonth}
          onViewingMonthChange={setViewingMonth}
        />

        <CustomContainer
          title={`Write Offs ( ${moment(selectedDate).format("DD/MM/YYYY")} )`}
          filledHeader
          rightSection={
            canAdd ? (
              <FileUploaderWithColumnMapping
                config={WRITE_OFF_IMPORT_CONFIG}
                onMappedData={handleImportMapped}
                accept=".xlsx,.xls,.csv"
                renderer={(openFileBrowser) => (
                  <Button
                    onClick={openFileBrowser}
                    colorScheme="purple"
                    size="sm"
                    isLoading={importing}
                    loadingText="Importing..."
                  >
                    Import file
                  </Button>
                )}
              />
            ) : null
          }
        >
          {loadingMonth ? (
            <Text py={4} color="gray.600">
              Loading calendar data…
            </Text>
          ) : (
            <Box>
              <AgGrid
                rowData={gridRows}
                columnDefs={colDefs}
                tableKey="pick-pack-write-off"
                gridOptions={{
                  getRowId: (params) =>
                    String(params.data?.pick_pack_write_off_id ?? ""),
                }}
              />
            </Box>
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default PickPackWriteOffPage;
