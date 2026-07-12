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
import { usePickPackRemarks } from "../../../customHooks/usePickPackRemarks";
import { useProducts } from "../../../customHooks/useProducts";
import useEmployees from "../../../customHooks/useEmployees";
import {
  listPickPackWriteOffs,
  updatePickPackWriteOff,
} from "../../../helper/pickPackWriteOff";

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

function hasWriteOffReason(row) {
  const rid = row?.remark_id;
  if (rid != null && rid !== "") return true;
  const s = row?.remark_str;
  return s != null && String(s).trim() !== "";
}

function isShortageRemark(remark) {
  const label = String(remark?.label ?? "").trim().toLowerCase();
  return label === "shortage";
}

function isShortageRow(row) {
  return String(row?.remark_value ?? "").trim().toLowerCase() === "shortage";
}

function rowBelongsToRemarkTab(row, remark) {
  if (isShortageRemark(remark)) {
    return isShortageRow(row);
  }
  return String(row.remark_id) === String(remark.remark_id);
}

function getReasonEmployeeName(row, employeeMap) {
  const nestedName = row?.reason_employee?.employee_name;
  if (nestedName != null && String(nestedName).trim() !== "") {
    return String(nestedName).trim();
  }
  if (row?.reason_employee_name != null && String(row.reason_employee_name).trim() !== "") {
    return String(row.reason_employee_name).trim();
  }
  const emp = employeeMap[row?.reason_employee_id];
  return emp?.employee_name ?? "—";
}

function PickPackWriteOffListPage() {
  const { colorScheme } = useModuleTableTheme();
  const [fromDate, setFromDate] = useState(() =>
    moment().startOf("month").format("YYYY-MM-DD")
  );
  const [toDate, setToDate] = useState(() =>
    moment().endOf("month").format("YYYY-MM-DD")
  );
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const canAdd = usePermissions("add_pick_pack_write_off");
  const { remarks: pickPackRemarksList } = usePickPackRemarks();
  const { products } = useProducts({
    limit: 50000,
    fetchAll: true,
    fetchNonOnline: true,
  });
  const { employees } = useEmployees({});

  const mappedProducts = useMemo(() => {
    if (!products?.length) return {};
    const map = {};
    products.forEach((p) => {
      map[p.product_id] = p;
    });
    return map;
  }, [products]);

  const employeeMap = useMemo(() => {
    const map = {};
    (employees || []).forEach((e) => {
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

  const dateRange = useMemo(
    () => ({
      from_date: fromDate,
      to_date: toDate,
      label: `${moment(fromDate).format("DD/MM/YYYY")} – ${moment(toDate).format("DD/MM/YYYY")}`,
    }),
    [fromDate, toDate]
  );

  const handleFromDateChange = useCallback((value) => {
    if (!value) return;
    setFromDate(value);
    if (moment(value).isAfter(moment(toDate), "day")) {
      setToDate(value);
    }
  }, [toDate]);

  const handleToDateChange = useCallback((value) => {
    if (!value) return;
    if (moment(value).isBefore(moment(fromDate), "day")) {
      toast.error("To date cannot be before from date");
      return;
    }
    setToDate(value);
  }, [fromDate]);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listPickPackWriteOffs({
        from_date: dateRange.from_date,
        to_date: dateRange.to_date,
      });
      setRows(Array.isArray(data) ? data.map(normalizeWriteOffRow) : []);
    } catch (e) {
      toast.error(e?.message || "Failed to load write-offs");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [dateRange.from_date, dateRange.to_date]);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

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

  const gridRows = useMemo(
    () => rows.map(enrichGridRow),
    [rows, enrichGridRow]
  );

  const rowsByRemarkId = useMemo(() => {
    const map = {};
    activePickPackRemarks.forEach((remark) => {
      map[remark.remark_id] = gridRows.filter((row) =>
        rowBelongsToRemarkTab(row, remark)
      );
    });
    return map;
  }, [gridRows, activePickPackRemarks]);

  const handleVerifyRow = useCallback(
    async (row) => {
      const id = row?.pick_pack_write_off_id;
      if (id == null) return;
      try {
        await updatePickPackWriteOff(id, { is_verified: true });
        toast.success("Verified");
        setRows((prev) =>
          prev.map((r) =>
            String(r.pick_pack_write_off_id) === String(id)
              ? normalizeWriteOffRow({ ...r, is_verified: true })
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

  const buildColDefs = useCallback(
    (remark) => {
      const isShortage = isShortageRemark(remark);
      const cols = [
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
      ];

      if (isShortage) {
        cols.push({
          field: "reason_employee",
          headerName: "Employee",
          type: "capitalized",
          flex: 1.5,
          valueGetter: (params) =>
            getReasonEmployeeName(params.data, employeeMap),
        });
      }

      cols.push({
        field: "actions",
        type: "action-icons",
        headerName: "Actions",
        minWidth: 96,
        maxWidth: 120,
        width: 96,
        valueGetter: (params) => {
          const row = params.data;
          const verified = isWriteOffVerified(row?.is_verified);
          const canVerify = canAdd && hasWriteOffReason(row) && !verified;
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
      });

      return cols;
    },
    [canAdd, handleVerifyRow, employeeMap]
  );

  const colDefsByRemarkId = useMemo(() => {
    const map = {};
    activePickPackRemarks.forEach((remark) => {
      map[remark.remark_id] = buildColDefs(remark);
    });
    return map;
  }, [activePickPackRemarks, buildColDefs]);

  useEffect(() => {
    const maxTabIndex = Math.max(activePickPackRemarks.length - 1, 0);
    if (activeTabIndex > maxTabIndex) {
      setActiveTabIndex(0);
    }
  }, [activeTabIndex, activePickPackRemarks.length]);

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
    <GlobalWrapper
      title="Write Off List"
      permissionKey="view_pick_pack_write_off"
    >
      <CustomContainer title="Write Off List" filledHeader rightSection={dateRangePicker}>
        {loading ? (
          <Text py={4} color="gray.600">
            Loading write-offs for {dateRange.label}…
          </Text>
        ) : activePickPackRemarks.length === 0 ? (
          <Text py={4} color="gray.600">
            No active remarks configured.
          </Text>
        ) : (
          <Tabs
            size="sm"
            colorScheme={colorScheme}
            index={activeTabIndex}
            onChange={setActiveTabIndex}
          >
            <TabList flexWrap="wrap">
              {activePickPackRemarks.map((remark) => (
                <Tab key={remark.remark_id}>
                  {remark.label || `Remark ${remark.remark_id}`} (
                  {rowsByRemarkId[remark.remark_id]?.length ?? 0})
                </Tab>
              ))}
            </TabList>
            <TabPanels>
              {activePickPackRemarks.map((remark) => (
                <TabPanel key={remark.remark_id} p={0} pt={4}>
                  <AgGrid
                    rowData={rowsByRemarkId[remark.remark_id] ?? []}
                    columnDefs={colDefsByRemarkId[remark.remark_id] ?? []}
                    tableKey={`pick-pack-write-off-list-${remark.remark_id}`}
                    getRowId={(params) =>
                      String(params.data?.pick_pack_write_off_id ?? "")
                    }
                  />
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PickPackWriteOffListPage;
