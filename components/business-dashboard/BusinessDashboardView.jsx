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
  Select,
  SimpleGrid,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Tfoot,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import BusinessDashboardHelper from "../../helper/businessDashboard";
import { PRESETS, aggregate, ageText, openGatePasses, presetRange, shortDay } from "../../util/businessDashboard";
import { compactINR, formatINR } from "../../util/payrollDashboard";

// Categorical slots 1 and 2 (validated together: CVD and normal-vision separation pass).
const SALES_COLOR = "#2a78d6";
const PURCHASE_COLOR = "#eb6834";

const pctText = (v) => (v === null || v === undefined ? "—" : `${v}%`);
const fetchedText = (iso) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : null);

function KpiCard({ label, value, sub, help, accent = "#1B2A5B", unavailable }) {
  return (
    <Tooltip label={help} hasArrow openDelay={300} isDisabled={!help}>
      <Box
        px={4}
        py={3}
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderLeftWidth="4px"
        borderLeftColor={unavailable ? "gray.300" : accent}
        borderRadius="md"
      >
        <Text fontSize="xs" color="gray.600" fontWeight="600">
          {label}
        </Text>
        {unavailable ? (
          <Text fontSize="sm" color="gray.500" mt={1}>
            {unavailable}
          </Text>
        ) : (
          <>
            <Text fontSize="2xl" fontWeight="700" color="gray.800" lineHeight="short" isTruncated>
              {compactINR(value)}
            </Text>
            <Text fontSize="xs" color="gray.600" noOfLines={2}>
              {sub || formatINR(value)}
            </Text>
          </>
        )}
      </Box>
    </Tooltip>
  );
}

const timeText = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

