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
import VerificationRemarkCell from "../../../components/pick-pack/VerificationRemarkCell";
import usePermissions from "../../../customHooks/usePermissions";
import { usePickPackVerificationRemarks } from "../../../customHooks/usePickPackVerificationRemarks";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import { useProducts } from "../../../customHooks/useProducts";
import { useModuleTableTheme } from "../../../contexts/ModuleTableThemeContext";
import {
  listPickPackVerifications,
  deletePickPackVerification,
} from "../../../helper/pickPackVerifications";
import WhDailyReportsHelper from "../../../helper/whDailyReports";

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

  // Days whose Verification report was uploaded (Warehouse Reports > Daily
  // Uploads): with no rows here, the calendar shows them as "no write-off".
  const [uploadedDates, setUploadedDates] = useState(() => new Set());
  useEffect(() => {
    let live = true;
    WhDailyReportsHelper.status({
      from: viewingMonth.clone().startOf("month").format("YYYY-MM-DD"),
      to: viewingMonth.clone().endOf("month").format("YYYY-MM-DD"),
    })
      .then((res) => {
        const uploads = (res && res.code === 200 && res.data && res.data.uploads) || [];
        if (live) setUploadedDates(new Set(uploads.filter((u) => u.report_type === "VERIFICATION").map((u) => u.report_date)));
      })
      .catch(() => live && setUploadedDates(new Set()));
    return () => {
      live = false;
    };
  }, [viewingMonth]);

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
                  uploadedDates={uploadedDates}
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
