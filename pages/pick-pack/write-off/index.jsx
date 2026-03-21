import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  updatePickPackWriteOff,
} from "../../../helper/pickPackWriteOff";
import useEmployees from "../../../customHooks/useEmployees";
import WriteOffShortageEmployeeModal from "../../../components/pick-pack/WriteOffShortageEmployeeModal";

/** List/detail APIs may return 1, "1", or true */
function isWriteOffVerified(value) {
  return value === true || value === 1 || value === "1";
}

function normalizeWriteOffRow(row) {
  if (!row || typeof row !== "object") return row;
  return {
    ...row,
    is_verified: isWriteOffVerified(row.is_verified),
  };
}

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
  const { employees, loading: employeesLoading } = useEmployees({});

  const [shortageModal, setShortageModal] = useState(null);
  const gridRef = useRef(null);

  /** AG Grid React cells may not re-render when row data changes; force remark column refresh */
  const refreshRemarkColumnCells = useCallback(() => {
    requestAnimationFrame(() => {
      try {
        gridRef.current?.api?.refreshCells({
          force: true,
          columns: ["remark_id"],
        });
      } catch (_) {
        /* grid not mounted */
      }
    });
  }, []);

  const employeeOptions = useMemo(
    () =>
      (employees || []).map((e) => ({
        id: String(e.employee_id),
        value: e.employee_name,
        employee_id: e.employee_id,
        employee_name: e.employee_name,
        designation_name: e.designation_name,
        store_name: e.store_name,
      })),
    [employees]
  );

  const employeeMap = useMemo(() => {
    const map = {};
    employees.forEach((e) => {
      map[e.employee_id] = e;
    });
    return map;
  }, [employees]);

  const activePickPackRemarks = useMemo(
    () =>
      (pickPackRemarksList || []).filter(
        (r) => r.is_active === true || r.is_active === 1
      ),
    [pickPackRemarksList]
  );

  const loadMonth = useCallback(
    async (options = {}) => {
      const { showLoading = true } = options;
      const from = viewingMonth.clone().startOf("month").format("YYYY-MM-DD");
      const to = viewingMonth.clone().endOf("month").format("YYYY-MM-DD");
      if (showLoading) setLoadingMonth(true);
      try {
        const data = await listPickPackWriteOffs({
          from_date: from,
          to_date: to,
        });
        setMonthRows(
          Array.isArray(data) ? data.map(normalizeWriteOffRow) : []
        );
      } catch (e) {
        toast.error(e?.message || "Failed to load write-offs");
        setMonthRows([]);
      } finally {
        if (showLoading) setLoadingMonth(false);
      }
    },
    [viewingMonth]
  );

  useEffect(() => {
    loadMonth();
  }, [loadMonth]);

  const rowsForSelectedDay = useMemo(() => {
    return monthRows.filter(
      (r) => r?.date && moment(r.date).format("YYYY-MM-DD") === selectedDate
    );
  }, [monthRows, selectedDate]);

  /** Refetch month list after a mutation (no full-page spinner — grid stays visible). */
  const refetchAfterUpdate = useCallback(async () => {
    await loadMonth({ showLoading: false });
  }, [loadMonth]);

  const handleRemarkUpdated = useCallback(
    async (_writeOffId, _updates) => {
      await refetchAfterUpdate();
    },
    [refetchAfterUpdate]
  );

  const handleShortageEmployeeRequired = useCallback((payload) => {
    setShortageModal(payload);
  }, []);

  const handleVerifyRow = useCallback(
    async (row) => {
      const id = row?.pick_pack_write_off_id;
      if (id == null) return;
      try {
        await updatePickPackWriteOff(id, { is_verified: true });
        toast.success("Verified");
        // Optimistic UI so grid/React cells update even if AG Grid reuses row nodes
        setMonthRows((prev) =>
          prev.map((r) =>
            String(r.pick_pack_write_off_id) === String(id)
              ? normalizeWriteOffRow({ ...r, is_verified: true })
              : r
          )
        );
        refreshRemarkColumnCells();
        await refetchAfterUpdate();
        refreshRemarkColumnCells();
      } catch (e) {
        toast.error(e?.message || "Failed to verify");
      }
    },
    [refetchAfterUpdate, refreshRemarkColumnCells]
  );

  const hasWriteOffReason = (row) => {
    const rid = row?.remark_id;
    if (rid != null && rid !== "") return true;
    const s = row?.remark_str;
    return s != null && String(s).trim() !== "";
  };

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
        cellRenderer: (params) => {
          const verified = isWriteOffVerified(params.data?.is_verified);
          const rowId = params.data?.pick_pack_write_off_id;
          return (
            <WriteOffRemarkCell
              key={`remark-${rowId}-${verified ? "v" : "o"}`}
              data={params.data}
              remarkOptions={activePickPackRemarks}
              onRemarkUpdated={handleRemarkUpdated}
              onShortageEmployeeRequired={handleShortageEmployeeRequired}
              isEditable={canAdd && !verified}
              employeeMap={employeeMap}
            />
          );
        },
      },
      {
        field: "actions",
        type: "action-icons",
        headerName: "Actions",
        minWidth: 168,
        maxWidth: 200,
        width: 168,
        valueGetter: (params) => {
          const row = params.data;
          const id = row?.pick_pack_write_off_id;
          const actions = [];
          const verified = isWriteOffVerified(row?.is_verified);
          const canVerify = canAdd && hasWriteOffReason(row) && !verified;
          if (canAdd) {
            actions.push({
              label: "Verify",
              icon: verified ? "fa-solid fa-circle-check" : "fa-solid fa-check",
              colorScheme: "green",
              disabled: !canVerify,
              onClick: () => {
                if (!canVerify) return;
                handleVerifyRow(row);
              },
            });
            actions.push({
              label: "Delete",
              icon: "fa-solid fa-trash",
              colorScheme: "red",
              disabled: verified,
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
      handleShortageEmployeeRequired,
      handleVerifyRow,
      employeeMap,
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

      <WriteOffShortageEmployeeModal
        isOpen={shortageModal != null}
        onClose={() => setShortageModal(null)}
        writeOffId={shortageModal?.writeOffId}
        remarkId={shortageModal?.remarkId}
        remarkLabel={shortageModal?.remark_value}
        employeeOptions={employeeOptions}
        employeesLoading={employeesLoading}
        onSuccess={handleRemarkUpdated}
      />

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
                ref={gridRef}
                rowData={gridRows}
                columnDefs={colDefs}
                tableKey="pick-pack-write-off"
                getRowId={(params) =>
                  String(params.data?.pick_pack_write_off_id ?? "")
                }
              />
            </Box>
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default PickPackWriteOffPage;
