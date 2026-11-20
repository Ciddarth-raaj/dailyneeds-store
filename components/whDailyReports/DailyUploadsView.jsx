import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  SimpleGrid,
  Spinner,
  Table,
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
import usePermissions from "../../customHooks/usePermissions";
import { LABEL, REPORTS, addDays, planUploads, slotsFor, toPayload, uploadGrid, yesterdayIso } from "../../util/whDailyReports";

const HISTORY_DAYS = 31;
/** More files than this, or more than one day, upload as a batch: one progress message and one summary. */
const BATCH_FROM = 6;
const count = (n) => Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const dayText = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }) : "—");
const timeText = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
const errMsg = (err, fallback) => (err && err.response && err.response.data && err.response.data.msg) || (err && err.message) || fallback;

/** Read a CSV or Excel file into { headers, rows }, cells as text so ids keep their leading zeros. */
async function readFile(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", raw: true, cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("The file has no sheet");
  return toPayload(XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" }));
}

/** What one upload found, for the toast. */
function summaryText(type, s, date) {
  if (!s) return "";
  if (s.boxes !== undefined) return `${count(s.rows)} rows · ${count(s.boxes)} boxes · ${count(s.trucks)} trucks`;
  const parts = [`${count(s.rows)} rows`, `${count(s.short_lines)} short lines`, `write-off ${count(s.short_qty)} qty`];
  if (s.short_value) parts.push(rupees(s.short_value));
  if (s.short_unpriced_lines) parts.push(`${s.short_unpriced_lines} without MRP`);
  // What a report sent to its Pick & Pack page.
  const pages = [
    [s.verification_page, "Pick & Pack → Verification", "Verification report"],
    [s.write_off_page, "Pick & Pack → Write Off", "Picking report"],
  ];
  for (const [v, pageName, report] of pages) {
    if (!v) continue;
    const where = `${pageName}${date ? ` (${dayText(date)})` : ""}`;
    if (!s.short_lines) {
      parts.push(`No write-off in this ${report} - nothing added to ${where}`);
    } else {
      const page = [v.added ? `${v.added} added` : null, v.updated ? `${v.updated} updated` : null, v.unchanged ? `${v.unchanged} already there` : null, v.kept_verified ? `${v.kept_verified} already verified, left as is` : null, v.removed ? `${v.removed} no longer in the report, removed` : null]
        .filter(Boolean)
        .join(", ");
      parts.push(`${where}: ${page || "nothing added"}`);
    }
    if (v.unknown_articles) parts.push(`${v.unknown_articles} article(s) not in the product master, not added`);
    if (v.other_job_type_lines) parts.push(`${v.other_job_type_lines} line(s) not GRN/STA, not added`);
  }
  return parts.join(" · ");
}

/** One report's slot for the chosen day. */
function Slot({ slot, canUpload, busy, onPick, onRemove }) {
  const u = slot.upload;
  return (
    <Box bg="white" borderWidth="2px" borderColor={u ? `${slot.color}.300` : "gray.200"} borderStyle={u ? "solid" : "dashed"} borderRadius="lg" p={4}>
      <Flex justify="space-between" align="center" gap={2}>
        <Text fontWeight="700" color={`${slot.color}.700`}>
          {slot.label}
        </Text>
        {u ? (
          <Badge colorScheme={u.source === "RETAILPILOT" ? "blue" : "green"} variant="subtle">
            <i className="fa-solid fa-check" /> {u.source === "RETAILPILOT" ? "RetailPilot" : "Uploaded"}
          </Badge>
        ) : (
          <Badge colorScheme="gray" variant="subtle">
            Pending
          </Badge>
        )}
      </Flex>
      <Text fontSize="xs" color="gray.500" mb={2}>
        {slot.hint}
      </Text>
      {u ? (
        <Box fontSize="sm" color="gray.700" minH="54px">
          <Text fontWeight="600">{count(u.row_count)} rows</Text>
          <Text fontSize="xs" color="gray.500" noOfLines={1} title={u.file_name || ""}>
            {u.source === "RETAILPILOT" ? "Pulled from RetailPilot" : u.file_name || "—"}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {u.uploaded_by_name ? `${u.uploaded_by_name} · ` : ""}
            {timeText(u.uploaded_at)}
          </Text>
        </Box>
      ) : (
        <Text fontSize="sm" color="gray.400" minH="54px">
          Not uploaded yet
        </Text>
      )}
      {canUpload ? (
        <Flex gap={2} mt={2}>
          <Button size="sm" colorScheme={slot.color} variant={u ? "outline" : "solid"} onClick={onPick} isLoading={busy} loadingText="Uploading" leftIcon={<i className="fa-solid fa-upload" />}>
            {u ? "Replace" : "Upload"}
          </Button>
          {u ? (
            <Tooltip label="Remove this upload and its rows" hasArrow>
              <Button size="sm" variant="ghost" colorScheme="red" onClick={onRemove} isDisabled={busy} aria-label={`Remove ${slot.label}`}>
                <i className="fa-solid fa-trash" />
              </Button>
            </Tooltip>
          ) : null}
        </Flex>
      ) : null}
    </Box>
  );
}

export default function DailyUploadsView() {
  const canUpload = usePermissions(["upload_wh_daily_reports"]);
  const canAnalyse = usePermissions(["view_wh_daily_reports"]);
  const [date, setDate] = useState(yesterdayIso());
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [busy, setBusy] = useState({});
  const [batching, setBatching] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [pullRange, setPullRange] = useState(null);
  const slotInput = useRef(null);
  const slotFor = useRef(null);
  const multiInput = useRef(null);

  const historyFrom = useMemo(() => addDays(date, -(HISTORY_DAYS - 1)), [date]);
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return WhDailyReportsHelper.status({ from: historyFrom, to: date })
      .then((res) => setState({ loading: false, error: null, data: res.data }))
      .catch((err) => setState({ loading: false, error: errMsg(err, "Could not load uploads"), data: null }));
  }, [historyFrom, date]);

  useEffect(() => {
    load();
  }, [load]);

  const uploads = useMemo(() => (state.data && state.data.uploads) || [], [state.data]);
  const today = (state.data && state.data.today) || null;
  const slots = slotsFor(date, uploads);
  const done = slots.filter((s) => s.upload).length;
  const grid = useMemo(() => uploadGrid(historyFrom, date, uploads), [historyFrom, date, uploads]);

  /**
   * Upload one file as `type` for `forDate`. Answers { ok, msg }. `quiet`
   * (a batch) shows no message of its own and never asks about the date.
   */
  const uploadOne = async (file, type, forDate, { quiet = false } = {}) => {
    setBusy((b) => ({ ...b, [type]: true }));
    try {
      const { headers, rows } = await readFile(file);
      const body = { report_type: type, report_date: forDate, file_name: file.name, headers, rows };
      let res;
      try {
        res = await WhDailyReportsHelper.upload(body);
      } catch (err) {
        const data = err.response && err.response.data;
        if (err.response && err.response.status === 409 && !quiet) {
          const ok = window.confirm(`${data.msg}\n\nUpload it for ${dayText(forDate)} anyway?`);
          if (!ok) return { ok: false, msg: "Not uploaded" };
          res = await WhDailyReportsHelper.upload({ ...body, allow_date_mismatch: true });
        } else {
          const more = data && Array.isArray(data.errors) && data.errors.length > 1 ? `\n${data.errors.slice(1, 5).join("\n")}` : "";
          throw new Error(`${(data && data.msg) || err.message}${more}`);
        }
      }
      const d = res.data;
      if (!quiet) toast.success(`${LABEL[type]} ${d.replaced ? "replaced" : "uploaded"}: ${summaryText(type, d.summary, d.report_date)}`, { duration: 6000 });
      return { ok: true };
    } catch (err) {
      const msg = errMsg(err, "Upload failed");
      if (!quiet) toast.error(`${LABEL[type]}: ${msg}`, { duration: 8000 });
      return { ok: false, msg };
    } finally {
      setBusy((b) => ({ ...b, [type]: false }));
    }
  };

  const onSlotFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || !slotFor.current) return;
    await uploadOne(file, slotFor.current, date);
    load();
  };

  /**
   * Several files at once - one day's five, or a whole month's: each goes to
   * the report and the date its name says (Picking_Report_2026-11-03_ALL.csv).
   */
  const onManyFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const plan = planUploads(files.map((f) => f.name), date);
    if (plan.unknown.length) {
      toast.error(`Could not tell which report ${plan.unknown.map((n) => `"${n}"`).join(", ")} is. Use the Upload button on its card.`, { duration: 8000 });
    }
    if (plan.duplicates.length) {
      toast.error(`Skipped ${plan.duplicates.length} duplicate file(s) for a report and day already chosen: ${plan.duplicates.slice(0, 5).join(", ")}`, { duration: 8000 });
    }
    if (!plan.items.length) return;
    const first = plan.dates[0];
    const last = plan.dates[plan.dates.length - 1];
    const batch = plan.items.length >= BATCH_FROM || plan.dates.length > 1;

    if (!batch) {
      // One day's files: each with its own message, and the day switched to if it is not the one shown.
      if (first !== date && !window.confirm(`These files are for ${dayText(first)}, but ${dayText(date)} is selected.\n\nUpload them for ${dayText(first)}?`)) return;
      for (const it of plan.items) {
        // One at a time: one transaction at a time, and at most one confirm dialog open.
        // eslint-disable-next-line no-await-in-loop
        await uploadOne(files[it.index], it.type, it.date);
      }
      if (first !== date) setDate(first);
      else load();
      return;
    }

    const span = plan.dates.length === 1 ? dayText(first) : `${plan.dates.length} days, ${dayText(first)} to ${dayText(last)}`;
    if (!window.confirm(`Upload ${plan.items.length} files for ${span}?\n\nA report already uploaded for a day is replaced.`)) return;
    setBatching(true);
    const progress = toast.loading(`Uploading 0 of ${plan.items.length}…`);
    const failed = [];
    let done = 0;
    for (const it of plan.items) {
      toast.loading(`Uploading ${done + 1} of ${plan.items.length} - ${LABEL[it.type]}, ${dayText(it.date)}`, { id: progress });
      // eslint-disable-next-line no-await-in-loop
      const r = await uploadOne(files[it.index], it.type, it.date, { quiet: true });
      if (!r.ok) failed.push(`${it.name}: ${r.msg}`);
      done += 1;
    }
    setBatching(false);
    const ok = plan.items.length - failed.length;
    if (failed.length) {
      toast.error(`${ok} of ${plan.items.length} uploaded. Not uploaded:\n${failed.slice(0, 6).join("\n")}${failed.length > 6 ? `\n…and ${failed.length - 6} more` : ""}`, { id: progress, duration: 20000 });
    } else {
      toast.success(`All ${ok} files uploaded for ${span}.`, { id: progress, duration: 8000 });
    }
    if (last !== date) setDate(last);
    else load();
  };

  /** Pull from..to from RetailPilot, one day per request (a month in one request could outlast the web server's timeout). */
  const pull = async (range) => {
    if (!range || !range.from || !range.to) return;
    const from = range.from <= range.to ? range.from : range.to;
    const to = range.from <= range.to ? range.to : range.from;
    const days = [];
    for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);
    if (days.length > 31) {
      toast.error("Pull at most 31 days at a time");
      return;
    }
    setPullRange(null);
    setPulling(true);
    const progress = toast.loading(`Pulling ${dayText(from)} from RetailPilot…`);
    const failed = [];
    let writeOff = 0;
    let verification = 0;
    for (const [i, d] of days.entries()) {
      toast.loading(`Pulling ${i + 1} of ${days.length} - ${dayText(d)}`, { id: progress });
      try {
        // eslint-disable-next-line no-await-in-loop
        const res = await WhDailyReportsHelper.pull({ from: d, to: d });
        if (!res || res.code !== 200) throw new Error((res && res.msg) || "Pull failed");
        for (const day of res.data.days) {
          for (const r of day.reports) {
            if (!r.ok) failed.push(`${dayText(day.date)} ${LABEL[r.type]}: ${r.msg}`);
            else if (r.type === "PICKING") writeOff += (r.summary.write_off_page && r.summary.write_off_page.added) || 0;
            else if (r.type === "VERIFICATION") verification += (r.summary.verification_page && r.summary.verification_page.added) || 0;
          }
        }
      } catch (err) {
        failed.push(`${dayText(d)}: ${errMsg(err, "Pull failed")}`);
      }
    }
    setPulling(false);
    const span = days.length === 1 ? dayText(from) : `${days.length} days, ${dayText(from)} to ${dayText(to)}`;
    const added = `${writeOff} new Write Off line(s), ${verification} new Verification line(s)`;
    if (failed.length) {
      toast.error(`Pulled ${span} with problems:\n${failed.slice(0, 6).join("\n")}${failed.length > 6 ? `\n…and ${failed.length - 6} more` : ""}\n${added}`, { id: progress, duration: 20000 });
    } else {
      toast.success(`Pulled ${span} from RetailPilot. ${added}.`, { id: progress, duration: 8000 });
    }
    if (to !== date) setDate(to);
    else load();
  };

  const remove = async (slot) => {
    if (!window.confirm(`Remove the ${slot.label} report for ${dayText(date)}? Its ${count(slot.upload.row_count)} rows are deleted.`)) return;
    setBusy((b) => ({ ...b, [slot.key]: true }));
    try {
      await WhDailyReportsHelper.remove(slot.upload.upload_id);
      toast.success(`${slot.label} removed`);
    } catch (err) {
      toast.error(errMsg(err, "Could not remove"));
    } finally {
      setBusy((b) => ({ ...b, [slot.key]: false }));
      load();
    }
  };

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={3}>
        <Box>
          <Text as="h1" fontSize="xl" fontWeight="700" color="gray.800">
            Daily Warehouse Reports
          </Text>
          <Text fontSize="sm" color="gray.500">
            The five reports come from RetailPilot every night at 11:30 pm. Pull a day again any time, or upload the Excel exports if RetailPilot is down - either replaces that day&apos;s report.
          </Text>
        </Box>
        <Flex gap={2} wrap="wrap" align="center">
          <Input type="date" size="sm" w="auto" value={date} max={today || undefined} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Report date" bg="white" />
          {canUpload ? (
            <Popover placement="bottom-end" isOpen={Boolean(pullRange)} onClose={() => setPullRange(null)}>
              <PopoverTrigger>
                <Button size="sm" colorScheme="blue" isLoading={pulling} loadingText="Pulling…" onClick={() => setPullRange({ from: date, to: date })} leftIcon={<i className="fa-solid fa-cloud-arrow-down" />}>
                  Pull from RetailPilot
                </Button>
              </PopoverTrigger>
              <PopoverContent w="300px">
                <PopoverArrow />
                <PopoverBody>
                  <Text fontSize="sm" fontWeight="600" mb={2}>
                    Pull the five reports from RetailPilot
                  </Text>
                  <Flex gap={2} align="center" mb={2}>
                    <Input type="date" size="sm" value={(pullRange && pullRange.from) || ""} max={today || undefined} onChange={(e) => e.target.value && setPullRange((r) => ({ ...r, from: e.target.value }))} aria-label="Pull from" />
                    <Text fontSize="sm">to</Text>
                    <Input type="date" size="sm" value={(pullRange && pullRange.to) || ""} max={today || undefined} onChange={(e) => e.target.value && setPullRange((r) => ({ ...r, to: e.target.value }))} aria-label="Pull to" />
                  </Flex>
                  <Text fontSize="xs" color="gray.500" mb={2}>
                    Replaces those days&apos; reports. Remarks on the Write Off and Verification pages are kept.
                  </Text>
                  <Button size="sm" colorScheme="blue" w="100%" onClick={() => pull(pullRange)}>
                    Pull
                  </Button>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          ) : null}
          {canUpload ? (
            <Tooltip label="Choose many files at once - a day's five, or a whole month's. Each goes to the report and date its file name says (Picking_Report_2026-11-03_ALL.csv)." hasArrow>
              <Button size="sm" colorScheme="teal" isLoading={batching} loadingText="Uploading…" onClick={() => multiInput.current && multiInput.current.click()} leftIcon={<i className="fa-solid fa-file-arrow-up" />}>
                Upload files
              </Button>
            </Tooltip>
          ) : null}
          {canAnalyse ? (
            <Link href={`/warehouse-reports/analysis?from=${date}&to=${date}`} passHref>
              <Button as="a" size="sm" variant="outline" colorScheme="teal" leftIcon={<i className="fa-solid fa-chart-column" />}>
                Analyse this day
              </Button>
            </Link>
          ) : null}
        </Flex>
      </Flex>

      {/* No `accept` filter: Android labels CSV downloads with types that filter does not list and greys them out.
          Any file can be picked; its columns are checked before anything is saved. */}
      <input ref={slotInput} type="file" style={{ display: "none" }} onChange={onSlotFile} />
      <input ref={multiInput} type="file" multiple style={{ display: "none" }} onChange={onManyFiles} />

      {state.error ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription fontSize="sm">{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <Flex align="center" gap={3}>
        <Text fontWeight="600" color="gray.700">
          {dayText(date)}
        </Text>
        <Badge colorScheme={done === REPORTS.length ? "green" : done ? "orange" : "red"} fontSize="sm" px={2}>
          {done} of {REPORTS.length} uploaded
        </Badge>
        {state.loading ? <Spinner size="sm" color="teal.500" /> : null}
      </Flex>

      <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} spacing={3}>
        {slots.map((slot) => (
          <Slot
            key={slot.key}
            slot={slot}
            canUpload={canUpload}
            busy={Boolean(busy[slot.key])}
            onPick={() => {
              slotFor.current = slot.key;
              if (slotInput.current) slotInput.current.click();
            }}
            onRemove={() => remove(slot)}
          />
        ))}
      </SimpleGrid>

      <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" overflowX="auto">
        <Text fontWeight="600" color="gray.700" px={4} pt={3}>
          Last {HISTORY_DAYS} days
        </Text>
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Date</Th>
              {REPORTS.map((r) => (
                <Th key={r.key} textAlign="center">
                  {r.label}
                </Th>
              ))}
              <Th textAlign="center">Done</Th>
            </Tr>
          </Thead>
          <Tbody>
            {grid.map((d) => (
              <Tr key={d.date} bg={d.date === date ? "teal.50" : undefined} cursor="pointer" _hover={{ bg: "gray.50" }} onClick={() => setDate(d.date)}>
                <Td fontWeight={d.date === date ? "700" : "400"}>{dayText(d.date)}</Td>
                {d.slots.map((s) => (
                  <Td key={s.key} textAlign="center" color={s.upload ? "green.500" : "gray.300"}>
                    {s.upload ? (
                      <Tooltip label={`${count(s.upload.row_count)} rows${s.upload.uploaded_by_name ? ` · ${s.upload.uploaded_by_name}` : ""} · ${timeText(s.upload.uploaded_at)}`} hasArrow>
                        <span>
                          <i className="fa-solid fa-circle-check" />
                        </span>
                      </Tooltip>
                    ) : (
                      "—"
                    )}
                  </Td>
                ))}
                <Td textAlign="center">
                  <Badge colorScheme={d.done === REPORTS.length ? "green" : d.done ? "orange" : "gray"}>
                    {d.done}/{REPORTS.length}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    </Flex>
  );
}
