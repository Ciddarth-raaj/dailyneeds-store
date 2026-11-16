import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
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
  Tr,
} from "@chakra-ui/react";
import PoTrackerHelper from "../../helper/poTracker";
import { STATUSES, filterOrders, groupBySupplier, options, statusText, summarize } from "../../util/poTracker";
import { compactINR } from "../../util/payrollDashboard";

const STATUS_COLOR = { APPROVED: "blue", PARTIALLY_FULFILLED: "orange", FULFILLED: "green", DRAFT: "gray", CLOSED: "gray" };
const qty = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 3 }));
const rupees = (n) => (n === null || n === undefined ? "—" : `₹${Math.round(Number(n)).toLocaleString("en-IN")}`);
const dayText = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—");

function Tile({ label, value, sub, accent = "gray.300" }) {
  return (
    <Box px={4} py={3} bg="white" borderWidth="1px" borderColor="gray.200" borderLeftWidth="4px" borderLeftColor={accent} borderRadius="md">
      <Text fontSize="xs" color="gray.600" fontWeight="600">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="700" color="gray.800" lineHeight="short">
        {value}
      </Text>
      {sub ? (
        <Text fontSize="xs" color="gray.600">
          {sub}
        </Text>
      ) : null}
    </Box>
  );
}

function Fill({ pct, label }) {
  if (pct === null || pct === undefined) return <Text color="gray.400">—</Text>;
  const color = pct >= 90 ? "green" : pct >= 60 ? "orange" : "red";
  return (
    <Box minW="90px">
      <Text fontSize="xs" color="gray.700">
        {label} {pct}%
      </Text>
      <Progress value={pct} size="xs" colorScheme={color} borderRadius="sm" />
    </Box>
  );
}

/** Validity cell: the date, and how long ago it lapsed when the PO is expired. */
function Validity({ o }) {
  return (
    <Box>
      <Text>{dayText(o.validity_date)}</Text>
      {o.expired ? (
        <Badge colorScheme="red" fontSize="9px">
          Expired {o.days_past_validity}d ago
        </Badge>
      ) : null}
    </Box>
  );
}

/**
 * PO TRACKER - for buyers to follow their purchase orders, live from
 * RetailPilot. Shows the latest PO day per store and supplier, grouped by
 * supplier: what is still pending, how much of a part-filled PO has come
 * in, and which ones have lapsed past validity while still open.
 */
