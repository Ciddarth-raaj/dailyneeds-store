import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Spinner,
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import WhDailyReportsHelper from "../../helper/whDailyReports";
import { exportToExcel } from "../../util/exportCSVFile";
import {
  BOX_ISSUE_KEYS,
  BOX_STATUS,
  JOB_REPORTS,
  LABEL,
  dailyRows,
  excel,
  filterArticles,
  funnelRows,
  jobTypesOf,
  pivotByReport,
  totalsByReport,
  yesterdayIso,
} from "../../util/whDailyReports";

const SHOW_ROWS = 300;
const count = (n) => (n === null || n === undefined || n === "" ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 }));
const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const dayText = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
const timeText = (t) => (t ? String(t).slice(11, 16) : "—");
const errMsg = (err, fallback) => (err && err.response && err.response.data && err.response.data.msg) || (err && err.message) || fallback;
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ""));

/** A headline number. */
function Kpi({ title, value, sub, color = "gray", hint }) {
  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderTopWidth="3px" borderTopColor={`${color}.400`} borderRadius="md" px={4} py={3}>
      <Flex align="center" gap={1}>
        <Text fontSize="xs" fontWeight="700" color={`${color}.700`} textTransform="uppercase" letterSpacing="wide">
          {title}
        </Text>
        {hint ? (
          <Tooltip label={hint} hasArrow>
            <Text as="span" fontSize="xs" color="gray.400">
              <i className="fa-regular fa-circle-question" />
            </Text>
          </Tooltip>
        ) : null}
      </Flex>
      <Text fontSize="2xl" fontWeight="700" color="gray.800" lineHeight="short">
        {value}
      </Text>
      <Text fontSize="xs" color="gray.500">
        {sub}
      </Text>
    </Box>
  );
}

