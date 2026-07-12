import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import {
  HStack,
  Input,
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
import { useModuleTableTheme } from "../../../contexts/ModuleTableThemeContext";
import usePermissions from "../../../customHooks/usePermissions";
import { usePickPackVerificationRemarks } from "../../../customHooks/usePickPackVerificationRemarks";
import { useProducts } from "../../../customHooks/useProducts";
import {
  listPickPackVerifications,
  updatePickPackVerification,
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

function hasVerificationReason(row) {
  const rid = row?.remark_id;
  if (rid != null && rid !== "") return true;
  const s = row?.remark_str;
  return s != null && String(s).trim() !== "";
}

function PickPackVerificationsListPage() {
  const { colorScheme } = useModuleTableTheme();
  const [fromDate, setFromDate] = useState(() =>
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [toDate, setToDate] = useState(() =>
    moment().endOf("month").format("YYYY-MM-DD")
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeJobTabIndex, setActiveJobTabIndex] = useState(0);
  const [activeRemarkTabIndex, setActiveRemarkTabIndex] = useState(0);
  const jobType = JOB_TYPES[activeJobTabIndex] ?? "GRN";

  const canAdd = usePermissions("add_pick_pack_verifications");
  const { remarks: allVerificationRemarks } = usePickPackVerificationRemarks();
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

  const activeVerificationRemarks = useMemo(
    () =>
      (allVerificationRemarks || []).filter(
        (r) => r.is_active === true || r.is_active === 1
      ),
    [allVerificationRemarks]
  );

  const dateRange = useMemo(
    () => ({
      from_date: fromDate,
      to_date: toDate,
      label: `${moment(fromDate).format("DD/MM/YYYY")} – ${moment(toDate).format("DD/MM/YYYY")}`,
    }),
    [fromDate, toDate]
  );

  const handleFromDateChange = useCallback(
    (value) => {
      if (!value) return;
      setFromDate(value);
      if (moment(value).isAfter(moment(toDate), "day")) {
        setToDate(value);
      }
    },
    [toDate]
  );

  const handleToDateChange = useCallback(
    (value) => {
      if (!value) return;
      if (moment(value).isBefore(moment(fromDate), "day")) {
        toast.error("To date cannot be before from date");
        return;
      }
      setToDate(value);
    },
    [fromDate]
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPickPackVerifications({
        from_date: dateRange.from_date,
        to_date: dateRange.to_date,
      });
      setRows(Array.isArray(data) ? data.map(normalizeVerificationRow) : []);
    } catch (e) {
      toast.error(e?.message || "Failed to load verifications");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from_date, dateRange.to_date]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  useEffect(() => {
    setActiveRemarkTabIndex(0);
  }, [activeJobTabIndex]);

  const enrichGridRow = useCallback(
    (row) => {
      const pid = row.product_id;
      const p =
        mappedProducts[pid] ??
        mappedProducts[Number(pid)] ??
        mappedProducts[String(pid)];
      return {
        ...row,
        _product_name:
          p?.de_name ?? p?.de_display_name ?? row.product_name ?? "—",
        _image_url: p?.image_url ?? row.product_image_url ?? "",
      };
    },
    [mappedProducts]
  );

  const getRowsByRemarkId = useCallback(
    (type) => {
      const typeRows = rows
        .filter((row) => String(row.job_type) === type)
        .map(enrichGridRow);
      const map = {};
      activeVerificationRemarks.forEach((remark) => {
        map[remark.remark_id] = typeRows.filter(
          (row) => String(row.remark_id) === String(remark.remark_id)
        );
      });
      return map;
    },
    [rows, enrichGridRow, activeVerificationRemarks]
  );

  const handleVerifyRow = useCallback(
    async (row) => {
      const id = row?.pick_pack_verification_id;
      if (id == null) return;
      try {
        await updatePickPackVerification(id, { is_verified: true });
        toast.success("Verified");
        setRows((prev) =>
          prev.map((r) =>
            String(r.pick_pack_verification_id) === String(id)
              ? normalizeVerificationRow({ ...r, is_verified: true })
              : r
          )
        );
        await loadRows();
      } catch (e) {
        toast.error(e?.message || "Failed to verify");
      }
    },
    [loadRows]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "date",
        headerName: "Date",
        type: "date",
      },
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
        field: "actions",
        type: "action-icons",
        headerName: "Actions",
        minWidth: 96,
        maxWidth: 120,
        width: 96,
        valueGetter: (params) => {
          const row = params.data;
          const verified = isVerificationVerified(row?.is_verified);
          const canVerify = canAdd && hasVerificationReason(row) && !verified;
          if (!canAdd) return [];
          return [
            {
              label: "Verify",
              icon: verified ? "fa-solid fa-circle-check" : "fa-solid fa-check",
              colorScheme: "green",
              disabled: !canVerify,
              onClick: () => {
                if (!canVerify) return;
                handleVerifyRow(row);
              },
            },
          ];
        },
      },
    ],
    [canAdd, handleVerifyRow]
  );

  useEffect(() => {
    const maxTabIndex = Math.max(activeVerificationRemarks.length - 1, 0);
    if (activeRemarkTabIndex > maxTabIndex) {
      setActiveRemarkTabIndex(0);
    }
  }, [activeRemarkTabIndex, activeVerificationRemarks.length]);

  const dateRangePicker = (
    <HStack spacing={3} align="center" flexShrink={0}>
      <Input
        type="date"
        size="sm"
        w="150px"
        value={fromDate}
        max={toDate}
        onChange={(e) => handleFromDateChange(e.target.value)}
      />
      <Input
        type="date"
        size="sm"
        w="150px"
        value={toDate}
        min={fromDate}
        max={moment().format("YYYY-MM-DD")}
        onChange={(e) => handleToDateChange(e.target.value)}
      />
    </HStack>
  );

  return (
    <GlobalWrapper title="Verification List" permissionKey="view_pick_pack_verifications">
      <CustomContainer
        title="Verification List"
        filledHeader
        rightSection={dateRangePicker}
      >
        {loading ? (
          <Text py={4} color="gray.600">
            Loading verifications for {dateRange.label}…
          </Text>
        ) : (
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
              {JOB_TYPES.map((type) => {
                const rowsByRemarkId = getRowsByRemarkId(type);
                return (
                <TabPanel key={type} p={0} pt={4}>
                  {activeVerificationRemarks.length === 0 ? (
                    <Text py={4} color="gray.600">
                      No active remarks configured for {type}.
                    </Text>
                  ) : (
                    <Tabs
                      size="sm"
                      colorScheme={colorScheme}
                      index={type === jobType ? activeRemarkTabIndex : 0}
                      onChange={
                        type === jobType ? setActiveRemarkTabIndex : undefined
                      }
                      isLazy
                    >
                      <TabList flexWrap="wrap">
                        {activeVerificationRemarks.map((remark) => (
                          <Tab key={remark.remark_id}>
                            {remark.label || `Remark ${remark.remark_id}`} (
                            {rowsByRemarkId[remark.remark_id]?.length ?? 0})
                          </Tab>
                        ))}
                      </TabList>
                      <TabPanels>
                        {activeVerificationRemarks.map((remark) => (
                          <TabPanel key={remark.remark_id} p={0} pt={4}>
                            <AgGrid
                              rowData={rowsByRemarkId[remark.remark_id] ?? []}
                              columnDefs={colDefs}
                              tableKey={`pick-pack-verifications-list-${type}-${remark.remark_id}`}
                              getRowId={(params) =>
                                String(params.data?.pick_pack_verification_id ?? "")
                              }
                            />
                          </TabPanel>
                        ))}
                      </TabPanels>
                    </Tabs>
                  )}
                </TabPanel>
              );
              })}
            </TabPanels>
          </Tabs>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PickPackVerificationsListPage;
