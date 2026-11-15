import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
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
import WarehouseFlowHelper from "../../helper/warehouseFlow";
import { ageText, gatePassSummary, gatePasses, stateText } from "../../util/warehouseFlow";
import { formatINR } from "../../util/payrollDashboard";

const timeText = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const qty = (n) => (n === null || n === undefined ? "—" : Number(n).toLocaleString("en-IN", { maximumFractionDigits: 3 }));

/** One stage tile. A built stage is a button that opens its list. */
function StageTile({ index, stage, summary, selected, onSelect }) {
  const built = stage.built;
  return (
    <Box
      as={built ? "button" : "div"}
      type={built ? "button" : undefined}
      onClick={built ? onSelect : undefined}
      aria-pressed={built ? selected : undefined}
      textAlign="left"
      px={3}
      py={3}
      bg={selected ? "purple.50" : "white"}
      borderWidth={selected ? "2px" : "1px"}
      borderColor={selected ? "purple.500" : "gray.200"}
      borderRadius="md"
      opacity={built ? 1 : 0.6}
      cursor={built ? "pointer" : "default"}
      _hover={built ? { boxShadow: "md" } : undefined}
      position="relative"
    >
      <Text fontSize="10px" color="gray.500" fontWeight="600" letterSpacing="wide">
        STEP {index + 1}
      </Text>
      <Text fontSize="sm" fontWeight="700" color="gray.800">
        {stage.label}
      </Text>
      {!built ? (
        <Text fontSize="xs" color="gray.500" mt={1}>
          Coming next
        </Text>
      ) : !stage.ok ? (
        <Text fontSize="xs" color="gray.500" mt={1}>
          Not available
        </Text>
      ) : (
        <>
          <Text fontSize="2xl" fontWeight="700" color="gray.800" lineHeight="short">
            {summary.count}
          </Text>
          <Text fontSize="xs" color="gray.600">
            {summary.count ? `${summary.waiting} waiting · oldest ${ageText(summary.oldest_hours)}` : "Nothing here"}
          </Text>
          {summary.over_day ? (
            <Badge mt={1} colorScheme="orange" fontSize="9px">
              {summary.over_day} over 24h
            </Badge>
          ) : null}
        </>
      )}
    </Box>
  );
}

function Field({ label, children }) {
  return (
    <Box>
      <Text fontSize="10px" color="gray.500" fontWeight="600" textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.800">
        {children || "—"}
      </Text>
    </Box>
  );
}