/** A plain table: columns are { label, render(row), numeric }. Shows the first SHOW_ROWS rows. */
function DataTable({ columns, rows, empty = "Nothing for this range", rowKey }) {
  if (!rows.length) {
    return (
      <Text fontSize="sm" color="gray.500" py={6} textAlign="center">
        {empty}
      </Text>
    );
  }
  return (
    <Box overflowX="auto" bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md">
      <Table size="sm">
        <Thead bg="gray.50">
          <Tr>
            {columns.map((c) => (
              <Th key={c.label} isNumeric={c.numeric} whiteSpace="nowrap">
                {c.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.slice(0, SHOW_ROWS).map((r, i) => (
            <Tr key={rowKey ? rowKey(r, i) : i}>
              {columns.map((c) => (
                <Td key={c.label} isNumeric={c.numeric} whiteSpace={c.wrap ? "normal" : "nowrap"}>
                  {c.render(r)}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
      {rows.length > SHOW_ROWS ? (
        <Text fontSize="xs" color="gray.500" px={3} py={2}>
          Showing {SHOW_ROWS} of {rows.length.toLocaleString("en-IN")} - download for all.
        </Text>
      ) : null}
    </Box>
  );
}

function SectionBar({ children, onDownload, downloadLabel = "Download" }) {
  return (
    <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={3}>
      <Flex gap={2} align="center" wrap="wrap">
        {children}
      </Flex>
      {onDownload ? (
        <Button size="sm" variant="outline" colorScheme="teal" onClick={onDownload} leftIcon={<i className="fa-solid fa-file-excel" />}>
          {downloadLabel}
        </Button>
      ) : null}
    </Flex>
  );
}

/** Short qty and value under one report's column. */
const shortCell = (t) =>
  t.short_qty ? (
    <Box>
      <Text fontWeight="600">{count(t.short_qty)}</Text>
      <Text fontSize="xs" color="gray.500">
        {rupees(t.short_value)} · {t.short_lines} lines
      </Text>
    </Box>
  ) : (
    <Text color="gray.300">0</Text>
  );

const pivotColumns = (keyLabel) => [
  { label: keyLabel, render: (r) => <Text textTransform="capitalize">{r.key}</Text>, wrap: true },
  ...JOB_REPORTS.map((rep) => ({ label: `${rep.label} write-off`, numeric: true, render: (r) => shortCell(r[rep.key]) })),
  { label: "Verification returned", numeric: true, render: (r) => count(r.VERIFICATION.returned_qty) },
  {
    label: "Total",
    numeric: true,
    render: (r) => (
      <Box>
        <Text fontWeight="700">{count(r.total_short_qty)}</Text>
        <Text fontSize="xs" color="gray.500">
          {rupees(r.total_short_value)}
        </Text>
      </Box>
    ),
  },
];

export default function AnalysisView() {
  const router = useRouter();
  const [from, setFrom] = useState(yesterdayIso());
  const [to, setTo] = useState(yesterdayIso());
  const [store, setStore] = useState("");
  const [ready, setReady] = useState(false);
  const [state, setState] = useState({ loading: false, error: null, data: null });
  const [artReport, setArtReport] = useState("");
  const [artSearch, setArtSearch] = useState("");
  const [funnelJob, setFunnelJob] = useState("STA");
  const [downloading, setDownloading] = useState("");

  // ?from=&to= from the Daily Uploads page.
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query || {};
    if (isDate(q.from)) setFrom(q.from);
    if (isDate(q.to)) setTo(q.to);
    else if (isDate(q.from)) setTo(q.from);
    setReady(true);
  }, [router.isReady, router.query]);

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return WhDailyReportsHelper.analysis({ from, to, store: store || undefined })
      .then((res) => setState({ loading: false, error: null, data: res.data }))
      .catch((err) => setState({ loading: false, error: errMsg(err, "Could not load the analysis"), data: null }));
  }, [from, to, store]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const d = state.data;
  const totals = useMemo(() => totalsByReport(d && d.summary), [d]);
  const byStore = useMemo(() => pivotByReport(d && d.by_store, "to_store"), [d]);
  const byDept = useMemo(() => pivotByReport(d && d.by_department, "department"), [d]);
  const byJob = useMemo(() => pivotByReport(d && d.by_job_type, "job_type"), [d]);
  const byWorker = useMemo(() => pivotByReport(d && d.by_worker, "worked_by"), [d]);
  const daily = useMemo(() => dailyRows(d && d.daily, d && d.boxes && d.boxes.daily), [d]);
  const jobTypes = useMemo(() => jobTypesOf(d && d.funnel), [d]);
  const funnel = useMemo(() => funnelRows(d && d.funnel, funnelJob), [d, funnelJob]);
  const articles = useMemo(() => filterArticles(d && d.short_articles, { report: artReport, search: artSearch }), [d, artReport, artSearch]);
  const boxStatus = useMemo(() => Object.fromEntries(((d && d.boxes && d.boxes.by_status) || []).map((s) => [s.status, s])), [d]);
  const boxIssues = (d && d.boxes && d.boxes.issues) || [];
  const boxProblemLines = BOX_ISSUE_KEYS.reduce((s, k) => s + ((boxStatus[k] && boxStatus[k].lines) || 0), 0);
  const uploadedDays = useMemo(() => {
    const m = new Map();
    for (const u of (d && d.uploads) || []) m.set(u.report_date, (m.get(u.report_date) || 0) + 1);
    return m;
  }, [d]);
  const incompleteDays = [...uploadedDays.entries()].filter(([, n]) => n < 5).length;
  const loadedBoxes = Object.values(boxStatus).reduce((s, x) => s + (x.status === "NOT_LOADED" ? 0 : x.boxes), 0);

  const name = (what) => `Warehouse ${what} ${from === to ? from : `${from} to ${to}`}${store ? ` ${store}` : ""}.xlsx`;

  /** Rows straight from the server (all of them, not the page's first 300). */
  const downloadRows = async (only, reportType = "") => {
    const key = `${only}${reportType}`;
    setDownloading(key);
    try {
      const res = await WhDailyReportsHelper.rows({ from, to, only, store: store || undefined, report_type: reportType || undefined });
      const rows = excel.jobRows(res.data.rows || []);
      const what = only === "short" ? "write-off lines" : only === "open" ? "open job lines" : only === "returned" ? "returned lines" : `${LABEL[reportType] || ""} rows`;
      exportToExcel([rows], [what.slice(0, 31)], name(what));
    } catch (err) {
      toast.error(errMsg(err, "Download failed"));
    } finally {
      setDownloading("");
    }
  };

  const downloadAll = async () => {
    setDownloading("all");
    try {
      const res = await WhDailyReportsHelper.rows({ from, to, only: "short", store: store || undefined });
      exportToExcel(
        [
          excel.byKey(byStore, "Store"),
          excel.byKey(byDept, "Department"),
          excel.byKey(byJob, "Job type"),
          excel.byKey(byWorker, "Staff (RetailPilot user)"),
          excel.articles(d.short_articles || []),
          excel.jobRows(res.data.rows || []),
          excel.daily(daily),
          excel.funnel(funnelRows(d.funnel, "")),
          excel.trucks(d.boxes.trucks || []),
          excel.boxLines(boxIssues),
          excel.boxLines(d.boxes.returns || []),
        ],
        ["By store", "By department", "By job type", "By staff", "Articles", "Write-off lines", "Daily", "Store funnel", "Trucks", "Box issues", "Damage returns"],
        name("analysis")
      );
    } catch (err) {
      toast.error(errMsg(err, "Download failed"));
    } finally {
      setDownloading("");
    }
  };

  const unpriced = JOB_REPORTS.reduce((s, r) => s + totals[r.key].short_unpriced_lines, 0);

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={3}>
        <Box>
          <Text as="h1" fontSize="xl" fontWeight="700" color="gray.800">
            Warehouse Reports Analysis
          </Text>
          <Text fontSize="sm" color="gray.500">
            Write-off at picking, packing and verification, and loading against unloading, from the daily uploads.
          </Text>
        </Box>
        <Flex gap={2} wrap="wrap" align="center">
          <Input type="date" size="sm" w="auto" bg="white" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} aria-label="From" />
          <Text fontSize="sm" color="gray.500">
            to
          </Text>
          <Input type="date" size="sm" w="auto" bg="white" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} aria-label="To" />
          <Select size="sm" w="auto" bg="white" value={store} onChange={(e) => setStore(e.target.value)} aria-label="Store">
            <option value="">All stores</option>
            {((d && d.stores) || []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Button size="sm" colorScheme="teal" onClick={load} isLoading={state.loading} leftIcon={<i className="fa-solid fa-rotate" />}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" colorScheme="teal" onClick={downloadAll} isDisabled={!d} isLoading={downloading === "all"} leftIcon={<i className="fa-solid fa-file-excel" />}>
            Download all
          </Button>
        </Flex>
      </Flex>

      {state.error ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription fontSize="sm">{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {!d && state.loading ? (
        <Flex minH="240px" align="center" justify="center">
          <Spinner size="lg" color="teal.500" thickness="3px" />
        </Flex>
      ) : null}

      {d ? (
        <>
          {!d.uploads.length ? (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">Nothing has been uploaded for {from === to ? dayText(from) : "these days"}.</AlertDescription>
            </Alert>
          ) : incompleteDays ? (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">
                {incompleteDays} day{incompleteDays === 1 ? "" : "s"} in this range {incompleteDays === 1 ? "is" : "are"} missing some of the five reports - see the Uploads tab.
              </AlertDescription>
            </Alert>
          ) : null}
          {unpriced ? (
            <Text fontSize="xs" color="gray.500">
              {unpriced} write-off line{unpriced === 1 ? "" : "s"} have no MRP (not in the file and never received on a GRN) and count as ₹0.
            </Text>
          ) : null}

          <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} spacing={3}>
            <Kpi
              title="Picking write-off"
              color="orange"
              value={count(totals.PICKING.short_qty)}
              sub={`${rupees(totals.PICKING.short_value)} · ${count(totals.PICKING.short_lines)} lines`}
              hint="Short Qty in the Picking report"
            />
            <Kpi
              title="Packing write-off"
              color="purple"
              value={count(totals.PACKING.short_qty)}
              sub={`${rupees(totals.PACKING.short_value)} · ${count(totals.PACKING.short_lines)} lines`}
              hint="Short Qty in the Packing report"
            />
            <Kpi
              title="Verification short"
              color="green"
              value={count(totals.VERIFICATION.short_qty)}
              sub={`${rupees(totals.VERIFICATION.short_value)} · ${count(totals.VERIFICATION.returned_qty)} returned`}
              hint="Short Qty in the Verification report; returned is Returned Qty"
            />
            <Kpi
              title="Open jobs"
              color="yellow"
              value={count(totals.PICKING.open_lines + totals.PACKING.open_lines + totals.VERIFICATION.open_lines)}
              sub={`Picking ${count(totals.PICKING.open_lines)} · Verification ${count(totals.VERIFICATION.open_lines)}`}
              hint="Article lines with jobs still open when the report was taken"
            />
            <Kpi
              title="Box issues"
              color={boxProblemLines ? "red" : "blue"}
              value={count(boxProblemLines)}
              sub={`of ${count(loadedBoxes)} boxes loaded`}
              hint="Box lines not unloaded, unloaded at the wrong store, with a different quantity, or unloaded without loading"
            />
            <Kpi
              title="Damage returns"
              color="gray"
              value={count(boxStatus.RETURN ? boxStatus.RETURN.qty : 0)}
              sub={`${count(boxStatus.RETURN ? boxStatus.RETURN.boxes : 0)} boxes · ${rupees(boxStatus.RETURN ? boxStatus.RETURN.value : 0)}`}
              hint="Damage boxes loaded to go back to the warehouse"
            />
          </SimpleGrid>

          <Tabs colorScheme="teal" variant="enclosed" isLazy>
            <TabList overflowX="auto" overflowY="hidden">
              <Tab>By store</Tab>
              <Tab>By department</Tab>
              <Tab>By staff</Tab>
              <Tab>Articles</Tab>
              <Tab>Daily trend</Tab>
              <Tab>Store funnel</Tab>
              <Tab>Boxes & trucks</Tab>
              <Tab>Downloads</Tab>
              <Tab>Uploads</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <SectionBar onDownload={() => exportToExcel([excel.byKey(byStore, "Store")], ["By store"], name("write-off by store"))}>
                  <Text fontSize="sm" color="gray.600">
                    Write-off per store, highest value first.
                  </Text>
                </SectionBar>
                <DataTable columns={pivotColumns("Store")} rows={byStore} rowKey={(r) => r.key} />
                <Text fontWeight="600" color="gray.700" mt={5} mb={2}>
                  By job type
                </Text>
                <DataTable columns={pivotColumns("Job type")} rows={byJob} rowKey={(r) => r.key} />
              </TabPanel>

              <TabPanel px={0}>
                <SectionBar onDownload={() => exportToExcel([excel.byKey(byDept, "Department")], ["By department"], name("write-off by department"))}>
                  <Text fontSize="sm" color="gray.600">
                    Write-off per department, highest value first.
                  </Text>
                </SectionBar>
                <DataTable columns={pivotColumns("Department")} rows={byDept} rowKey={(r) => r.key} />
              </TabPanel>

              <TabPanel px={0}>
                <SectionBar onDownload={() => exportToExcel([excel.byKey(byWorker, "Staff (RetailPilot user)")], ["By staff"], name("write-off by staff"))}>
                  <Text fontSize="sm" color="gray.600" maxW="640px">
                    Write-off by who did the job in RetailPilot - the picker, packer or verifier (RetailPilot user id). &quot;Not recorded&quot; is uploaded files and jobs the system finished.
                  </Text>
                </SectionBar>
                <DataTable
                  columns={[
                    { label: "Staff (RetailPilot user)", render: (r) => <Text fontWeight="600">{r.key === "(blank)" ? "Not recorded" : r.key}</Text> },
                    ...pivotColumns("Staff").slice(1),
                  ]}
                  rows={byWorker}
                  rowKey={(r) => r.key}
                />
              </TabPanel>

              <TabPanel px={0}>
                <SectionBar onDownload={() => exportToExcel([excel.articles(articles)], ["Articles"], name("write-off articles"))}>
                  <Select size="sm" w="auto" value={artReport} onChange={(e) => setArtReport(e.target.value)} aria-label="Report">
                    <option value="">All reports</option>
                    {JOB_REPORTS.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </Select>
                  <InputGroup size="sm" w={{ base: "100%", md: "240px" }}>
                    <InputLeftElement pointerEvents="none" color="gray.400">
                      <i className="fa-solid fa-magnifying-glass" />
                    </InputLeftElement>
                    <Input placeholder="Article name or ID" value={artSearch} onChange={(e) => setArtSearch(e.target.value)} />
                  </InputGroup>
                  <Text fontSize="xs" color="gray.500">
                    Articles short on the most days first - repeat shortages point to stock or bin problems.
                  </Text>
                </SectionBar>
                <DataTable
                  rows={articles}
                  rowKey={(a) => `${a.report_type}-${a.article_id}`}
                  columns={[
                    { label: "Report", render: (a) => <Badge colorScheme={(JOB_REPORTS.find((r) => r.key === a.report_type) || {}).color}>{LABEL[a.report_type]}</Badge> },
                    { label: "Article", wrap: true, render: (a) => (
                      <Box minW="220px">
                        <Text>{a.article_name || "—"}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {a.article_id} · {a.department || "—"}
                        </Text>
                      </Box>
                    ) },
                    { label: "Days short", numeric: true, render: (a) => (a.days_short > 1 ? <Badge colorScheme="red">{a.days_short}</Badge> : a.days_short) },
                    { label: "Stores", wrap: true, render: (a) => <Text textTransform="capitalize" fontSize="xs">{a.stores}</Text> },
                    { label: "Short qty", numeric: true, render: (a) => count(a.short_qty) },
                    { label: "MRP", numeric: true, render: (a) => (a.mrp == null ? "—" : rupees(a.mrp)) },
                    { label: "Value", numeric: true, render: (a) => rupees(a.short_value) },
                    { label: "Last short", render: (a) => dayText(a.last_short_date) },
                  ]}
                />
              </TabPanel>

              <TabPanel px={0}>
                <SectionBar onDownload={() => exportToExcel([excel.daily(daily)], ["Daily"], name("daily trend"))}>
                  <Text fontSize="sm" color="gray.600">
                    Write-off and box issues for each day - pick a longer range to see the trend.
                  </Text>
                </SectionBar>
                <DataTable
                  rows={daily}
                  rowKey={(r) => r.date}
                  columns={[
                    { label: "Date", render: (r) => dayText(r.date) },
                    ...JOB_REPORTS.map((rep) => ({ label: `${rep.label} write-off`, numeric: true, render: (r) => shortCell(r[rep.key]) })),
                    { label: "Open jobs", numeric: true, render: (r) => count(r.PICKING.open_lines + r.PACKING.open_lines + r.VERIFICATION.open_lines) },
                    { label: "Boxes", numeric: true, render: (r) => count(r.boxes) },
                    { label: "Box issues", numeric: true, render: (r) => (r.box_issue_lines ? <Badge colorScheme="red">{r.box_issue_lines}</Badge> : 0) },
                  ]}
                />
              </TabPanel>

              <TabPanel px={0}>
                <SectionBar onDownload={() => exportToExcel([excel.funnel(funnel)], ["Store funnel"], name(`store funnel ${funnelJob || "all"}`))}>
                  <Select size="sm" w="auto" value={funnelJob} onChange={(e) => setFunnelJob(e.target.value)} aria-label="Job type">
                    <option value="">All job types</option>
                    {jobTypes.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </Select>
                  <Text fontSize="xs" color="gray.500" maxW="560px">
                    Quantity through each step for the same days. A step lower than the one before it is where stock went missing - or moved to another day.
                  </Text>
                </SectionBar>
                <DataTable
                  rows={funnel}
                  rowKey={(r) => r.store}
                  columns={[
                    { label: "Store", render: (r) => <Text textTransform="capitalize">{r.store}</Text> },
                    { label: "Picked", numeric: true, render: (r) => count(r.picked) },
                    { label: "Picking short", numeric: true, render: (r) => (r.picking_short ? <Text color="orange.600">{count(r.picking_short)}</Text> : 0) },
                    { label: "Packed", numeric: true, render: (r) => count(r.packed) },
                    { label: "Loaded", numeric: true, render: (r) => count(r.loaded) },
                    { label: "Unloaded", numeric: true, render: (r) => <Text color={r.unloaded < r.loaded ? "red.600" : undefined}>{count(r.unloaded)}</Text> },
                    { label: "Verified", numeric: true, render: (r) => count(r.verified) },
                    { label: "Verification short", numeric: true, render: (r) => (r.verification_short ? <Text color="green.700">{count(r.verification_short)}</Text> : 0) },
                  ]}
                />
              </TabPanel>

              <TabPanel px={0}>
                <Flex gap={2} wrap="wrap" mb={3}>
                  {Object.entries(BOX_STATUS).map(([k, s]) =>
                    boxStatus[k] ? (
                      <Tooltip key={k} label={s.hint} hasArrow>
                        <Badge colorScheme={s.color} px={2} py={1} fontSize="xs">
                          {s.label}: {count(boxStatus[k].lines)} lines · {count(boxStatus[k].boxes)} boxes · {count(boxStatus[k].qty)} qty
                        </Badge>
                      </Tooltip>
                    ) : null
                  )}
                </Flex>
                <SectionBar onDownload={() => exportToExcel([excel.trucks(d.boxes.trucks)], ["Trucks"], name("trucks"))}>
                  <Text fontWeight="600" color="gray.700">
                    Trucks
                  </Text>
                </SectionBar>
                <DataTable
                  rows={d.boxes.trucks}
                  rowKey={(t) => `${t.report_date}-${t.truck_no}`}
                  columns={[
                    { label: "Date", render: (t) => dayText(t.report_date) },
                    { label: "Truck", render: (t) => <Text fontWeight="600">{t.truck_no || "—"}</Text> },
                    { label: "Stores", wrap: true, render: (t) => <Text fontSize="xs" textTransform="capitalize">{t.stores || "—"}</Text> },
                    { label: "Boxes", numeric: true, render: (t) => count(t.boxes) },
                    { label: "Loaded qty", numeric: true, render: (t) => count(t.loaded_qty) },
                    { label: "Unloaded qty", numeric: true, render: (t) => count(t.unloaded_qty) },
                    { label: "Loading", render: (t) => `${timeText(t.first_loaded_at)} – ${timeText(t.last_loaded_at)}` },
                    { label: "Unloading", render: (t) => `${timeText(t.first_unloaded_at)} – ${timeText(t.last_unloaded_at)}` },
                    { label: "Loaded by", wrap: true, render: (t) => <Text fontSize="xs">{t.loaded_by || "—"}</Text> },
                    { label: "Unloaded by", wrap: true, render: (t) => <Text fontSize="xs">{t.unloaded_by || "—"}</Text> },
                    { label: "Issues", numeric: true, render: (t) => (t.issues ? <Badge colorScheme="red">{t.issues}</Badge> : 0) },
                    { label: "Damage returns", numeric: true, render: (t) => count(t.returns) },
                  ]}
                />
                <Box mt={5}>
                  <SectionBar onDownload={() => exportToExcel([excel.boxLines(boxIssues), excel.boxLines(d.boxes.returns || [])], ["Box issues", "Damage returns"], name("box issues"))}>
                    <Text fontWeight="600" color="gray.700">
                      Box issues
                    </Text>
                  </SectionBar>
                  <DataTable
                    rows={boxIssues}
                    empty="Every loaded box was unloaded at its store with the same quantity."
                    columns={[
                      { label: "Status", render: (l) => <Badge colorScheme={(BOX_STATUS[l.status] || {}).color}>{(BOX_STATUS[l.status] || {}).label || l.status}</Badge> },
                      { label: "Date", render: (l) => dayText(l.report_date) },
                      { label: "Box", render: (l) => l.box_id },
                      { label: "Truck", render: (l) => l.truck_no || "—" },
                      { label: "Planned store", render: (l) => <Text textTransform="capitalize">{l.planned_to_store || "—"}</Text> },
                      { label: "Unloaded at", render: (l) => <Text textTransform="capitalize">{l.unloaded_store || "—"}</Text> },
                      { label: "Article", wrap: true, render: (l) => <Text fontSize="xs">{l.article_id} · {l.article_name || "—"}</Text> },
                      { label: "Loaded", numeric: true, render: (l) => count(l.loaded_qty) },
                      { label: "Unloaded", numeric: true, render: (l) => count(l.unloaded_qty) },
                    ]}
                  />
                </Box>
              </TabPanel>

              <TabPanel px={0}>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  Every row, straight from the uploads, for the dates{store ? " and store" : ""} chosen above.
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
                  {[
                    { only: "short", label: "All write-off lines", hint: "Picking, Packing and Verification rows with Short Qty" },
                    { only: "open", label: "Open job lines", hint: "Rows with jobs still open" },
                    { only: "returned", label: "Verification returned lines", hint: "Rows with Returned Qty" },
                    ...JOB_REPORTS.map((r) => ({ only: "all", report: r.key, label: `Full ${r.label} report`, hint: "Every row as uploaded" })),
                  ].map((x) => (
                    <Box key={`${x.only}${x.report || ""}`} bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
                      <Text fontWeight="600">{x.label}</Text>
                      <Text fontSize="xs" color="gray.500" mb={2}>
                        {x.hint}
                      </Text>
                      <Button size="sm" variant="outline" colorScheme="teal" isLoading={downloading === `${x.only}${x.report || ""}`} onClick={() => downloadRows(x.only, x.report || "")} leftIcon={<i className="fa-solid fa-download" />}>
                        Download
                      </Button>
                    </Box>
                  ))}
                </SimpleGrid>
              </TabPanel>

              <TabPanel px={0}>
                <DataTable
                  rows={d.uploads}
                  rowKey={(u) => u.upload_id}
                  empty="Nothing uploaded for this range."
                  columns={[
                    { label: "Date", render: (u) => dayText(u.report_date) },
                    { label: "Report", render: (u) => LABEL[u.report_type] || u.report_type },
                    { label: "Rows", numeric: true, render: (u) => count(u.row_count) },
                    { label: "File", wrap: true, render: (u) => <Text fontSize="xs">{u.file_name || "—"}</Text> },
                    { label: "Uploaded by", render: (u) => u.uploaded_by_name || "—" },
                    { label: "At", render: (u) => (u.uploaded_at ? new Date(u.uploaded_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—") },
                  ]}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </>
      ) : null}
    </Flex>
  );
}
