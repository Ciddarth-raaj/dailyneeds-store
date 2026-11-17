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
import { LABEL, REPORTS, addDays, dateFromFileName, slotsFor, toPayload, typeFromFileName, uploadGrid, yesterdayIso } from "../../util/whDailyReports";

const HISTORY_DAYS = 14;
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
  const v = s.verification_page;
  if (v) {
    const where = `Pick & Pack → Verification${date ? ` (${dayText(date)})` : ""}`;
    if (!s.short_lines) {
      parts.push(`No write-off in this Verification report - nothing added to ${where}`);
    } else {
      const page = [v.added ? `${v.added} added` : null, v.updated ? `${v.updated} updated` : null, v.unchanged ? `${v.unchanged} already there` : null, v.kept_verified ? `${v.kept_verified} already verified, left as is` : null]
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
          <Badge colorScheme="green" variant="subtle">
            <i className="fa-solid fa-check" /> Uploaded
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
            {u.file_name || "—"}
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
  const [date, setDate] = useState(yesterdayIso());
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [busy, setBusy] = useState({});
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

  /** Upload one file as `type` for `forDate`. Answers true when saved. */
  const uploadOne = async (file, type, forDate) => {
    setBusy((b) => ({ ...b, [type]: true }));
    try {
      const { headers, rows } = await readFile(file);
      const body = { report_type: type, report_date: forDate, file_name: file.name, headers, rows };
      let res;
      try {
        res = await WhDailyReportsHelper.upload(body);
      } catch (err) {
        const data = err.response && err.response.data;
        if (err.response && err.response.status === 409) {
          const ok = window.confirm(`${data.msg}\n\nUpload it for ${dayText(forDate)} anyway?`);
          if (!ok) return false;
          res = await WhDailyReportsHelper.upload({ ...body, allow_date_mismatch: true });
        } else {
          const more = data && Array.isArray(data.errors) && data.errors.length > 1 ? `\n${data.errors.slice(1, 5).join("\n")}` : "";
          throw new Error(`${(data && data.msg) || err.message}${more}`);
        }
      }
      const d = res.data;
      toast.success(`${LABEL[type]} ${d.replaced ? "replaced" : "uploaded"}: ${summaryText(type, d.summary, d.report_date)}`, { duration: 6000 });
      return true;
    } catch (err) {
      toast.error(`${LABEL[type]}: ${errMsg(err, "Upload failed")}`, { duration: 8000 });
      return false;
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

  /** Several files at once: each goes to the report its name says. */
  const onManyFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const unknown = files.filter((f) => !typeFromFileName(f.name));
    if (unknown.length) {
      toast.error(`Could not tell which report ${unknown.map((f) => `"${f.name}"`).join(", ")} is. Use the Upload button on its card.`, { duration: 8000 });
    }
    const known = files.filter((f) => typeFromFileName(f.name));
    const dates = [...new Set(known.map((f) => dateFromFileName(f.name)).filter(Boolean))];
    // Files all dated one day (as RetailPilot names them) go to that day.
    let target = date;
    if (dates.length === 1 && dates[0] !== date) {
      if (!window.confirm(`These files are for ${dayText(dates[0])}, but ${dayText(date)} is selected.\n\nUpload them for ${dayText(dates[0])}?`)) return;
      target = dates[0];
    }
    for (const f of known) {
      // One at a time: one transaction at a time, and at most one confirm dialog open.
      // eslint-disable-next-line no-await-in-loop
      await uploadOne(f, typeFromFileName(f.name), target);
    }
    if (target !== date) setDate(target);
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
            Upload the five RetailPilot exports for the day - CSV or Excel, as downloaded. Uploading a report again replaces it.
          </Text>
        </Box>
        <Flex gap={2} wrap="wrap" align="center">
          <Input type="date" size="sm" w="auto" value={date} max={today || undefined} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Report date" bg="white" />
          {canUpload ? (
            <Tooltip label="Choose all five files at once - each goes to the report its file name says (Picking_Report_..., Loading_Report_...)" hasArrow>
              <Button size="sm" colorScheme="teal" onClick={() => multiInput.current && multiInput.current.click()} leftIcon={<i className="fa-solid fa-file-arrow-up" />}>
                Upload files
              </Button>
            </Tooltip>
          ) : null}
          <Link href={`/warehouse-reports/analysis?from=${date}&to=${date}`} passHref>
            <Button as="a" size="sm" variant="outline" colorScheme="teal" leftIcon={<i className="fa-solid fa-chart-column" />}>
              Analyse this day
            </Button>
          </Link>
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
