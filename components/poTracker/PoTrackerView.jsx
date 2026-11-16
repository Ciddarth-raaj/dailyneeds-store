import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Flex,
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
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import PoTrackerHelper from "../../helper/poTracker";
import { SORTS, STAGES, daysFrom, excelRow, filterOrders, options, sortOrders, splitByStage, totals } from "../../util/poTracker";
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

/** Expected delivery: the date, and how late it is if it has passed. */
function Expected({ o, today }) {
  const d = daysFrom(o.expected_delivery_date, today);
  const late = d !== null && d < 0 && o.status !== "FULFILLED";
  return (
    <Box>
      <Text>{dayText(o.expected_delivery_date)}</Text>
      {late ? (
        <Text fontSize="xs" color="orange.600">
          {-d} day{d === -1 ? "" : "s"} late
        </Text>
      ) : null}
    </Box>
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
  const [stageKey, setStageKey] = useState("awaiting");
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
  const today = todayIso();
  const opts = useMemo(() => options(all), [all]);
  const stages = useMemo(() => splitByStage(filterOrders(all, { store, raisedBy, search })), [all, store, raisedBy, search]);
  const visibleStages = STAGES.filter((s) => s.key !== "other" || stages.other.length);
  const stage = STAGES.find((s) => s.key === stageKey) || STAGES[0];
  const rows = useMemo(() => sortOrders(stages[stage.key], sort), [stages, stage.key, sort]);
  const filtered = Boolean(store || raisedBy || search.trim());

  const stamp = () => new Date().toISOString().slice(0, 10);
  const download = (st) => exportToExcel([sortOrders(stages[st.key], sort).map(excelRow)], [st.label], `PO Tracker - ${st.label} - ${stamp()}.xlsx`);
  const downloadAll = () =>
    exportToExcel(
      visibleStages.map((st) => sortOrders(stages[st.key], sort).map(excelRow)),
      visibleStages.map((st) => st.label),
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
          <SimpleGrid columns={{ base: 2, md: visibleStages.length }} spacing={3}>
            {visibleStages.map((st) => (
              <StageCard key={st.key} stage={st} list={stages[st.key]} active={st.key === stage.key} onSelect={() => setStageKey(st.key)} onDownload={() => download(st)} />
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
                No POs in {stage.label.toLowerCase()}
                {filtered ? " for these filters" : ""}.
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
                    <Th>Received</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((o) => (
                    <Tr key={o.po_slug} _hover={{ bg: "gray.50" }}>
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
                      <Td>
                        <Received o={o} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </Box>
        </>
      ) : null}
    </Flex>
  );
}
