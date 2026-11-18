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
import WriteOffRemarkCell from "../../../components/pick-pack/WriteOffRemarkCell";
import usePermissions from "../../../customHooks/usePermissions";
import { usePickPackRemarks } from "../../../customHooks/usePickPackRemarks";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import { useProducts } from "../../../customHooks/useProducts";
import {
  listPickPackWriteOffs,
  deletePickPackWriteOff,
} from "../../../helper/pickPackWriteOff";
import useEmployees from "../../../customHooks/useEmployees";
import WhDailyReportsHelper from "../../../helper/whDailyReports";
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
  const [clearingDay, setClearingDay] = useState(false);

  const canAdd = usePermissions("add_pick_pack_write_off");
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  const { remarks: pickPackRemarksList } = usePickPackRemarks();
  const { employees, loading: employeesLoading } = useEmployees({});

  const [shortageModal, setShortageModal] = useState(null);
  const gridRef = useRef(null);

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
        setMonthRows(Array.isArray(data) ? data.map(normalizeWriteOffRow) : []);
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

  // Days whose Picking report was uploaded (Warehouse Reports > Daily
  // Uploads): with no write-off here, the calendar shows them blue.
  const [uploadedDates, setUploadedDates] = useState(() => new Set());
  useEffect(() => {
    let live = true;
    WhDailyReportsHelper.status({
      from: viewingMonth.clone().startOf("month").format("YYYY-MM-DD"),
      to: viewingMonth.clone().endOf("month").format("YYYY-MM-DD"),
    })
      .then((res) => {
        const uploads = (res && res.code === 200 && res.data && res.data.uploads) || [];
        if (live) setUploadedDates(new Set(uploads.filter((u) => u.report_type === "PICKING").map((u) => u.report_date)));
      })
      .catch(() => live && setUploadedDates(new Set()));
    return () => {
      live = false;
    };
  }, [viewingMonth]);

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

  const handleClearDay = useCallback(() => {
    const ids = rowsForSelectedDay
      .map((r) => r.pick_pack_write_off_id)
      .filter((id) => id != null && id !== "");
    if (!ids.length) {
      toast.error("No write-offs for this date");
      return;
    }
    confirmDelete({
      title: "Clear all for this date",
      message: `Remove all ${ids.length} write-off(s) for ${moment(
        selectedDate
      ).format("DD/MM/YYYY")}? This cannot be undone.`,
      onConfirm: async () => {
        setClearingDay(true);
        try {
          const results = await Promise.allSettled(
            ids.map((id) => deletePickPackWriteOff(id))
          );
          const ok = results.filter((r) => r.status === "fulfilled").length;
          const fail = results.length - ok;
          if (fail === 0) {
            toast.success(`Removed ${ok} write-off(s)`);
          } else {
            toast.error(
              `Removed ${ok}, ${fail} failed (e.g. verified rows may be protected)`
            );
          }
          await loadMonth();
        } catch (e) {
          toast.error(e?.message || "Failed to clear day");
        } finally {
          setClearingDay(false);
        }
      },
    });
  }, [rowsForSelectedDay, selectedDate, confirmDelete, loadMonth]);

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
        field: "stores",
        headerName: "Store",
        type: "capitalized",
        flex: 1.5,
        wrapText: true,
        autoHeight: true,
        valueGetter: (params) => params.data?.stores || "—",
      },
      {
        field: "remark_id",
        headerName: "Remark",
        flex: 1.5,
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
    ],
    [
      activePickPackRemarks,
      canAdd,
      handleRemarkUpdated,
      handleShortageEmployeeRequired,
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
          p?.de_name ?? p?.de_display_name ?? r.product_name ?? "—",
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
          uploadedDates={uploadedDates}
          viewingMonth={viewingMonth}
          onViewingMonthChange={setViewingMonth}
        />

        <CustomContainer
          title={`Write Offs ( ${moment(selectedDate).format("DD/MM/YYYY")} )`}
          filledHeader
          rightSection={
            canAdd ? (
              <Flex gap={2} wrap="wrap" align="center" justify="flex-end">
                <Button
                  variant="outline"
                  colorScheme="red"
                  size="sm"
                  onClick={handleClearDay}
                  isLoading={clearingDay}
                  loadingText="Clearing…"
                  isDisabled={!rowsForSelectedDay.length || clearingDay}
                >
                  Clear
                </Button>
              </Flex>
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
