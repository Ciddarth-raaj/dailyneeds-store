import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  Alert,
  AlertIcon,
  Badge,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import { DateRangeFilter } from "../../../components/DateRangeFilter";
import PunchTimeCell from "../../../components/attendance/PunchTimeCell";
import AttendanceBanners from "../../../components/attendance/AttendanceBanners";
import usePermissions from "../../../customHooks/usePermissions";
import useOutlets from "../../../customHooks/useOutlets";
import useDepartments from "../../../customHooks/useDepartments";
import AttendanceHelper from "../../../helper/attendance";
import { formatYYYYMMDD } from "../../../util/dateRange";
import {
  attendanceListColumns,
  auditLinkFor,
  buildAuditQuery,
  buildListQuery,
  clockTimeColumnCount,
  displayDate,
  flattenRow,
  punchesCellText,
  DERIVATION_STATUS_LABEL,
  DEVICE_STATUS_LABEL,
} from "../../../util/attendanceRaw";

/**
 * Attendance - Part 1: the raw Biomax punch flow, presented.
 *
 * TWO TABS, TWO QUESTIONS.
 *
 *   Attendance List   "When did each employee clock on each day?"
 *                     One row per employee per attendance date. Every punch of
 *                     that day is in the row, in time order, whichever
 *                     terminal or outlet recorded it - warehouse staff helping
 *                     a store, HR touring, a manager visiting: one row. The
 *                     only location filter is HOME OUTLET (from the employee
 *                     master). There is deliberately NO device or punch
 *                     location filter on this tab, so it can never show a
 *                     partial day; the server refuses such a parameter too.
 *
 *   Punch Audit       "What did this device / this outlet / this IP record?"
 *                     One row per physical punch. Device, punch location,
 *                     source IP and review-status filters live here, and so
 *                     do the punches that could not be dated yet (unmatched
 *                     employee code, no assigned shift, missing cutoff) and
 *                     the ones quarantined from an unregistered or inactive
 *                     device. Its own permission.
 *
 * NOTHING IS CALCULATED. No IN/OUT, hours, lateness, OT or status appears on
 * either tab. A day with one punch and a day with nine are both just rows.
 * Clock Time columns are as many as the widest row in the result.
 *
 * Punch location is shown under each time in the SAME neutral style for
 * every punch; cross-outlet movement is not a warning.
 */
export default function AttendanceListPage() {
  const router = useRouter();
  const toast = useToast();
  const canAudit = usePermissions(["view_attendance_punch_audit"]);
  const canExport = usePermissions(["export_raw_attendance"]);
  const { outlets } = useOutlets({ directory: true });
  const { departments } = useDepartments();

  const today = formatYYYYMMDD(new Date());
  const q = router.query || {};
  const [tab, setTab] = useState(q.tab === "audit" ? 1 : 0);

  useEffect(() => {
    if (!router.isReady) return;
    setTab(router.query.tab === "audit" ? 1 : 0);
  }, [router.isReady, router.query.tab]);

  return (
    <GlobalWrapper title="Attendance" permissionKey={["view_raw_attendance"]}>
      <Tabs
        index={tab}
        onChange={(i) => {
          setTab(i);
          const next = { ...router.query };
          if (i === 1) next.tab = "audit";
          else delete next.tab;
          router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true });
        }}
        colorScheme="purple"
        isLazy
      >
        <TabList mb={3}>
          <Tab>Attendance List</Tab>
          {canAudit ? <Tab>Punch Audit</Tab> : null}
        </TabList>
        <TabPanels>
          <TabPanel p={0}>
            <AttendanceListTab
              today={today}
              outlets={outlets}
              departments={departments}
              canExport={canExport}
              toast={toast}
              onOpenAudit={canAudit ? () => setTab(1) : null}
            />
          </TabPanel>
          {canAudit ? (
            <TabPanel p={0}>
              <PunchAuditTab today={today} outlets={outlets} initial={q} toast={toast} />
            </TabPanel>
          ) : null}
        </TabPanels>
      </Tabs>
    </GlobalWrapper>
  );
}

/* ======================================================= Attendance List */

