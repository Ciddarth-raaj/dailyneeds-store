import React, { useState } from "react";
import { Alert, AlertDescription, AlertIcon, Box, Flex, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { ageTone } from "../../util/purchaseReturns";
import { formatINR } from "../../util/payrollDashboard";
import { SideDrawer, dayText } from "./DrawerParts";
import { KpiCard } from "./KpiCard";

const OPEN_ACCENT = "#c05621";
const AGE_COLOR = { normal: "gray.700", amber: "orange.500", red: "red.600" };

export const asOfText = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";

/**
 * Open returns: every return whose goods are back with the supplier and not
 * yet settled, as of now - not affected by the period. One tile; the list
 * opens in a drawer.
 *
 * @param pr       usePurchaseReturns state { loading, error, data }
 * @param summary  summarise(pr.data, store, ...) - totals and open
 */
export default function OpenReturnsSection({ pr, summary }) {
  const [show, setShow] = useState(false);
  const { totals, open } = summary;
  const data = pr.data;
  const openOk = data && data.open.ok;
  const asOf = asOfText(data && data.open.fetched_at);

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
      <Text fontSize="md" fontWeight="700" color="gray.800">
        Open returns
      </Text>
      <Text fontSize="xs" color="gray.600" mb={3}>
        Returns whose goods are already back with the supplier but not yet settled as a debit note or a replacement, however long ago they were
        raised. As of {asOf}; <b>not affected by the period filter.</b>
      </Text>

      {pr.error ? (
        <Alert status="error" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">{pr.error}</AlertDescription>
        </Alert>
      ) : null}
      {data && !openOk ? (
        <Alert status="warning" borderRadius="md" mb={3}>
          <AlertIcon />
          <AlertDescription fontSize="sm">Open returns could not be read from RetailPilot: {data.open.error}</AlertDescription>
        </Alert>
      ) : null}
      {pr.loading && !data ? (
        <Flex minH="80px" align="center" justify="center">
          <Spinner color="purple.500" />
        </Flex>
      ) : null}

      {data ? (
        <Box maxW={{ base: "100%", md: "340px" }}>
          <KpiCard
            label="Open returns"
            value={totals.open_value}
            accent={OPEN_ACCENT}
            valueColor={totals.open_claims ? "orange.600" : undefined}
            sub={`as of ${asOf} · ${totals.open_claims} with suppliers${totals.oldest_days !== null ? ` · oldest ${totals.oldest_days}d` : ""}`}
            unavailable={openOk ? null : "Not available"}
            onClick={() => setShow(true)}
          />
        </Box>
      ) : null}

      <SideDrawer
        isOpen={show}
        onClose={() => setShow(false)}
        title="Open returns"
        sub={`As of ${asOf} · ${totals.open_claims} claims · ${formatINR(totals.open_value)} · not affected by the period`}
        subColor="orange.600"
      >
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
      </SideDrawer>
    </Box>
  );
}
