import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import moment from "moment";
import {
  Box,
  Button,
  Flex,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import VerificationMonthCalendar from "../../../components/pick-pack/VerificationMonthCalendar";
import FileUploaderWithColumnMapping from "../../../components/FileUploaderWithColumnMapping";
import VerificationRemarkCell from "../../../components/pick-pack/VerificationRemarkCell";
import usePermissions from "../../../customHooks/usePermissions";
import { usePickPackVerificationRemarks } from "../../../customHooks/usePickPackVerificationRemarks";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import { useProducts } from "../../../customHooks/useProducts";
import { useModuleTableTheme } from "../../../contexts/ModuleTableThemeContext";
import {
  listPickPackVerifications,
  createPickPackVerification,
  deletePickPackVerification,
} from "../../../helper/pickPackVerifications";

const JOB_TYPES = ["GRN", "STA"];

function isVerificationVerified(value) {
  return value === true || value === 1 || value === "1";
}

function normalizeVerificationRow(row) {
  if (!row || typeof row !== "object") return row;
  return {
    ...row,
    is_verified: isVerificationVerified(row.is_verified),
  };
}

function normalizeJobType(value) {
  const upper = String(value ?? "")
    .trim()
    .toUpperCase();
  return JOB_TYPES.includes(upper) ? upper : null;
}

const VERIFICATION_IMPORT_CONFIG = [
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
  {
    key: "job_type",
    label: "Job Type",
    required: true,
    suggestedKey: "Job Type",
    type: "text",
  },
];

function PickPackVerificationsPage() {
  const { colorScheme } = useModuleTableTheme();
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
  const [activeJobTabIndex, setActiveJobTabIndex] = useState(0);
  const jobType = JOB_TYPES[activeJobTabIndex] ?? "GRN";
  const [selectedDate, setSelectedDate] = useState(() =>
    yesterday.format("YYYY-MM-DD")
  );
  const [viewingMonth, setViewingMonth] = useState(() =>
    yesterday.clone().startOf("month")
  );
  const [monthRows, setMonthRows] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearingDay, setClearingDay] = useState(false);

  const canAdd = usePermissions("add_pick_pack_verifications");
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  const { remarks: allVerificationRemarks } = usePickPackVerificationRemarks();

  const activeVerificationRemarks = useMemo(
    () =>
      (allVerificationRemarks || []).filter(
        (r) => r.is_active === true || r.is_active === 1
      ),
    [allVerificationRemarks]
  );

  const getRowsForDay = useCallback(
    (type) =>
      monthRows.filter(
        (r) =>
          r?.date &&
          moment(r.date).format("YYYY-MM-DD") === selectedDate &&
          String(r.job_type) === type
      ),
    [monthRows, selectedDate]
  );

  const getGridRows = useCallback(
    (type) => {
      return getRowsForDay(type).map((r) => {
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
    },
    [getRowsForDay, mappedProducts]
  );

  const loadMonth = useCallback(
    async (options = {}) => {
      const { showLoading = true } = options;
      const from = viewingMonth.clone().startOf("month").format("YYYY-MM-DD");
      const to = viewingMonth.clone().endOf("month").format("YYYY-MM-DD");
      if (showLoading) setLoadingMonth(true);
      try {
        const data = await listPickPackVerifications({
          from_date: from,
          to_date: to,
        });
        setMonthRows(Array.isArray(data) ? data.map(normalizeVerificationRow) : []);
      } catch (e) {
        toast.error(e?.message || "Failed to load verifications");
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

  const rowsForSelectedDay = useMemo(
    () => getRowsForDay(jobType),
    [getRowsForDay, jobType]
  );

  const refetchAfterUpdate = useCallback(async () => {
    await loadMonth({ showLoading: false });
  }, [loadMonth]);

  const handleRemarkUpdated = useCallback(
    async (_verificationId, _updates) => {
      await refetchAfterUpdate();
    },
    [refetchAfterUpdate]
  );

  const mergeImportRows = useCallback((rows) => {
    const byKey = new Map();
    for (const r of rows) {
      const pid = Number(r.product_id);
      const qty = Number(r.mismatch_qty);
      const jt = normalizeJobType(r.job_type);
      if (Number.isNaN(pid) || Number.isNaN(qty) || !jt) continue;
      const key = `${pid}:${jt}`;
      byKey.set(key, {
        product_id: pid,
        mismatch_qty: (byKey.get(key)?.mismatch_qty ?? 0) + qty,
        job_type: jt,
      });
    }
    return Array.from(byKey.values());
  }, []);

  const handleImportMapped = useCallback(
    async (mappedRows) => {
      if (!selectedDate) return;
      const valid = mappedRows.filter((r) => {
        const jt = normalizeJobType(r.job_type);
        return (
          r.product_id != null &&
          r.mismatch_qty != null &&
          jt != null &&
          !Number.isNaN(Number(r.product_id)) &&
          !Number.isNaN(Number(r.mismatch_qty))
        );
      });
      if (!valid.length) {
        toast.error("No valid rows to import (check Job Type is GRN or STA)");
        return;
      }
      const merged = mergeImportRows(
        valid.map((r) => ({
          ...r,
          job_type: normalizeJobType(r.job_type),
        }))
      );
      setImporting(true);
      try {
        await Promise.all(
          merged.map((r) =>
            createPickPackVerification({
              product_id: r.product_id,
              mismatch_qty: r.mismatch_qty,
              date: selectedDate,
              job_type: r.job_type,
            })
          )
        );
        const mergedNote =
          valid.length !== merged.length
            ? ` (${valid.length} file rows → ${merged.length} products, qty combined)`
            : "";
        toast.success(`Imported ${merged.length} row(s)${mergedNote}`);
        await loadMonth();
      } catch (e) {
        toast.error(e?.message || "Import failed");
      } finally {
        setImporting(false);
      }
    },
    [selectedDate, loadMonth, mergeImportRows]
  );

  const handleClearDay = useCallback(() => {
    const ids = rowsForSelectedDay
      .map((r) => r.pick_pack_verification_id)
      .filter((id) => id != null && id !== "");
    if (!ids.length) {
      toast.error("No verifications for this date");
      return;
    }
    confirmDelete({
      title: "Clear all for this date",
      message: `Remove all ${ids.length} verification(s) for ${moment(
        selectedDate
      ).format("DD/MM/YYYY")} (${jobType})? This cannot be undone.`,
      onConfirm: async () => {
        setClearingDay(true);
        try {
          const results = await Promise.allSettled(
            ids.map((id) => deletePickPackVerification(id))
          );
          const ok = results.filter((r) => r.status === "fulfilled").length;
          const fail = results.length - ok;
          if (fail === 0) {
            toast.success(`Removed ${ok} verification(s)`);
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
  }, [rowsForSelectedDay, selectedDate, jobType, confirmDelete, loadMonth]);

  const buildColDefs = useCallback(
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
        flex: 1.5,
        autoHeight: true,
        cellRenderer: (params) => {
          const verified = isVerificationVerified(params.data?.is_verified);
          const rowId = params.data?.pick_pack_verification_id;
          return (
            <VerificationRemarkCell
              key={`remark-${rowId}-${verified ? "v" : "o"}`}
              data={params.data}
              remarkOptions={activeVerificationRemarks}
              onRemarkUpdated={handleRemarkUpdated}
              isEditable={canAdd && !verified}
            />
          );
        },
      },
    ],
    [canAdd, handleRemarkUpdated, activeVerificationRemarks]
  );

  return (
    <GlobalWrapper title="Verification" permissionKey="view_pick_pack_verifications">
      <ConfirmDeleteDialog />

      <Flex flexDirection="column" gap={6}>
        <Tabs
          size="sm"
          colorScheme={colorScheme}
          index={activeJobTabIndex}
          onChange={setActiveJobTabIndex}
        >
          <TabList>
            {JOB_TYPES.map((type) => (
              <Tab key={type}>{type}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {JOB_TYPES.map((type) => (
              <TabPanel key={type} px={0} pt={4}>
                <VerificationMonthCalendar
                  selectedDate={selectedDate}
                  onSelectDate={setSelectedDate}
                  verificationsList={monthRows.filter(
                    (r) => String(r.job_type) === type
                  )}
                  viewingMonth={viewingMonth}
                  onViewingMonthChange={setViewingMonth}
                />

                <CustomContainer
                  title={`Verification — ${type} ( ${moment(selectedDate).format(
                    "DD/MM/YYYY"
                  )} )`}
                  filledHeader
                  rightSection={
                    canAdd && type === jobType ? (
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
                        <FileUploaderWithColumnMapping
                          config={VERIFICATION_IMPORT_CONFIG}
                          onMappedData={handleImportMapped}
                          accept=".xlsx,.xls,.csv"
                          renderer={(openFileBrowser) => (
                            <Button
                              onClick={openFileBrowser}
                              size="sm"
                              isLoading={importing}
                              loadingText="Importing..."
                            >
                              Import file
                            </Button>
                          )}
                        />
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
                        rowData={getGridRows(type)}
                        columnDefs={buildColDefs()}
                        tableKey={`pick-pack-verifications-${type}`}
                        getRowId={(params) =>
                          String(params.data?.pick_pack_verification_id ?? "")
                        }
                      />
                    </Box>
                  )}
                </CustomContainer>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Flex>
    </GlobalWrapper>
  );
}

export default PickPackVerificationsPage;