function AttendanceListTab({ today, outlets, departments, canExport, toast, onOpenAudit }) {
  const [filters, setFilters] = useState({ from: today, to: today, home_outlet_id: "", department_id: "", search: "" });
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (f) => {
    setLoading(true);
    setError(null);
    try {
      const res = await AttendanceHelper.getAttendanceList(buildListQuery(f));
      if (res && res.code === 403) {
        setAccessDenied(true);
        setRows([]);
        setMeta(null);
      } else if (res && res.code === 200) {
        setAccessDenied(false);
        setRows(res.data || []);
        setMeta(res.meta || null);
      } else {
        setError((res && res.msg) || "Could not load the attendance list");
        setRows([]);
        setMeta(null);
      }
    } catch (err) {
      console.log(err);
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const apply = () => load(filters);

  const n = clockTimeColumnCount(meta, rows);
  const flat = useMemo(() => rows.map((r) => flattenRow(r, n)), [rows, n]);

  const colDefs = useMemo(() => {
    const defs = attendanceListColumns(n).map((c) => {
      if (c.punchIndex !== undefined) {
        return {
          field: c.key,
          headerName: c.header,
          minWidth: 110,
          // Export and sort on the bare time; the renderer adds the location line.
          valueGetter: (p) => (p.data && p.data[c.key] ? p.data[c.key].time : ""),
          cellRenderer: (p) =>
            p.data && p.data[c.key] ? <PunchTimeCell punch={p.data[c.key]} attendanceDate={p.data.clock_date} /> : null,
          autoHeight: true,
        };
      }
      if (c.key === "clock_date") {
        return { field: "clock_date_display", headerName: c.header, minWidth: 120 };
      }
      if (c.key === "punch_count") {
        return {
          field: "punch_count",
          headerName: c.header,
          minWidth: 130,
          valueGetter: (p) => (p.data ? punchesCellText(p.data) : ""),
          cellRenderer: (p) =>
            p.data && p.data.quarantined_punch_count > 0 ? (
              <Link href={auditLinkFor(p.data)} passHref>
                <a style={{ textDecoration: "underline" }} title="Open the Punch Audit for this day">
                  {punchesCellText(p.data)}
                </a>
              </Link>
            ) : (
              <span>{p.data ? punchesCellText(p.data) : ""}</span>
            ),
        };
      }
      if (c.key === "employee_name") {
        return {
          field: "employee_name",
          headerName: c.header,
          minWidth: 180,
          cellRenderer: (p) =>
            p.data && !p.data.matched ? <Badge colorScheme="gray">Not in employee master</Badge> : <span>{p.data ? p.data.employee_name : ""}</span>,
        };
      }
      return { field: c.key, headerName: c.header, minWidth: 120 };
    });
    return defs;
  }, [n]);

  const exportCsv = async (withLocations) => {
    setExporting(true);
    try {
      await AttendanceHelper.exportAttendanceList({ ...buildListQuery(filters), ...(withLocations ? { with_locations: 1 } : {}) });
    } catch (err) {
      toast({ title: err.message || "Export failed", status: "error", duration: 5000 });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <DateRangeFilter
        title="Attendance List"
        dateFrom={filters.from}
        dateTo={filters.to}
        onDateFromChange={(v) => setFilters((f) => ({ ...f, from: v }))}
        onDateToChange={(v) => setFilters((f) => ({ ...f, to: v }))}
        onToday={(from, to) => load({ ...filters, from, to })}
      />
      <CustomContainer
        title="Employee attendance rows"
        subtitle="One row per employee per attendance date. Every punch of the day is shown in time order, whichever outlet recorded it. Raw punches only - nothing is calculated."
        filledHeader
        rightSection={
          canExport ? (
            <Stack direction="row" spacing={2}>
              <Button size="sm" variant="outline" colorScheme="purple" isLoading={exporting} onClick={() => exportCsv(false)}>
                Export CSV
              </Button>
              <Button size="sm" variant="outline" colorScheme="purple" isLoading={exporting} onClick={() => exportCsv(true)}>
                Export CSV with locations
              </Button>
            </Stack>
          ) : null
        }
      >
        {accessDenied ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view the attendance list.
          </Alert>
        ) : (
          <>
            <Stack direction={{ base: "column", md: "row" }} spacing={3} mb={4} align="flex-end" flexWrap="wrap">
              <FormControl maxW="220px">
                <FormLabel fontSize="sm">Home Outlet</FormLabel>
                <Select size="sm" value={filters.home_outlet_id} onChange={(e) => setFilters((f) => ({ ...f, home_outlet_id: e.target.value }))}>
                  <option value="">All</option>
                  {outlets.map((o) => (
                    <option key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="220px">
                <FormLabel fontSize="sm">Department</FormLabel>
                <Select size="sm" value={filters.department_id} onChange={(e) => setFilters((f) => ({ ...f, department_id: e.target.value }))}>
                  <option value="">All</option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>{d.department_name}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="260px">
                <FormLabel fontSize="sm">Employee</FormLabel>
                <Input
                  size="sm"
                  placeholder="Employee code or name"
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
                />
              </FormControl>
              <Button size="sm" colorScheme="purple" onClick={apply} isLoading={loading}>
                Apply
              </Button>
            </Stack>

            <AttendanceBanners meta={meta} onOpenAudit={onOpenAudit} />

            {error ? (
              <Alert status="error" fontSize="sm" mb={3}>
                <AlertIcon />
                {error}
              </Alert>
            ) : null}

            {loading ? (
              <Stack align="center" py={10}>
                <Spinner color="purple.500" />
              </Stack>
            ) : (
              <>
                <Text fontSize="xs" color="gray.500" mb={2}>
                  {meta ? `${meta.row_count} row(s), up to ${n} punch(es) per row` : ""}
                </Text>
                <AgGrid rowData={flat} colDefs={colDefs} tableKey="attendance-raw-list" hideExport />
              </>
            )}
          </>
        )}
      </CustomContainer>
    </>
  );
}

/* ========================================================== Punch Audit */

function PunchAuditTab({ today, outlets, initial, toast }) {
  const [devices, setDevices] = useState([]);
  const [filters, setFilters] = useState({
    from: initial.from || today,
    to: initial.to || today,
    dev_id: initial.dev_id || "",
    punch_outlet_id: initial.punch_outlet_id || "",
    device_status: initial.device_status || "",
    review: initial.review || "",
    source_ip: "",
    search: initial.search || "",
    employee_id: initial.employee_id || "",
    attendance_date: initial.attendance_date || "",
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await AttendanceHelper.getDevices();
        if (res && res.code === 200) setDevices(res.data || []);
      } catch (err) {
        console.log(err);
      }
    })();
  }, []);

  const load = useCallback(async (f) => {
    setLoading(true);
    try {
      const res = await AttendanceHelper.getPunchAudit(buildAuditQuery(f));
      if (res && res.code === 403) {
        setAccessDenied(true);
        setRows([]);
      } else if (res && res.code === 200) {
        setAccessDenied(false);
        setRows(res.data || []);
      } else {
        toast({ title: (res && res.msg) || "Could not load punches", status: "error", duration: 5000 });
      }
    } catch (err) {
      console.log(err);
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const colDefs = useMemo(
    () => [
      { field: "clock_time", headerName: "Time", minWidth: 100 },
      { field: "calendar_date", headerName: "Calendar Date", minWidth: 120, valueGetter: (p) => (p.data ? displayDate(p.data.calendar_date) : "") },
      { field: "attendance_date", headerName: "Attendance Date", minWidth: 130, valueGetter: (p) => (p.data && p.data.attendance_date ? displayDate(p.data.attendance_date) : "") },
      { field: "user_id", headerName: "Employee Code", minWidth: 120 },
      { field: "employee_name", headerName: "Employee Name", minWidth: 160, valueGetter: (p) => (p.data ? p.data.employee_name || "" : "") },
      { field: "home_outlet", headerName: "Home Outlet", minWidth: 120, valueGetter: (p) => (p.data ? p.data.home_outlet || "" : "") },
      { field: "punch_outlet", headerName: "Punch Location", minWidth: 130, valueGetter: (p) => (p.data ? p.data.punch_outlet || "" : "") },
      { field: "device_label", headerName: "Device", minWidth: 120, valueGetter: (p) => (p.data ? p.data.device_label || "" : "") },
      { field: "dev_id", headerName: "Cloud ID", minWidth: 170 },
      { field: "source_ip", headerName: "Source IP", minWidth: 130 },
      {
        field: "status",
        headerName: "Status",
        minWidth: 220,
        valueGetter: (p) => {
          if (!p.data) return "";
          const parts = [];
          if (p.data.derivation_status && p.data.derivation_status !== "OK") parts.push(DERIVATION_STATUS_LABEL[p.data.derivation_status] || p.data.derivation_status);
          if (!p.data.derivation_status) parts.push("No derived row");
          if (p.data.device_status !== "REGISTERED") parts.push(DEVICE_STATUS_LABEL[p.data.device_status] || p.data.device_status);
          return parts.join("; ") || "Dated";
        },
        cellRenderer: (p) => {
          if (!p.data) return null;
          const badges = [];
          if (p.data.derivation_status && p.data.derivation_status !== "OK") badges.push(p.data.derivation_status);
          if (p.data.device_status !== "REGISTERED") badges.push(p.data.device_status);
          if (badges.length === 0) return <Badge colorScheme="gray">DATED</Badge>;
          return (
            <Stack direction="row" spacing={1}>
              {badges.map((b) => (
                <Badge key={b} colorScheme="gray" title={DERIVATION_STATUS_LABEL[b] || DEVICE_STATUS_LABEL[b] || b}>{b}</Badge>
              ))}
            </Stack>
          );
        },
      },
      {
        field: "biomax_punch_id",
        headerName: "Day",
        minWidth: 110,
        valueGetter: (p) => (p.data && p.data.attendance_date ? "Open day" : ""),
        cellRenderer: (p) =>
          p.data && p.data.attendance_date && p.data.employee_id ? (
            <Link href={`/attendance/list?from=${p.data.attendance_date}&to=${p.data.attendance_date}&search=${encodeURIComponent(p.data.user_id)}`} passHref>
              <a style={{ textDecoration: "underline" }}>Open day</a>
            </Link>
          ) : null,
      },
    ],
    []
  );

  const exportCsv = async () => {
    setExporting(true);
    try {
      await AttendanceHelper.exportPunchAudit(buildAuditQuery(filters));
    } catch (err) {
      toast({ title: err.message || "Export failed", status: "error", duration: 5000 });
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <DateRangeFilter
        title="Punch Audit"
        dateFrom={filters.from}
        dateTo={filters.to}
        onDateFromChange={(v) => setFilters((f) => ({ ...f, from: v }))}
        onDateToChange={(v) => setFilters((f) => ({ ...f, to: v }))}
        onToday={(from, to) => load({ ...filters, from, to })}
      />
      <CustomContainer
        title="Physical punches"
        subtitle="This view lists physical punches by calendar date. It is not an attendance list. Use it to see what a device or an outlet recorded, and to review punches that could not be dated yet."
        filledHeader
        rightSection={
          <Button size="sm" variant="outline" colorScheme="purple" isLoading={exporting} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      >
        {accessDenied ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view the punch audit.
          </Alert>
        ) : (
          <>
            <Stack direction={{ base: "column", md: "row" }} spacing={3} mb={4} align="flex-end" flexWrap="wrap">
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Punch Location</FormLabel>
                <Select size="sm" value={filters.punch_outlet_id} onChange={(e) => setFilters((f) => ({ ...f, punch_outlet_id: e.target.value }))}>
                  <option value="">All</option>
                  {outlets.map((o) => (
                    <option key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="240px">
                <FormLabel fontSize="sm">Device</FormLabel>
                <Select size="sm" value={filters.dev_id} onChange={(e) => setFilters((f) => ({ ...f, dev_id: e.target.value }))}>
                  <option value="">All</option>
                  {devices.map((d) => (
                    <option key={d.dev_id} value={d.dev_id}>
                      {d.label} ({d.dev_id}){d.status === "INACTIVE" ? " - inactive" : ""}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Device status</FormLabel>
                <Select size="sm" value={filters.device_status} onChange={(e) => setFilters((f) => ({ ...f, device_status: e.target.value }))}>
                  <option value="">All</option>
                  <option value="REGISTERED">Registered</option>
                  <option value="UNREGISTERED_DEVICE">Unregistered devices only</option>
                  <option value="INACTIVE_DEVICE">Inactive devices only</option>
                </Select>
              </FormControl>
              <FormControl maxW="180px">
                <FormLabel fontSize="sm">Review</FormLabel>
                <Select size="sm" value={filters.review} onChange={(e) => setFilters((f) => ({ ...f, review: e.target.value }))}>
                  <option value="">All punches</option>
                  <option value="needs_review">Needs review</option>
                  <option value="ok">Dated and registered</option>
                </Select>
              </FormControl>
              <FormControl maxW="200px">
                <FormLabel fontSize="sm">Employee</FormLabel>
                <Input size="sm" placeholder="Code or name" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
              </FormControl>
              <FormControl maxW="160px">
                <FormLabel fontSize="sm">Source IP</FormLabel>
                <Input size="sm" value={filters.source_ip} onChange={(e) => setFilters((f) => ({ ...f, source_ip: e.target.value }))} />
              </FormControl>
              <Button size="sm" colorScheme="purple" onClick={() => load(filters)} isLoading={loading}>
                Apply
              </Button>
            </Stack>
            {loading ? (
              <Stack align="center" py={10}>
                <Spinner color="purple.500" />
              </Stack>
            ) : (
              <AgGrid rowData={rows} colDefs={colDefs} tableKey="attendance-punch-audit" hideExport />
            )}
          </>
        )}
      </CustomContainer>
    </>
  );
}
