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


function SideDrawer({ isOpen, onClose, title, sub, subColor = "gray.600", children }) {
  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="lg">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px" pr={12}>
          <Text fontSize="md" fontWeight="700">
            {title}
          </Text>
          <Text fontSize="xs" color={subColor} fontWeight="400">
            {sub}
          </Text>
        </DrawerHeader>
        <DrawerBody>{children}</DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function Heading({ children }) {
  return (
    <Text fontSize="xs" color="gray.600" fontWeight="600" textTransform="uppercase" mt={4} mb={1}>
      {children}
    </Text>
  );
}

function SimpleTable({ columns, rows }) {
  return (
    <Box overflowX="auto" borderWidth="1px" borderColor="gray.100" borderRadius="md">
      <Table size="sm">
        <Thead bg="gray.50">
          <Tr>
            {columns.map((c) => (
              <Th key={c.label} isNumeric={c.numeric}>
                {c.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((r) => (
            <Tr key={r.key}>
              {columns.map((c) => (
                <Td key={c.label} isNumeric={c.numeric}>
                  {c.get(r)}
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

/** Every location, value (count) or a dash. */
function ByLocation({ rows, value, count }) {
  return (
    <>
      <Heading>By location</Heading>
      <SimpleTable
        columns={[
          { label: "Location", get: (r) => r.name },
          { label: "Value", get: (r) => cell(r[value], r[count]), numeric: true },
        ]}
        rows={rows}
      />
    </>
  );
}

/** One line per debit note / replacement: supplier, location, date, value. */
function ItemList({ title, rows, empty }) {
  return (
    <>
      <Heading>{title}</Heading>
      {rows.length ? (
        <SimpleTable
          columns={[
            { label: "Supplier", get: (r) => r.supplier },
            { label: "Location", get: (r) => r.location },
            { label: "Date", get: (r) => dayText(r.day), numeric: true },
            { label: "Value", get: (r) => formatINR(r.value), numeric: true },
          ]}
          rows={rows}
        />
      ) : (
        <Text fontSize="sm" color="gray.500">
          {empty}
        </Text>
      )}
    </>
  );
}

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
  // Which tile's drawer is open: "debit_note", "replacement", "open" or null.
  const [drawer, setDrawer] = useState(null);

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
  const { totals, byStore, topSuppliers, open, debitNotes, replacements } = useMemo(() => summarise(data, store, purchase), [data, store, purchase]);
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
      <Text fontSize="xs" color="gray.500" mt={1} mb={3}>
        Click a tile for the details.
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
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
          <Card
            label="Debit notes"
            value={totals.debit_note}
            accent={ACCENT}
            sub={`${totals.debit_notes} notes${totals.debit_note_pct !== null ? ` · ${totals.debit_note_pct}% of purchases` : ""}`}
            unavailable={settledOk ? null : "Not available"}
            onClick={() => setDrawer("debit_note")}
            hint="Show debit notes by location and supplier"
          />
          <Card
            label="Replacements"
            value={totals.replacement}
            accent={ACCENT}
            sub={`${totals.replacements} claims`}
            unavailable={settledOk ? null : "Not available"}
            onClick={() => setDrawer("replacement")}
            hint="Show replacements by location"
          />
          <Card
            label="Open returns"
            value={totals.open_value}
            accent={OPEN_ACCENT}
            valueColor={totals.open_claims ? "orange.600" : undefined}
            sub={`as of ${asOf} · ${totals.open_claims} with suppliers${totals.oldest_days !== null ? ` · oldest ${totals.oldest_days}d` : ""}`}
            unavailable={openOk ? null : "Not available"}
            onClick={() => setDrawer("open")}
            hint="Show open returns by supplier"
          />
        </SimpleGrid>
      ) : null}

      <SideDrawer
        isOpen={drawer === "debit_note"}
        onClose={() => setDrawer(null)}
        title="Debit notes"
        sub={`Raised ${periodText} · ${totals.debit_notes} notes · ${formatINR(totals.debit_note)}${
          totals.debit_note_pct !== null ? ` · ${totals.debit_note_pct}% of purchases` : ""
        }`}
      >
        <ByLocation rows={byStore} value="debit_note" count="debit_notes" />
        {topSuppliers.length ? (
          <>
            <Heading>Top suppliers by debit note value</Heading>
            <SimpleTable
              columns={[
                { label: "Supplier", get: (r) => r.name },
                { label: "Notes", get: (r) => r.notes, numeric: true },
                { label: "Value", get: (r) => formatINR(r.value), numeric: true },
              ]}
              rows={topSuppliers}
            />
          </>
        ) : null}
        <ItemList title="Every debit note" rows={debitNotes} empty="No debit notes raised in this period." />
      </SideDrawer>

      <SideDrawer
        isOpen={drawer === "replacement"}
        onClose={() => setDrawer(null)}
        title="Replacements"
        sub={`Raised ${periodText} · ${totals.replacements} claims · ${formatINR(totals.replacement)}`}
      >
        <ByLocation rows={byStore} value="replacement" count="replacements" />
        <ItemList title="Every replacement" rows={replacements} empty="No replacements raised in this period." />
      </SideDrawer>

      <SideDrawer
        isOpen={drawer === "open"}
        onClose={() => setDrawer(null)}
        title="Open returns"
        sub={`As of ${asOf} · ${totals.open_claims} claims · ${formatINR(totals.open_value)} · not affected by the period`}
        subColor="orange.600"
      >
        <Text fontSize="xs" color="gray.600" mb={3}>
          Every return whose goods have already been handed back to the supplier but which the supplier has not yet settled as a debit note or a
          replacement, however long ago it was raised. Age = days since the return claim was raised; amber after 7 days, red after 15. Value = the
          claimed amount.
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
      </SideDrawer>
    </Box>
  );
}