/** One gate pass in full: vehicle, times, and every inspection started on it. */
function GatePassDrawer({ slug, onClose }) {
  const [state, setState] = useState({ loading: true, error: null, pass: null });
  useEffect(() => {
    if (!slug) return;
    let live = true;
    setState({ loading: true, error: null, pass: null });
    WarehouseFlowHelper.getGatePass(slug)
      .then((res) => {
        if (!live) return;
        if (res && res.code === 200) setState({ loading: false, error: null, pass: res.data });
        else setState({ loading: false, error: (res && (res.msg || res.message)) || "Could not load the gate pass", pass: null });
      })
      .catch((err) => live && setState({ loading: false, error: err.message || "Could not load the gate pass", pass: null }));
    return () => {
      live = false;
    };
  }, [slug]);

  const p = state.pass;
  return (
    <Drawer isOpen={Boolean(slug)} placement="right" onClose={onClose} size="md">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          <Text fontSize="xs" color="gray.500" fontWeight="600">
            GATE PASS
          </Text>
          <Text fontSize="md">{slug}</Text>
        </DrawerHeader>
        <DrawerBody>
          {state.loading ? (
            <Flex minH="200px" align="center" justify="center">
              <Spinner color="purple.500" />
            </Flex>
          ) : state.error ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">{state.error}</AlertDescription>
            </Alert>
          ) : p ? (
            <Flex direction="column" gap={5} py={2}>
              <Flex gap={2} align="center">
                <Badge colorScheme={p.status === "OPEN" ? "purple" : "gray"}>{p.status || "—"}</Badge>
                <Text fontSize="sm" color="gray.600">
                  {p.status === "OPEN" ? `open for ${ageText(p.open_hours)}` : `was in for ${ageText(p.open_hours)}`}
                </Text>
              </Flex>
              <SimpleGrid columns={2} spacing={4}>
                <Field label="Store">{p.store_name}</Field>
                <Field label="Supplier">{p.supplier_name || p.supplier_id}</Field>
                <Field label="Vehicle">{p.vehicle_number}</Field>
                <Field label="Driver">{[p.driver_name, p.driver_phone].filter(Boolean).join(" · ")}</Field>
                <Field label="In at">{timeText(p.entry_time)}</Field>
                <Field label="Out at">{p.exit_time ? timeText(p.exit_time) : "Still inside"}</Field>
                <Field label="Created by">{p.created_by}</Field>
              </SimpleGrid>

              <Box>
                <Text fontSize="sm" fontWeight="700" color="gray.700" mb={2}>
                  Inspection
                </Text>
                {!p.inspections.length ? (
                  <Text fontSize="sm" color="gray.600">
                    Not started — the vehicle is waiting to be unloaded.
                  </Text>
                ) : (
                  <Flex direction="column" gap={3}>
                    {p.inspections.map((i) => (
                      <Box key={i.slug} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
                        <Flex justify="space-between" align="center" mb={2}>
                          <Text fontSize="sm" fontWeight="600">
                            {i.slug}
                          </Text>
                          <Badge colorScheme="blue">{stateText(i.state)}</Badge>
                        </Flex>
                        <SimpleGrid columns={2} spacing={3}>
                          <Field label="Started">{timeText(i.created_at)}</Field>
                          <Field label="Supplier invoice">{i.supplier_invoice_id}</Field>
                          <Field label="Invoice amount">{i.invoice_amount === null ? null : formatINR(i.invoice_amount)}</Field>
                          <Field label="PO">{i.po_id}</Field>
                          {i.totals ? (
                            <>
                              <Field label="Lines">{qty(i.totals.lines)}</Field>
                              <Field label="Invoice qty">{qty(i.totals.invoice_qty)}</Field>
                              <Field label="Inspected">{qty(i.totals.inspected_qty)}</Field>
                              <Field label="Free">{qty(i.totals.free_qty)}</Field>
                              <Field label="Rejected">{qty(i.totals.rejected_qty)}</Field>
                            </>
                          ) : null}
                        </SimpleGrid>
                      </Box>
                    ))}
                  </Flex>
                )}
                {p.inspection_totals_error ? (
                  <Text fontSize="xs" color="orange.600" mt={2}>
                    Line totals could not be read from RetailPilot: {p.inspection_totals_error}
                  </Text>
                ) : null}
              </Box>
            </Flex>
          ) : null}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * WAREHOUSE FLOW, on the Business Dashboard: Gate pass -> Inspection -> GRN ->
 * Allocation -> Ready to dispatch. Each built stage is a tile; clicking it
 * lists what is in it, and clicking a row opens that one in full. Follows the
 * page's store choice; `refreshTick` changing re-reads RetailPilot.
 */
export default function WarehouseFlowSection({ store = "", refreshTick = 0 }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [selected, setSelected] = useState("gate_pass");
  const [openSlug, setOpenSlug] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback((refresh) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    WarehouseFlowHelper.getFlow(refresh ? { refresh: 1 } : {})
      .then((res) => {
        setNow(Date.now());
        if (res && res.code === 200) setState({ loading: false, error: null, data: res.data });
        else setState({ loading: false, error: (res && (res.msg || res.message)) || "Could not load the warehouse flow", data: null });
      })
      .catch((err) => setState({ loading: false, error: err.message || "Could not load the warehouse flow", data: null }));
  }, []);

  useEffect(() => {
    load(refreshTick > 0);
  }, [load, refreshTick]);

  const stages = (state.data && state.data.stages) || [];
  const stores = (state.data && state.data.stores) || [];
  const storeName = (key) => (stores.find((s) => s.key === key) || {}).name || key;
  const gateStage = stages.find((s) => s.key === "gate_pass");
  const passes = useMemo(() => gatePasses(gateStage, store, now), [gateStage, store, now]);
  const summary = gatePassSummary(passes);
  const active = stages.find((s) => s.key === selected);

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
      <Flex align="baseline" justify="space-between" mb={3} wrap="wrap" gap={2}>
        <Text fontSize="sm" fontWeight="600" color="gray.700">
          Warehouse flow
        </Text>
        <Text fontSize="xs" color="gray.500">
          Now, live from RetailPilot{state.loading ? " · loading…" : ""}
        </Text>
      </Flex>

      {state.error ? (
        <Alert status="error" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {!state.data && state.loading ? (
        <Flex minH="120px" align="center" justify="center">
          <Spinner color="purple.500" />
        </Flex>
      ) : null}

      {stages.length ? (
        <SimpleGrid columns={{ base: 2, md: 5 }} spacing={3}>
          {stages.map((stage, i) => (
            <StageTile
              key={stage.key}
              index={i}
              stage={stage}
              summary={stage.key === "gate_pass" ? summary : null}
              selected={selected === stage.key}
              onSelect={() => setSelected(stage.key)}
            />
          ))}
        </SimpleGrid>
      ) : null}

      {active && active.key === "gate_pass" ? (
        <Box mt={4} overflowX="auto">
          {!active.ok ? (
            <Alert status="warning" borderRadius="md">
              <AlertIcon />
              <AlertDescription fontSize="sm">Gate passes could not be read from RetailPilot: {active.error}</AlertDescription>
            </Alert>
          ) : !passes.length ? (
            <Text fontSize="sm" color="gray.500">
              No open gate passes.
            </Text>
          ) : (
            <>
              <Text fontSize="xs" color="gray.600" mb={2}>
                Open gate passes, oldest first. Click one for its detail.
              </Text>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Gate pass</Th>
                    <Th>Store</Th>
                    <Th>Supplier</Th>
                    <Th>Vehicle</Th>
                    <Th>In at</Th>
                    <Th isNumeric>Open for</Th>
                    <Th>Inspection</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {passes.map((p) => (
                    <Tr
                      key={p.slug}
                      onClick={() => setOpenSlug(p.slug)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpenSlug(p.slug)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Open gate pass ${p.slug}`}
                      cursor="pointer"
                      _hover={{ bg: "purple.50" }}
                    >
                      <Td whiteSpace="nowrap" color="purple.700" fontWeight="600">
                        {p.slug}
                      </Td>
                      <Td>{storeName(p.store)}</Td>
                      <Td>{p.supplier_name || p.supplier_id || "—"}</Td>
                      <Td whiteSpace="nowrap">{p.vehicle_number || "—"}</Td>
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
                        {p.inspecting ? (
                          <Badge colorScheme="blue" fontSize="9px">
                            {p.inspections.map((i) => stateText(i.state)).join(", ")}
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
            </>
          )}
        </Box>
      ) : null}

      <GatePassDrawer slug={openSlug} onClose={() => setOpenSlug(null)} />
    </Box>
  );
}
