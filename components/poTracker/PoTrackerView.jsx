import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  Progress,
  Select,
  SimpleGrid,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import PoTrackerHelper from "../../helper/poTracker";
import toast from "react-hot-toast";
import usePermissions from "../../customHooks/usePermissions";
import { CHANNELS, FOLLOW_UP_VIEW, ago, channelText, SORTS, STAGES, daysFrom, excelRow, filterOrders, options, sortOrders, splitByStage, totals } from "../../util/poTracker";
import { exportToExcel } from "../../util/exportCSVFile";

const qty = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 3 }));
const rupees = (n) => (n === null || n === undefined ? "—" : `₹${Math.round(Number(n)).toLocaleString("en-IN")}`);
const lakhs = (n) => {
  const v = Number(n) || 0;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)} L`;
  return rupees(v);
};
const dayText = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—");
const pad = (n) => String(n).padStart(2, "0");
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const relative = (days) => (days === 0 ? "today" : days > 0 ? `in ${days} day${days === 1 ? "" : "s"}` : `${-days} day${days === -1 ? "" : "s"} ago`);

/** A stage tab: what it means, how many, how much is pending, and its download. */
function StageCard({ stage, list, active, onSelect, onDownload }) {
  const t = totals(list);
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      cursor="pointer"
      bg={active ? `${stage.color}.50` : "white"}
      borderWidth="2px"
      borderColor={active ? `${stage.color}.400` : "gray.200"}
      borderRadius="lg"
      px={4}
      py={3}
      _hover={{ borderColor: `${stage.color}.300` }}
      transition="border-color 0.15s"
    >
      <Flex justify="space-between" align="center" gap={2}>
        <Text fontSize="sm" fontWeight="700" color={`${stage.color}.700`}>
          {stage.label}
        </Text>
        <Tooltip label={`Download ${stage.label} as Excel`} hasArrow>
          <Button
            size="xs"
            variant="ghost"
            colorScheme={stage.color}
            isDisabled={!list.length}
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
            aria-label={`Download ${stage.label} as Excel`}
          >
            <i className="fa-solid fa-download" />
          </Button>
        </Tooltip>
      </Flex>
      <Text fontSize="2xl" fontWeight="700" color="gray.800" lineHeight="short">
        {t.count}
      </Text>
      <Text fontSize="xs" color="gray.600">
        {t.count ? `${lakhs(t.pending_value)} pending` : "None"}
      </Text>
      <Text fontSize="10px" color="gray.500" mt={1}>
        {stage.hint}
      </Text>
    </Box>
  );
}

/** Valid till: the date, and how far that is from today. */
function Validity({ o, today }) {
  const d = daysFrom(o.validity_date, today);
  const over = d !== null && d < 0 && o.status !== "FULFILLED";
  return (
    <Box>
      <Text>{dayText(o.validity_date)}</Text>
      {d !== null && o.status !== "FULFILLED" ? (
        <Text fontSize="xs" color={over ? "red.600" : d <= 2 ? "orange.600" : "gray.500"} fontWeight={over ? "600" : "400"}>
          {over ? `ended ${relative(d)}` : `ends ${relative(d)}`}
        </Text>
      ) : null}
    </Box>
  );
}

/** Expected delivery: the date, how late it is, and the supplier's promised date next to it. */
function Expected({ o, today }) {
  const d = daysFrom(o.expected_delivery_date, today);
  const open = o.status !== "FULFILLED";
  const late = d !== null && d < 0 && open;
  const promised = o.last_followup && o.last_followup.promised_delivery_date;
  const p = promised ? daysFrom(promised, today) : null;
  return (
    <Box>
      <Text>
        {dayText(o.expected_delivery_date)}
        {late ? (
          <Text as="span" fontSize="xs" color="orange.600">
            {" "}
            · {-d}d late
          </Text>
        ) : null}
      </Text>
      {promised ? (
        <Text fontSize="xs" color={open && p < 0 ? "orange.600" : "teal.700"} fontWeight="600">
          Promised {dayText(promised)}
        </Text>
      ) : null}
    </Box>
  );
}

/** The latest follow-up on a PO, or a prompt to add one. */
function LastFollowup({ o, now }) {
  const f = o.last_followup;
  if (!f) {
    return (
      <Box>
        {o.needs_followup ? (
          <Badge colorScheme="purple" fontSize="9px" mb={1}>
            Follow-up due
          </Badge>
        ) : null}
        <Text fontSize="xs" color="teal.600" fontWeight="600">
          + Add follow-up
        </Text>
      </Box>
    );
  }
  return (
    <Box maxW="260px">
      {o.needs_followup ? (
        <Badge colorScheme="purple" fontSize="9px" mb={1}>
          Follow-up due
        </Badge>
      ) : null}
      <Text fontSize="xs" color="gray.800" noOfLines={2} title={f.remark}>
        {f.remark}
      </Text>
      <Text fontSize="10px" color="gray.500" textTransform="capitalize">
        {[f.created_by_name, channelText(f.channel), ago(f.created_at, now)].filter(Boolean).join(" · ")}
        {f.remark_count > 1 ? ` · ${f.remark_count} remarks` : ""}
      </Text>
      {f.next_follow_up_date && !o.needs_followup ? (
        <Text fontSize="10px" color="gray.500">
          Next: {dayText(f.next_follow_up_date)}
        </Text>
      ) : null}
    </Box>
  );
}

/** One remark in the history list. */
function RemarkItem({ r, now, showPo }) {
  return (
    <Box py={3} borderBottomWidth="1px" borderColor="gray.100">
      <Flex justify="space-between" gap={2} align="baseline">
        <Text fontSize="xs" fontWeight="700" color="gray.700" textTransform="capitalize">
          {r.created_by_name || "—"}
          <Text as="span" fontWeight="400" color="gray.500" textTransform="none">
            {" "}
            · {channelText(r.channel)}
            {showPo && r.po_ref ? ` · PO ${r.po_ref}` : ""}
          </Text>
        </Text>
        <Text fontSize="10px" color="gray.500" whiteSpace="nowrap" title={r.created_at ? new Date(r.created_at).toLocaleString("en-IN") : ""}>
          {r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""} · {ago(r.created_at, now)}
        </Text>
      </Flex>
      <Text fontSize="sm" color="gray.800" mt={1} whiteSpace="pre-wrap">
        {r.remark}
      </Text>
      {r.promised_delivery_date || r.next_follow_up_date ? (
        <Text fontSize="xs" color="gray.600" mt={1}>
          {[r.promised_delivery_date ? `Promised delivery ${dayText(r.promised_delivery_date)}` : null, r.next_follow_up_date ? `Next follow-up ${dayText(r.next_follow_up_date)}` : null]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      ) : null}
    </Box>
  );
}

/** Side panel for one PO: add a follow-up, see this PO's and the supplier's history. */
function FollowupDrawer({ order, today, canAdd, onClose, onSaved }) {
  const [history, setHistory] = useState({ loading: true, error: null, remarks: [], supplier: [] });
  const [form, setForm] = useState({ channel: "CALL", remark: "", promised_delivery_date: "", next_follow_up_date: "" });
  const [saving, setSaving] = useState(false);
  const slug = order && order.po_slug;
  const now = Date.now();

  const loadHistory = useCallback(() => {
    if (!slug) return;
    setHistory((h) => ({ ...h, loading: true, error: null }));
    PoTrackerHelper.followups(slug)
      .then((res) => {
        if (res && res.code === 200) setHistory({ loading: false, error: null, remarks: res.data.remarks, supplier: res.data.supplier_remarks });
        else setHistory({ loading: false, error: (res && res.msg) || "Could not load follow-ups", remarks: [], supplier: [] });
      })
      .catch((err) => setHistory({ loading: false, error: err.message || "Could not load follow-ups", remarks: [], supplier: [] }));
  }, [slug]);

  useEffect(() => {
    setForm({ channel: "CALL", remark: "", promised_delivery_date: "", next_follow_up_date: "" });
    loadHistory();
  }, [loadHistory]);

  const save = () => {
    if (!form.remark.trim()) {
      toast.error("Write what the supplier said");
      return;
    }
    setSaving(true);
    PoTrackerHelper.addFollowup(slug, {
      channel: form.channel,
      remark: form.remark.trim(),
      promised_delivery_date: form.promised_delivery_date || null,
      next_follow_up_date: form.next_follow_up_date || null,
    })
      .then((res) => {
        if (res && res.code === 200) {
          toast.success("Follow-up saved");
          setForm({ channel: form.channel, remark: "", promised_delivery_date: "", next_follow_up_date: "" });
          loadHistory();
          onSaved(res.data);
        } else toast.error((res && res.msg) || "Could not save");
      })
      .catch((err) => toast.error(err.message || "Could not save"))
      .finally(() => setSaving(false));
  };

  return (
    <Drawer isOpen={Boolean(order)} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" pr={12}>
          <Text fontSize="xs" color="gray.500" fontWeight="600">
            PO {order ? order.po_ref : ""} · {order ? order.store : ""}
          </Text>
          <Text fontSize="md" textTransform="capitalize">
            {order ? order.supplier : ""}
          </Text>
          {order ? (
            <Text fontSize="xs" color="gray.600" fontWeight="400">
              {rupees(order.pending_value)} pending · {qty(order.open_lines)} of {qty(order.lines)} lines open · PO date {dayText(order.po_date)} · expected {dayText(order.expected_delivery_date)}
              {Number(order.days_past_validity) > 0 ? ` · validity ended ${order.days_past_validity}d ago` : ""}
            </Text>
          ) : null}
        </DrawerHeader>
        <DrawerBody>
          {canAdd ? (
            <Box bg="gray.50" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3} mt={2}>
              <Text fontSize="sm" fontWeight="700" mb={2}>
                Add follow-up
              </Text>
              <FormControl mb={3}>
                <FormLabel fontSize="xs" color="gray.600" mb={1}>
                  How
                </FormLabel>
                <ButtonGroup size="sm" isAttached variant="outline">
                  {CHANNELS.map((c) => (
                    <Button
                      key={c.key}
                      colorScheme={form.channel === c.key ? "teal" : "gray"}
                      variant={form.channel === c.key ? "solid" : "outline"}
                      onClick={() => setForm((f) => ({ ...f, channel: c.key }))}
                    >
                      {c.label}
                    </Button>
                  ))}
                </ButtonGroup>
              </FormControl>
              <FormControl mb={3} isRequired>
                <FormLabel fontSize="xs" color="gray.600" mb={1}>
                  Remark
                </FormLabel>
                <Textarea
                  size="sm"
                  bg="white"
                  rows={3}
                  maxLength={1000}
                  placeholder="What did the supplier say?"
                  value={form.remark}
                  onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                />
              </FormControl>
              <SimpleGrid columns={2} spacing={3} mb={3}>
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.600" mb={1}>
                    Promised delivery (optional)
                  </FormLabel>
                  <Input size="sm" bg="white" type="date" value={form.promised_delivery_date} onChange={(e) => setForm((f) => ({ ...f, promised_delivery_date: e.target.value }))} />
                </FormControl>
                <FormControl>
                  <FormLabel fontSize="xs" color="gray.600" mb={1}>
                    Next follow-up (optional)
                  </FormLabel>
                  <Input size="sm" bg="white" type="date" min={today} value={form.next_follow_up_date} onChange={(e) => setForm((f) => ({ ...f, next_follow_up_date: e.target.value }))} />
                </FormControl>
              </SimpleGrid>
              <Text fontSize="10px" color="gray.500" mb={2}>
                With no next follow-up date, this PO comes back to Needs follow-up in 2 days. Remarks cannot be edited once saved.
              </Text>
              <Button size="sm" colorScheme="teal" onClick={save} isLoading={saving} w="100%">
                Save follow-up
              </Button>
            </Box>
          ) : (
            <Text fontSize="xs" color="gray.500" mt={2}>
              You can read follow-ups; adding them needs the Add PO Follow-up Remarks right.
            </Text>
          )}

          <Text fontSize="sm" fontWeight="700" mt={5}>
            This PO ({history.remarks.length})
          </Text>
          {history.loading ? (
            <Spinner size="sm" color="teal.500" mt={2} />
          ) : history.error ? (
            <Text fontSize="sm" color="red.600">
              {history.error}
            </Text>
          ) : !history.remarks.length ? (
            <Text fontSize="sm" color="gray.500" py={2}>
              No follow-up yet.
            </Text>
          ) : (
            history.remarks.map((r) => <RemarkItem key={r.id} r={r} now={now} />)
          )}

          {history.supplier.length ? (
            <>
              <Divider my={4} />
              <Text fontSize="sm" fontWeight="700">
                Earlier POs with this supplier
              </Text>
              {history.supplier.map((r) => (
                <RemarkItem key={r.id} r={r} now={now} showPo />
              ))}
            </>
          ) : null}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function Received({ o }) {
  if (o.status === "FULFILLED") return <Text fontSize="xs" color="green.600" fontWeight="600">100%</Text>;
  if (o.status !== "PARTIALLY_FULFILLED" || o.value_fill_pct === null || o.value_fill_pct === undefined) {
    return <Text fontSize="xs" color="gray.400">Nothing yet</Text>;
  }
  const pct = o.value_fill_pct;
  return (
    <Tooltip label={`By value ${pct}% · by quantity ${o.qty_fill_pct ?? "—"}% (${qty(o.received_qty)} of ${qty(o.ordered_qty)} units)`} hasArrow>
      <Box minW="90px">
        <Text fontSize="xs" color="gray.700" fontWeight="600">
          {pct}%
        </Text>
        <Progress value={pct} size="xs" colorScheme={pct >= 90 ? "green" : pct >= 60 ? "orange" : "red"} borderRadius="sm" />
      </Box>
    </Tooltip>
  );
}

/**
 * PO TRACKER - for buyers to follow their purchase orders, live from
 * RetailPilot: the latest PO per supplier and store. The stage cards are the
 * tabs - pick one to list its POs, or download it as Excel.
 */
export default function PoTrackerView() {
  const [stageKey, setStageKey] = useState("followup");
  const [openSlug, setOpenSlug] = useState(null);
  const canAdd = usePermissions(["add_po_followup"]);
  const [store, setStore] = useState("");
  const [raisedBy, setRaisedBy] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("supplier");
  const [state, setState] = useState({ loading: true, error: null, data: null });

  const load = useCallback((refresh) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    PoTrackerHelper.list(refresh ? { refresh: 1 } : {})
      .then((res) => {
        if (res && res.code === 200) setState({ loading: false, error: null, data: res.data });
        else setState({ loading: false, error: (res && (res.msg || res.message)) || "Could not load purchase orders", data: null });
      })
      .catch((err) => setState({ loading: false, error: (err.response && err.response.data && err.response.data.msg) || err.message || "Could not load purchase orders", data: null }));
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const data = state.data;
  const all = (data && data.orders) || [];
  const today = (data && data.today) || todayIso();
  const now = Date.now();
  const opts = useMemo(() => options(all), [all]);
  const stages = useMemo(() => splitByStage(filterOrders(all, { store, raisedBy, search })), [all, store, raisedBy, search]);
  const visibleStages = STAGES.filter((s) => s.key !== "other" || stages.other.length);
  // Needs follow-up is a view across Awaiting delivery and Expired, not a stage of its own.
  const lists = useMemo(
    () => ({ ...stages, followup: [...stages.awaiting, ...stages.expired].filter((o) => o.needs_followup) }),
    [stages]
  );
  const views = [FOLLOW_UP_VIEW, ...visibleStages];
  const stage = views.find((s) => s.key === stageKey) || views[0];
  const rows = useMemo(() => sortOrders(lists[stage.key], sort), [lists, stage.key, sort]);
  // Received is only worth a column where something can have been received.
  const showReceived = stage.key === "partly" || stage.key === "fulfilled" || stage.key === "other";
  const openOrder = all.find((o) => o.po_slug === openSlug) || null;

  // A saved remark shows at once: patch the row instead of re-reading RetailPilot.
  const onSaved = (f) =>
    setState((st) => {
      if (!st.data) return st;
      const orders = st.data.orders.map((o) => {
        if (o.po_slug !== f.po_slug) return o;
        const count = ((o.last_followup && o.last_followup.remark_count) || 0) + 1;
        const due = f.next_follow_up_date ? f.next_follow_up_date <= today : false;
        return { ...o, last_followup: { ...f, remark_count: count }, needs_followup: due };
      });
      return { ...st, data: { ...st.data, orders } };
    });
  const filtered = Boolean(store || raisedBy || search.trim());

  const stamp = () => new Date().toISOString().slice(0, 10);
  const download = (st) => exportToExcel([sortOrders(lists[st.key], sort).map(excelRow)], [st.label], `PO Tracker - ${st.label} - ${stamp()}.xlsx`);
  const downloadAll = () =>
    exportToExcel(
      views.map((st) => sortOrders(lists[st.key], sort).map(excelRow)),
      views.map((st) => st.label),
      `PO Tracker - all stages - ${stamp()}.xlsx`
    );

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="space-between" align="flex-start" wrap="wrap" gap={3}>
        <Box>
          <Text as="h1" fontSize="xl" fontWeight="700" color="gray.800">
            PO Tracker
          </Text>
          <Text fontSize="sm" color="gray.500">
            Latest purchase order for each supplier and store, from RetailPilot
            {data && data.fetched_at ? ` · updated ${new Date(data.fetched_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}` : ""}
          </Text>
        </Box>
        <Flex gap={2}>
          <Button size="sm" variant="outline" colorScheme="teal" onClick={downloadAll} isDisabled={!data} leftIcon={<i className="fa-solid fa-file-excel" />}>
            All stages
          </Button>
          <Button size="sm" colorScheme="teal" onClick={() => load(true)} isLoading={state.loading} leftIcon={<i className="fa-solid fa-rotate" />}>
            Refresh
          </Button>
        </Flex>
      </Flex>

      {state.error ? (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertDescription fontSize="sm">{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {!data && state.loading ? (
        <Flex minH="240px" align="center" justify="center">
          <Spinner size="lg" color="teal.500" thickness="3px" />
        </Flex>
      ) : null}

      {data ? (
        <>
          {data.followups_error ? (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">{data.followups_error}</AlertDescription>
            </Alert>
          ) : null}
          <SimpleGrid columns={{ base: 2, md: views.length }} spacing={3}>
            {views.map((st) => (
              <StageCard key={st.key} stage={st} list={lists[st.key]} active={st.key === stage.key} onSelect={() => setStageKey(st.key)} onDownload={() => download(st)} />
            ))}
          </SimpleGrid>

          <Flex gap={3} wrap="wrap" align="center" bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" px={3} py={2}>
            <InputGroup size="sm" w={{ base: "100%", md: "260px" }}>
              <InputLeftElement pointerEvents="none" color="gray.400">
                <i className="fa-solid fa-magnifying-glass" />
              </InputLeftElement>
              <Input placeholder="Search supplier or PO no." value={search} onChange={(e) => setSearch(e.target.value)} />
            </InputGroup>
            <Select size="sm" w="auto" value={store} onChange={(e) => setStore(e.target.value)} aria-label="Store">
              <option value="">All stores</option>
              {opts.stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
            <Select size="sm" w="auto" value={raisedBy} onChange={(e) => setRaisedBy(e.target.value)} aria-label="Raised by">
              <option value="">Raised by anyone</option>
              {opts.raisedBy.map((s) => (
                <option key={s} value={s}>
                  Raised by {s}
                </option>
              ))}
            </Select>
            {filtered ? (
              <Button size="sm" variant="link" colorScheme="gray" onClick={() => (setStore(""), setRaisedBy(""), setSearch(""))}>
                Clear filters
              </Button>
            ) : null}
            <Box flex="1" />
            <Select size="sm" w="auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  Sort: {s.label}
                </option>
              ))}
            </Select>
          </Flex>

          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" overflowX="auto">
            <Flex justify="space-between" align="center" px={4} py={3} borderBottomWidth="1px" borderColor="gray.100">
              <Text fontWeight="700" color={`${stage.color}.700`}>
                {stage.label} · {rows.length} PO{rows.length === 1 ? "" : "s"}
              </Text>
              <Button size="xs" variant="outline" colorScheme={stage.color} isDisabled={!rows.length} onClick={() => download(stage)} leftIcon={<i className="fa-solid fa-download" />}>
                Download Excel
              </Button>
            </Flex>
            {!rows.length ? (
              <Text fontSize="sm" color="gray.500" p={4}>
                {stage.key === "followup" ? "Nothing to chase right now." : `No POs in ${stage.label.toLowerCase()}`}
                {filtered ? " for these filters" : ""}
                {stage.key === "followup" ? "" : "."}
              </Text>
            ) : (
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Supplier</Th>
                    <Th>PO no.</Th>
                    <Th>Store</Th>
                    <Th>Raised by</Th>
                    <Th>PO date</Th>
                    <Th>Expected</Th>
                    <Th>Valid till</Th>
                    <Th isNumeric>PO value</Th>
                    <Th isNumeric>Pending</Th>
                    {showReceived ? <Th>Received</Th> : null}
                    <Th>Follow-up</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((o) => (
                    <Tr
                      key={o.po_slug}
                      cursor="pointer"
                      tabIndex={0}
                      onClick={() => setOpenSlug(o.po_slug)}
                      onKeyDown={(e) => e.key === "Enter" && setOpenSlug(o.po_slug)}
                      bg={o.needs_followup ? "purple.50" : undefined}
                      _hover={{ bg: o.needs_followup ? "purple.100" : "gray.50" }}
                    >
                      <Td maxW="260px">
                        <Text fontWeight="600" color="gray.800" textTransform="capitalize" noOfLines={2}>
                          {o.supplier}
                        </Text>
                      </Td>
                      <Td whiteSpace="nowrap">{o.po_ref}</Td>
                      <Td textTransform="capitalize">{o.store}</Td>
                      <Td textTransform="capitalize">{o.raised_by || "—"}</Td>
                      <Td whiteSpace="nowrap">{dayText(o.po_date)}</Td>
                      <Td whiteSpace="nowrap">
                        <Expected o={o} today={today} />
                      </Td>
                      <Td whiteSpace="nowrap">
                        <Validity o={o} today={today} />
                      </Td>
                      <Td isNumeric whiteSpace="nowrap">
                        {rupees(o.net_amount)}
                      </Td>
                      <Td isNumeric whiteSpace="nowrap">
                        <Text fontWeight="600">{rupees(o.pending_value)}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {qty(o.open_lines)} of {qty(o.lines)} lines open
                        </Text>
                      </Td>
                      {showReceived ? (
                        <Td>
                          <Received o={o} />
                        </Td>
                      ) : null}
                      <Td minW="200px" maxW="280px">
                        <LastFollowup o={o} now={now} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>
        </>
      ) : null}

      <FollowupDrawer order={openOrder} today={today} canAdd={canAdd} onClose={() => setOpenSlug(null)} onSaved={onSaved} />
    </Flex>
  );
}