export default function PoTrackerView() {
  const [status, setStatus] = useState("open");
  const [store, setStore] = useState("");
  const [raisedBy, setRaisedBy] = useState("");
  const [search, setSearch] = useState("");
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
  const opts = useMemo(() => options(all), [all]);
  const rows = useMemo(() => filterOrders(all, { status, store, raisedBy, search }), [all, status, store, raisedBy, search]);
  const groups = useMemo(() => groupBySupplier(rows), [rows]);
  const sum = summarize(rows);

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="space-between" align="flex-end" wrap="wrap" gap={3}>
        <Box>
          <Text as="h1" fontSize="lg" fontWeight="600" color="purple.700">
            PO Tracker
          </Text>
          <Text fontSize="xs" color="gray.500">
            Latest POs per store and supplier · live from RetailPilot
            {data && data.fetched_at ? ` · fetched ${new Date(data.fetched_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </Text>
        </Box>
        <Flex gap={3} wrap="wrap" align="flex-end">
          <FormControl w="auto" minW="200px">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              Search
            </FormLabel>
            <Input size="sm" placeholder="Supplier or PO ref" value={search} onChange={(e) => setSearch(e.target.value)} />
          </FormControl>
          <FormControl w="auto">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              Status
            </FormLabel>
            <Select size="sm" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              {STATUSES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl w="auto" minW="150px">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              Store
            </FormLabel>
            <Select size="sm" value={store} onChange={(e) => setStore(e.target.value)} aria-label="Store">
              <option value="">All stores</option>
              {opts.stores.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl w="auto" minW="150px">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              Raised by
            </FormLabel>
            <Select size="sm" value={raisedBy} onChange={(e) => setRaisedBy(e.target.value)} aria-label="Raised by">
              <option value="">Everyone</option>
              {opts.raisedBy.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </FormControl>
          <Button size="sm" colorScheme="purple" variant="outline" onClick={() => load(true)} isLoading={state.loading}>
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
          <Spinner size="lg" color="purple.500" thickness="3px" />
        </Flex>
      ) : null}

      {data ? (
        <>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
            <Tile label="Purchase orders" value={sum.count} sub={`${sum.suppliers} suppliers · ${compactINR(sum.net_amount)}`} accent="purple.400" />
            <Tile label="Pending value" value={compactINR(sum.pending_value)} sub={`${qty(sum.open_lines)} open lines`} accent="blue.400" />
            <Tile
              label="Partly fulfilled"
              value={sum.partly.count}
              sub={sum.partly.avg_value_fill === null ? "None" : `Avg value fill ${sum.partly.avg_value_fill}%`}
              accent="orange.400"
            />
            <Tile label="Expired, still open" value={sum.expired.count} sub={sum.expired.count ? `${compactINR(sum.expired.pending_value)} pending` : "None"} accent="red.400" />
          </SimpleGrid>

          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" overflowX="auto">
            {!rows.length ? (
              <Text fontSize="sm" color="gray.500" p={4}>
                No purchase orders match these filters.
              </Text>
            ) : (
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>PO</Th>
                    <Th>Store</Th>
                    <Th>Status</Th>
                    <Th>PO date / Expected</Th>
                    <Th>Valid till</Th>
                    <Th isNumeric>PO value</Th>
                    <Th isNumeric>Open lines</Th>
                    <Th isNumeric>Pending</Th>
                    <Th>Fill</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {groups.map((g) => (
                    <React.Fragment key={g.supplier}>
                      <Tr bg="purple.50">
                        <Td colSpan={9} py={2}>
                          <Flex justify="space-between" gap={3}>
                            <Text fontWeight="700" color="purple.800">
                              {g.supplier}
                            </Text>
                            <Text fontSize="xs" color="gray.600">
                              {g.orders.length} PO{g.orders.length === 1 ? "" : "s"} · {rupees(g.pending_value)} pending
                            </Text>
                          </Flex>
                        </Td>
                      </Tr>
                      {g.orders.map((o) => (
                        <Tr key={o.po_slug} bg={o.expired ? "red.50" : undefined}>
                          <Td>
                            <Text fontWeight="600" whiteSpace="nowrap">
                              {o.po_ref}
                            </Text>
                            <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
                              by {o.raised_by || "—"}
                            </Text>
                            {o.older_pos_ignored ? (
                              <Text fontSize="10px" color="gray.500" whiteSpace="nowrap">
                                +{o.older_pos_ignored} older PO{o.older_pos_ignored === 1 ? "" : "s"} not shown
                              </Text>
                            ) : null}
                          </Td>
                          <Td>{o.store}</Td>
                          <Td>
                            <Badge colorScheme={STATUS_COLOR[o.status] || "gray"} fontSize="9px">
                              {statusText(o.status)}
                            </Badge>
                            {o.fulfillment_status && o.fulfillment_status !== o.status ? (
                              <Text fontSize="10px" color="gray.500">
                                {statusText(o.fulfillment_status)}
                              </Text>
                            ) : null}
                          </Td>
                          <Td whiteSpace="nowrap">
                            <Text>{dayText(o.po_date)}</Text>
                            <Text fontSize="xs" color="gray.500">
                              exp. {dayText(o.expected_delivery_date)}
                            </Text>
                          </Td>
                          <Td whiteSpace="nowrap">
                            <Validity o={o} />
                          </Td>
                          <Td isNumeric whiteSpace="nowrap">
                            {rupees(o.net_amount)}
                          </Td>
                          <Td isNumeric whiteSpace="nowrap">
                            {qty(o.open_lines)} / {qty(o.lines)}
                          </Td>
                          <Td isNumeric whiteSpace="nowrap">
                            <Text>{rupees(o.pending_value)}</Text>
                            <Text fontSize="10px" color="gray.500">
                              {qty(o.pending_qty)} units
                            </Text>
                          </Td>
                          <Td>
                            {o.status === "PARTIALLY_FULFILLED" ? (
                              <Flex direction="column" gap={1}>
                                <Fill pct={o.qty_fill_pct} label="Qty" />
                                <Fill pct={o.value_fill_pct} label="Value" />
                              </Flex>
                            ) : (
                              <Text color="gray.400">—</Text>
                            )}
                          </Td>
                        </Tr>
                      ))}
                    </React.Fragment>
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
