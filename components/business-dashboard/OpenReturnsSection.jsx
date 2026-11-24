import React, { useState } from "react";
import { Alert, AlertDescription, AlertIcon, Box, Button, Flex, Spinner, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import toast from "react-hot-toast";
import BusinessDashboardHelper from "../../helper/businessDashboard";
import { useUser } from "../../contexts/UserContext";
import { ageTone } from "../../util/purchaseReturns";
import { formatINR } from "../../util/payrollDashboard";
import { SideDrawer, dayText } from "./DrawerParts";
import { KpiCard } from "./KpiCard";

const OPEN_ACCENT = "#c05621";
const AGE_COLOR = { normal: "gray.700", amber: "orange.500", red: "red.600" };

export const asOfText = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }) : "—";

/**
 * The 9:15 am Telegram PDF on demand, for administrators (the server refuses
 * anyone else): Preview downloads it; Send now posts it to the Purchase group.
 */
function ReportButtons() {
  const [busy, setBusy] = useState(null);
  const preview = async () => {
    setBusy("preview");
    try {
      const blob = await BusinessDashboardHelper.getOpenReturnsPdf();
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `open-returns-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      toast.error(err.message || "Could not make the PDF");
    } finally {
      setBusy(null);
    }
  };
  const sendNow = async () => {
    if (typeof window !== "undefined" && !window.confirm("Send the Open returns PDF to the Purchase Telegram group now?")) return;
    setBusy("send");
    try {
      const res = await BusinessDashboardHelper.sendOpenReturns();
      if (res && res.code === 200) toast.success(res.msg ? `${res.msg} on Telegram` : "Sent to the Purchase group on Telegram");
      else toast.error((res && (res.msg || res.message)) || "Could not send the report");
    } catch (err) {
      toast.error((err.response && err.response.data && err.response.data.msg) || err.message || "Could not send the report");
    } finally {
      setBusy(null);
    }
  };
  return (
    <Flex gap={2} wrap="wrap">
      <Button size="sm" variant="outline" onClick={preview} isLoading={busy === "preview"} isDisabled={Boolean(busy)} loadingText="Making PDF">
        Preview PDF
      </Button>
      <Button size="sm" colorScheme="purple" onClick={sendNow} isLoading={busy === "send"} isDisabled={Boolean(busy)} loadingText="Sending">
        Send to Telegram now
      </Button>
    </Flex>
  );
}

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
  const { userConfig } = useUser();
  // The PDF buttons are for administrators; the server checks again.
  const isAdmin = String(userConfig && userConfig.userType) === "2";
  const { totals, open } = summary;
  const data = pr.data;
  const openOk = data && data.open.ok;
  const asOf = asOfText(data && data.open.fetched_at);

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" p={4}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={2}>
        <Text fontSize="md" fontWeight="700" color="gray.800">
          Open returns
        </Text>
        {isAdmin ? <ReportButtons /> : null}
      </Flex>
      <Text fontSize="xs" color="gray.600" mb={3}>
        Returns whose goods are already back with the supplier but not yet settled as a debit note or a replacement, however long ago they were
        raised. As of {asOf}; <b>not affected by the period filter.</b> Sent to the Purchase Telegram group as a PDF at 9:15 am daily.
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
