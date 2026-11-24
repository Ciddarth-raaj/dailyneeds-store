import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
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
import BusinessDashboardHelper from "../../helper/businessDashboard";
import { ageTone, summarise } from "../../util/purchaseReturns";
import { compactINR, formatINR } from "../../util/payrollDashboard";

const ACCENT = "#eb6834";
const OPEN_ACCENT = "#c05621";
const AGE_COLOR = { normal: "gray.700", amber: "orange.500", red: "red.600" };

const dayText = (day) => {
  if (!day) return "—";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
const asOfText = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";

function Card({ label, value, sub, accent, valueColor, unavailable, onClick, hint }) {
  const clickable = Boolean(onClick) && !unavailable;
  return (
    <Box
      as={clickable ? "button" : "div"}
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
      title={clickable ? hint : undefined}
      textAlign="left"
      w="100%"
      px={4}
      py={3}
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderLeftWidth="4px"
      borderLeftColor={unavailable ? "gray.300" : accent}
      borderRadius="md"
      cursor={clickable ? "pointer" : "default"}
      _hover={clickable ? { boxShadow: "md", borderColor: "purple.300" } : undefined}
    >
      <Text fontSize="xs" color="gray.600" fontWeight="600" textTransform="uppercase" letterSpacing="wide">
        {label}
      </Text>
      {unavailable ? (
        <Text fontSize="sm" color="gray.500" mt={1}>
          {unavailable}
        </Text>
      ) : (
        <>
          <Text fontSize="2xl" fontWeight="700" color={valueColor || "gray.800"} lineHeight="short" isTruncated>
            {compactINR(Math.round(value || 0))}
          </Text>
          <Text fontSize="xs" color="gray.600" noOfLines={2}>
            {sub}
          </Text>
        </>
      )}

      <Drawer isOpen={showOpen} placement="right" onClose={() => setShowOpen(false)} size="lg">
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" pr={12}>
            <Text fontSize="md" fontWeight="700">
              Open returns
            </Text>
            <Text fontSize="xs" color="orange.600" fontWeight="400">
              As of {asOf} · {totals.open_claims} claims · {formatINR(totals.open_value)} · not affected by the period
            </Text>
          </DrawerHeader>
          <DrawerBody>
            <Text fontSize="xs" color="gray.600" mb={3}>
              Age = days since the return claim was raised; amber after 7 days, red after 15. Value = the claimed amount.
            </Text>
            {openOk && !open.length ? (
              <Text fontSize="sm" color="gray.500">
                No open returns.
              </Text>
            ) : null}
            {open.length ? (
              <Box overflow="auto" borderWidth="1px" borderColor="gray.100" borderRadius="md">
                <Table size="sm">
                  <Thead position="sticky" top={0} bg="gray.50" zIndex={1}>
                    <Tr>
                      <Th>Supplier</Th>
                      <Th isNumeric>Age</Th>
                      <Th isNumeric>Value</Th>
                      <Th isNumeric>Claims</Th>
                      <Th>Location</Th>
                      <Th isNumeric>Raised on</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {open.map((r) => (
                      <Tr key={r.key}>
                        <Td>{r.supplier}</Td>
                        <Td isNumeric fontWeight="600" color={AGE_COLOR[ageTone(r.age_days)]}>
                          {r.age_days === null ? "—" : `${r.age_days}d`}
                        </Td>
                        <Td isNumeric>{formatINR(r.value)}</Td>
                        <Td isNumeric>{r.claims}</Td>
                        <Td>{r.location}</Td>
                        <Td isNumeric>{dayText(r.raised_on)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            ) : null}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

const cell = (value, count) =>
  count ? (
    <>
      {formatINR(value)}{" "}
      <Text as="span" color="gray.500">
        ({count})
      </Text>
    </>
  ) : (
    <Text as="span" color="gray.400">
      —
    </Text>
  );

/**
 * Purchase returns, live from RetailPilot: debit notes and replacements raised
 * in the period, and every open return (goods back with the supplier, not yet
 * settled) as of now - open returns ignore the period.
 *
 * @param range       { from, to } - the dashboard's period
 * @param periodLabel e.g. "Today"
 * @param store       store key to narrow to, "" for all
 * @param purchase    purchases in the period for the same stores, for "% of purchases"
 * @param refreshTick bumped by the dashboard's Refresh
 */
export default function PurchaseReturnsSection({ range, periodLabel, store, purchase, refreshTick }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [showOpen, setShowOpen] = useState(false);

  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    BusinessDashboardHelper.getPurchaseReturns({ from_date: range.from, to_date: range.to, ...(refreshTick ? { refresh: 1 } : {}) })
      .then((res) => {
        if (!live) return;
        if (res && res.code === 200) setState({ loading: false, error: null, data: res.data });
        else setState({ loading: false, error: (res && (res.msg || res.message)) || "Could not load purchase returns", data: null });
      })
      .catch((err) => live && setState({ loading: false, error: err.message || "Could not load purchase returns", data: null }));
    return () => {
      live = false;
    };
  }, [range.from, range.to, refreshTick]);

  const data = state.data;
  const { totals, byStore, topSuppliers, open } = useMemo(() => summarise(data, store, purchase), [data, store, purchase]);
  const settledOk = data && data.settled.ok;
  const openOk = data && data.open.ok;
  const asOf = asOfText(data && data.open.fetched_at);
  const settledAt = data && data.settled.fetched_at ? new Date(data.settled.fetched_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }) : null;
  const periodText = range.from === range.to ? dayText(range.from) : `${dayText(range.from)} – ${dayText(range.to)}`;

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
      <Text fontSize="md" fontWeight="700" color="gray.800">
        Purchase returns
      </Text>
      <Text fontSize="xs" color="gray.600">
        Debit notes &amp; replacements raised — {periodLabel || "Custom"} · {periodText}
        {settledAt ? ` till ${settledAt}` : ""} · Open returns — as of {asOf}, not affected by the period · from RetailPilot
      </Text>
      <Text fontSize="xs" color="gray.600" mt={1} mb={3}>
        <b>Open returns</b> — every return whose goods have already been handed back to the supplier (return submitted in RetailPilot) but which the
        supplier has not yet settled as a debit note or a replacement — however long ago it was raised. <b>Not affected by the period filter.</b> Age =
        days since the return claim was raised; amber after 7 days, red after 15. Value = the claimed amount.
      </Text>

      {state.error ? (
        <Alert status="error" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {data && !settledOk ? (
        <Alert status="warning" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">Debit notes and replacements could not be read from RetailPilot: {data.settled.error}</AlertDescription>
        </Alert>
      ) : null}
      {data && !openOk ? (
        <Alert status="warning" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">Open returns could not be read from RetailPilot: {data.open.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.loading && !data ? (
        <Flex minH="120px" align="center" justify="center">
          <Spinner color="purple.500" />
        </Flex>
      ) : null}

      {data ? (
        <>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={4}>
            <Card
              label="Debit notes"
              value={totals.debit_note}
              accent={ACCENT}
              sub={`${totals.debit_notes} notes${totals.debit_note_pct !== null ? ` · ${totals.debit_note_pct}% of purchases` : ""}`}
              unavailable={settledOk ? null : "Not available"}
            />
            <Card label="Replacements" value={totals.replacement} accent={ACCENT} sub={`${totals.replacements} claims`} unavailable={settledOk ? null : "Not available"} />
            <Card
              label="Open returns"
              value={totals.open_value}
              accent={OPEN_ACCENT}
              valueColor={totals.open_claims ? "orange.600" : undefined}
              sub={`as of ${asOf} · ${totals.open_claims} with suppliers${totals.oldest_days !== null ? ` · oldest ${totals.oldest_days}d` : ""}`}
              unavailable={openOk ? null : "Not available"}
              onClick={() => setShowOpen(true)}
              hint="Show open returns by supplier"
            />
          </SimpleGrid>

          <Text fontSize="xs" color="gray.600" fontWeight="600" textTransform="uppercase" mb={1}>
            Raised in this period · {periodText}
          </Text>
          <Box overflowX="auto" mb={4}>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Location</Th>
                  <Th isNumeric>Debit notes</Th>
                  <Th isNumeric>Replacements</Th>
                </Tr>
              </Thead>
              <Tbody>
                {byStore.map((s) => (
                  <Tr key={s.key}>
                    <Td>{s.name}</Td>
                    <Td isNumeric>{settledOk ? cell(s.debit_note, s.debit_notes) : "—"}</Td>
                    <Td isNumeric>{settledOk ? cell(s.replacement, s.replacements) : "—"}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {topSuppliers.length ? (
            <>
              <Text fontSize="xs" color="gray.600" fontWeight="600" textTransform="uppercase" mb={1}>
                Top suppliers by debit note value
              </Text>
              <Box overflowX="auto" mb={4}>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Supplier</Th>
                      <Th isNumeric>Notes</Th>
                      <Th isNumeric>Value</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {topSuppliers.map((s) => (
                      <Tr key={s.key}>
                        <Td>{s.name}</Td>
                        <Td isNumeric>{s.notes}</Td>
                        <Td isNumeric>{formatINR(s.value)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </>
          ) : null}

        </>
      ) : null}
    </Box>
  );
}