/** Open gate passes - every vehicle in through the gate and not yet out, oldest first. */
function GatePassPanel({ section, passes, storeName }) {
  const waiting = passes.filter((p) => !p.unloading).length;
  const overDay = passes.filter((p) => (p.open_hours || 0) >= 24).length;
  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4} overflowX="auto">
      <Flex align="baseline" gap={3} wrap="wrap" mb={2}>
        <Text fontSize="sm" fontWeight="600" color="gray.700">
          Open gate passes
        </Text>
        {section && section.ok ? (
          <Text fontSize="xs" color="gray.600">
            {passes.length} open · {waiting} waiting to unload{overDay ? ` · ${overDay} open over 24h` : ""}
          </Text>
        ) : null}
      </Flex>
      {!section || !section.ok ? (
        <Text fontSize="sm" color="gray.500">
          Not available
        </Text>
      ) : !passes.length ? (
        <Text fontSize="sm" color="gray.500">
          No open gate passes.
        </Text>
      ) : (
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Gate pass</Th>
              <Th>Store</Th>
              <Th>Supplier</Th>
              <Th>Vehicle</Th>
              <Th>Driver</Th>
              <Th>In at</Th>
              <Th isNumeric>Open for</Th>
              <Th>GRN</Th>
            </Tr>
          </Thead>
          <Tbody>
            {passes.map((p) => (
              <Tr key={p.slug}>
                <Td whiteSpace="nowrap">{p.slug}</Td>
                <Td>{storeName(p.store)}</Td>
                <Td>{p.supplier_name || p.supplier_id || "—"}</Td>
                <Td whiteSpace="nowrap">{p.vehicle_number || "—"}</Td>
                <Td>
                  {p.driver_name || "—"}
                  {p.driver_phone ? (
                    <Text as="span" color="gray.500">
                      {" "}
                      · {p.driver_phone}
                    </Text>
                  ) : null}
                </Td>
                <Td whiteSpace="nowrap">{timeText(p.entry_time)}</Td>
                <Td isNumeric whiteSpace="nowrap" fontWeight={(p.open_hours || 0) >= 24 ? "700" : "400"}>
                  {ageText(p.open_hours)}
                  {(p.open_hours || 0) >= 24 ? (
                    <Badge ml={2} colorScheme="orange" fontSize="9px">
                      over 24h
                    </Badge>
                  ) : null}
                </Td>
                <Td>
                  {p.unloading ? (
                    <Badge colorScheme="blue" fontSize="9px">
                      {p.inspections.map((i) => (i.state || "started").replace(/_/g, " ").toLowerCase()).join(", ")}
                    </Badge>
                  ) : (
                    <Badge colorScheme="gray" fontSize="9px">
                      waiting
                    </Badge>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  );
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0].payload;
  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" px={3} py={2} boxShadow="md" fontSize="xs">
      <Text fontWeight="600" mb={1}>
        {shortDay(label)}
      </Text>
      <Text>Sales: {formatINR(row.sales)}</Text>
      <Text color="gray.600">Sales return: {formatINR(row.returns)}</Text>
      <Text>Purchase: {formatINR(row.purchase)}</Text>
      <Text color="gray.600">Purchase return: {formatINR(row.purchase_return)}</Text>
    </Box>
  );
}

/**
 * BUSINESS DASHBOARD - Purchase, Sales, Sales Return, Purchase Return, Stock
 * and Margin per store, live from RetailPilot. One request per date range;
 * choosing a store narrows the rows already here.
 */
export default function BusinessDashboardView() {
  const initial = useMemo(() => presetRange("this_month"), []);
  const [range, setRange] = useState(initial);
  const [preset, setPreset] = useState("this_month");
  const [store, setStore] = useState("");
  const [state, setState] = useState({ loading: true, error: null, data: null, scope: null });

  const load = useCallback(
    (refresh = false) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      BusinessDashboardHelper.getSummary({ from_date: range.from, to_date: range.to, ...(refresh ? { refresh: 1 } : {}) })
        .then((res) => {
          if (res && res.code === 200) {
            setState({ loading: false, error: null, data: res.data, scope: res.dashboard_scope || null });
          } else {
            setState({ loading: false, error: (res && (res.msg || res.message)) || "Could not load the dashboard", data: null, scope: null });
          }
        })
        .catch((err) => setState({ loading: false, error: err.message || "Could not load the dashboard", data: null, scope: null }));
    },
    [range.from, range.to]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const data = state.data;
  const stores = (data && data.stores) || [];
  useEffect(() => {
    if (store && !stores.some((s) => s.key === store)) setStore("");
  }, [stores, store]);

  const { totals, byDay, byStore } = useMemo(() => aggregate(data, store), [data, store]);
  const gatePasses = useMemo(() => openGatePasses(data, store), [data, store]);
  const storeName = (key) => (stores.find((s) => s.key === key) || {}).name || key;

  const choosePreset = (key) => {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  };
  const setDay = (which, value) => {
    setPreset("custom");
    setRange((r) => ({ ...r, [which]: value }));
  };

  const sectionErrors = data
    ? [
        ["Sales and sales returns", data.sales],
        ["Purchases", data.purchases],
        ["Stock", data.stock],
        ["Margin", data.margin],
        ["Open gate passes", data.gate_passes],
      ].filter(([, s]) => s && !s.ok)
    : [];
  const prFound = data && data.purchases && data.purchases.purchase_return_found;
  const invoiceTypes = (data && data.purchases && data.purchases.invoice_types) || [];
  const unmapped = stores.filter((s) => !s.mapped);
  const fetchedAt = data && fetchedText(data.sales.fetched_at || data.purchases.fetched_at);
  const ownStoreOnly = state.scope && !state.scope.can_choose_outlet;

  return (
    <Flex direction="column" gap={4}>
      <Flex justify="space-between" align="flex-end" wrap="wrap" gap={3}>
        <Box>
          <Text as="h1" fontSize="lg" fontWeight="600" color="purple.700">
            Business Dashboard
          </Text>
          <Text fontSize="xs" color="gray.500">
            Live from RetailPilot{fetchedAt ? ` · fetched ${fetchedAt}` : ""}
          </Text>
        </Box>
        <Flex gap={3} wrap="wrap" align="flex-end">
          <FormControl w="auto">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              Period
            </FormLabel>
            <Select size="sm" value={preset} onChange={(e) => choosePreset(e.target.value)} aria-label="Period">
              {PRESETS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
              <option value="custom">Custom</option>
            </Select>
          </FormControl>
          <FormControl w="auto">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              From
            </FormLabel>
            <Input size="sm" type="date" value={range.from} max={range.to} onChange={(e) => e.target.value && setDay("from", e.target.value)} />
          </FormControl>
          <FormControl w="auto">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              To
            </FormLabel>
            <Input size="sm" type="date" value={range.to} min={range.from} onChange={(e) => e.target.value && setDay("to", e.target.value)} />
          </FormControl>
          <FormControl w="auto" minW="180px">
            <FormLabel fontSize="xs" color="gray.600" mb={1}>
              Store
            </FormLabel>
            <Select size="sm" value={store} onChange={(e) => setStore(e.target.value)} isDisabled={ownStoreOnly || !stores.length} aria-label="Store">
              {!ownStoreOnly ? <option value="">All stores</option> : null}
              {stores.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                  {s.mapped ? "" : " (not in Branch Master)"}
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

      {sectionErrors.map(([label, s]) => (
        <Alert key={label} status="warning" borderRadius="md">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            {label} could not be read from RetailPilot: {s.error}
          </AlertDescription>
        </Alert>
      ))}

      {state.loading && !data ? (
        <Flex minH="320px" align="center" justify="center">
          <Spinner size="lg" color="purple.500" thickness="3px" />
        </Flex>
      ) : null}

      {data ? (
        <>
          <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} spacing={3}>
            <KpiCard
              label="Sales"
              value={totals.sales}
              accent={SALES_COLOR}
              sub={`${totals.bills} bills · avg ${formatINR(totals.avg_bill)}`}
              help={`Bills total, incl. tax and services: ${formatINR(totals.sales)}. Net of returns: ${formatINR(totals.net_sales)}`}
              unavailable={data.sales.ok ? null : "Not available"}
            />
            <KpiCard
              label="Sales Return (SR)"
              value={totals.returns}
              accent={SALES_COLOR}
              sub={`${totals.return_bills} returns · ${pctText(totals.return_pct)} of sales`}
              help={`Return bills: ${formatINR(totals.returns)}`}
              unavailable={data.sales.ok ? null : "Not available"}
            />
            <KpiCard
              label="Purchase"
              value={totals.purchase}
              accent={PURCHASE_COLOR}
              sub={`${totals.purchase_invoices} invoices`}
              help={`Purchase invoices entered in the period, invoice total: ${formatINR(totals.purchase)}`}
              unavailable={data.purchases.ok ? null : "Not available"}
            />
            <KpiCard
              label="Purchase Return (PR)"
              value={totals.purchase_return}
              accent={PURCHASE_COLOR}
              sub={`${totals.purchase_return_invoices} returns · ${pctText(totals.purchase_return_pct)} of purchase`}
              unavailable={!data.purchases.ok ? "Not available" : prFound ? null : "Not found in RetailPilot yet"}
              help={prFound ? null : "No purchase-return invoice type was seen in RetailPilot for this period"}
            />
            <KpiCard
              label="Stock (at cost)"
              value={totals.stock_cost}
              sub={`MRP value ${compactINR(totals.stock_mrp)}`}
              help={`Current stock, all locations, at landing cost: ${formatINR(totals.stock_cost)}. Main (sellable) location only: ${formatINR(
                totals.stock_sellable_cost
              )}. Stock is now, not for the chosen dates.`}
              unavailable={data.stock.ok ? null : "Not available"}
            />
            <KpiCard
              label="Margin"
              value={totals.margin}
              accent={SALES_COLOR}
              sub={`${pctText(totals.margin_pct)} margin${
                totals.margin_coverage_pct !== null && totals.margin_coverage_pct < 99.5 ? ` · on ${pctText(totals.margin_coverage_pct)} of sales` : ""
              }`}
              help={`Sales before tax minus cost before tax (batch basic cost × quantity), returns netted. Lines with no cost in RetailPilot are left out: ${formatINR(
                totals.uncosted_sales
              )} of sales. Margin ${formatINR(totals.margin)} on ${formatINR(totals.costed_sales)}.`}
              unavailable={data.margin && data.margin.ok ? null : "Not available"}
            />
          </SimpleGrid>

          <GatePassPanel section={data.gate_passes} passes={gatePasses} storeName={storeName} />

          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
              Daily sales and purchase
            </Text>
            {byDay.length ? (
              <Box h="280px">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={byDay} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="#edf2f7" vertical={false} />
                    <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 11, fill: "#4a5568" }} tickLine={false} axisLine={{ stroke: "#cbd5e0" }} minTickGap={16} />
                    <YAxis tickFormatter={compactINR} tick={{ fontSize: 11, fill: "#4a5568" }} tickLine={false} axisLine={false} width={64} />
                    <ChartTooltip content={<TrendTooltip />} cursor={{ stroke: "#a0aec0", strokeWidth: 1 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} iconType="plainline" />
                    <Line type="monotone" dataKey="sales" name="Sales" stroke={SALES_COLOR} strokeWidth={2} dot={byDay.length <= 1 ? { r: 4 } : false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="purchase" name="Purchase" stroke={PURCHASE_COLOR} strokeWidth={2} dot={byDay.length <= 1 ? { r: 4 } : false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Text fontSize="sm" color="gray.500">
                No days in range.
              </Text>
            )}
          </Box>

          <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4} overflowX="auto">
            <Text fontSize="sm" fontWeight="600" color="gray.700" mb={2}>
              By store
            </Text>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Store</Th>
                  <Th isNumeric>Sales</Th>
                  <Th isNumeric>SR</Th>
                  <Th isNumeric>SR %</Th>
                  <Th isNumeric>Net sales</Th>
                  <Th isNumeric>Bills</Th>
                  <Th isNumeric>Margin</Th>
                  <Th isNumeric>Margin %</Th>
                  <Th isNumeric>Purchase</Th>
                  <Th isNumeric>PR</Th>
                  <Th isNumeric>Stock (cost)</Th>
                </Tr>
              </Thead>
              <Tbody>
                {byStore.map((s) => (
                  <Tr key={s.key}>
                    <Td>
                      {s.name}{" "}
                      {!s.mapped ? (
                        <Badge colorScheme="orange" fontSize="9px">
                          not in Branch Master
                        </Badge>
                      ) : null}
                    </Td>
                    <Td isNumeric>{formatINR(s.sales)}</Td>
                    <Td isNumeric>{formatINR(s.returns)}</Td>
                    <Td isNumeric>{pctText(s.return_pct)}</Td>
                    <Td isNumeric fontWeight="600">
                      {formatINR(s.net_sales)}
                    </Td>
                    <Td isNumeric>{s.bills}</Td>
                    <Td isNumeric>{data.margin.ok ? formatINR(s.margin) : "—"}</Td>
                    <Td isNumeric>{data.margin.ok ? pctText(s.margin_pct) : "—"}</Td>
                    <Td isNumeric>{formatINR(s.purchase)}</Td>
                    <Td isNumeric>{prFound ? formatINR(s.purchase_return) : "—"}</Td>
                    <Td isNumeric>{formatINR(s.stock_cost)}</Td>
                  </Tr>
                ))}
              </Tbody>
              {byStore.length > 1 ? (
                <Tfoot>
                  <Tr>
                    <Th>Total</Th>
                    <Th isNumeric>{formatINR(totals.sales)}</Th>
                    <Th isNumeric>{formatINR(totals.returns)}</Th>
                    <Th isNumeric>{pctText(totals.return_pct)}</Th>
                    <Th isNumeric>{formatINR(totals.net_sales)}</Th>
                    <Th isNumeric>{totals.bills}</Th>
                    <Th isNumeric>{data.margin.ok ? formatINR(totals.margin) : "—"}</Th>
                    <Th isNumeric>{data.margin.ok ? pctText(totals.margin_pct) : "—"}</Th>
                    <Th isNumeric>{formatINR(totals.purchase)}</Th>
                    <Th isNumeric>{prFound ? formatINR(totals.purchase_return) : "—"}</Th>
                    <Th isNumeric>{formatINR(totals.stock_cost)}</Th>
                  </Tr>
                </Tfoot>
              ) : null}
            </Table>
            {!byStore.length ? (
              <Text fontSize="sm" color="gray.500" mt={2}>
                No stores to show.
              </Text>
            ) : null}
          </Box>

          {unmapped.length || invoiceTypes.length ? (
            <Box fontSize="xs" color="gray.600">
              {unmapped.length ? (
                <Text>
                  RetailPilot stores not matched to a branch: {unmapped.map((s) => s.name).join(", ")}. Set their RetailPilot ID in Branch Master.
                </Text>
              ) : null}
              {invoiceTypes.length ? (
                <Text>
                  RetailPilot invoice types this period:{" "}
                  {invoiceTypes
                    .map((t) => `${t.type} (${t.invoices}, ${t.counted_as === "purchase" ? "Purchase" : t.counted_as === "purchase_return" ? "PR" : "not counted"})`)
                    .join(" · ")}
                </Text>
              ) : null}
            </Box>
          ) : null}
        </>
      ) : null}
    </Flex>
  );
}
