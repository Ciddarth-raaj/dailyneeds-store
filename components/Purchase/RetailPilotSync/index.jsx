import React, { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import moment from "moment";

import usePermissions from "../../../customHooks/usePermissions";
import currencyFormatter from "../../../util/currencyFormatter";
import { runRetailPilotPurchaseSync } from "../../../helper/purchase";
import {
  ACTION_LABELS,
  RETAILPILOT_SYNC_DEFAULT_DAYS,
  RETAILPILOT_SYNC_MAX_DAYS,
  syncError,
  syncSummary,
  validDays,
} from "../../../util/retailPilotSync";

/**
 * RetailPilot Sync on the Purchase screen, for whoever holds
 * sync_retailpilot_purchases (admins always do).
 *
 *   Dry Run   - what a sync would do; nothing is written
 *   Sync Now  - imports, after a confirmation
 *
 * The scheduled sync is separate and stays off unless the server sets
 * RETAILPILOT_PURCHASE_SYNC_ENABLED=true.
 */
function RetailPilotSync({ onSynced }) {
  const canSync = usePermissions(["sync_retailpilot_purchases"]);
  const panel = useDisclosure();
  const confirm = useDisclosure();
  const [days, setDays] = useState(String(RETAILPILOT_SYNC_DEFAULT_DAYS));
  const [running, setRunning] = useState(null); // "dry" | "sync" | null
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null); // the last dry run

  if (!canSync) return null;

  const daysOk = validDays(days);

  const run = async (dryRun) => {
    setRunning(dryRun ? "dry" : "sync");
    try {
      const response = await runRetailPilotPurchaseSync({ days: Number(days), dryRun });
      const error = syncError(response);
      if (error) {
        toast.error(error);
        return;
      }
      setResult(response);
      if (dryRun) {
        setPreview(response);
      } else {
        setPreview(null);
        toast.success("RetailPilot purchases synced");
        if (onSynced) onSynced();
      }
    } catch (err) {
      toast.error(err?.message || "RetailPilot sync failed");
    } finally {
      setRunning(null);
    }
  };

  const previewForDays = preview && Number(preview.days) === Number(days) ? syncSummary(preview) : null;

  return (
    <>
      <Button colorScheme="purple" variant="outline" size="sm" onClick={panel.onOpen}>
        RetailPilot Sync
      </Button>

      <Modal isOpen={panel.isOpen} onClose={panel.onClose} size="4xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="xl" overflow="hidden">
          <ModalHeader>RetailPilot Sync</ModalHeader>
          <ModalCloseButton isDisabled={!!running} />
          <ModalBody>
            <Stack spacing={5}>
              <FormControl isInvalid={!daysOk} maxW="260px">
                <FormLabel>Look back (days)</FormLabel>
                <Input
                  type="number"
                  min={0}
                  max={RETAILPILOT_SYNC_MAX_DAYS}
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  isDisabled={!!running}
                />
                <FormHelperText color={daysOk ? undefined : "red.500"}>
                  {daysOk
                    ? "Invoices received in RetailPilot in these days."
                    : `A whole number from 0 to ${RETAILPILOT_SYNC_MAX_DAYS}.`}
                </FormHelperText>
              </FormControl>

              <Text fontSize="sm" color="gray.600">
                Dry Run shows what a sync would do and imports nothing. Sync Now adds new bills and
                updates unapproved bills RetailPilot changed, keeping Accounts&apos; corrections.
                Approved bills are never touched.
              </Text>

              {result && <SyncResult result={result} />}
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button onClick={panel.onClose} variant="ghost" isDisabled={!!running}>
              Close
            </Button>
            <Button
              colorScheme="purple"
              variant="outline"
              onClick={() => run(true)}
              isLoading={running === "dry"}
              loadingText="Checking RetailPilot"
              isDisabled={!daysOk || (running && running !== "dry")}
            >
              Dry Run
            </Button>
            <Button
              colorScheme="purple"
              onClick={confirm.onOpen}
              isLoading={running === "sync"}
              loadingText="Syncing"
              isDisabled={!daysOk || (running && running !== "sync")}
            >
              Sync Now
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={confirm.isOpen} onClose={confirm.onClose} isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="xl">
          <ModalHeader>Import RetailPilot purchases?</ModalHeader>
          <ModalBody>
            <Stack spacing={3}>
              <Text>
                This imports purchases received in RetailPilot in the last <b>{days}</b> day(s) into
                DNDS.
              </Text>
              {previewForDays ? (
                <Text>
                  The dry run for these days found <b>{previewForDays.new}</b> new and{" "}
                  <b>{previewForDays.existing}</b> existing bill(s), <b>{previewForDays.skipped}</b>{" "}
                  skipped and <b>{previewForDays.discrepancies}</b> discrepancy(ies).
                </Text>
              ) : (
                <Text color="orange.600">
                  No dry run for {days} day(s) yet. Run a Dry Run first to see what will be imported.
                </Text>
              )}
            </Stack>
          </ModalBody>
          <ModalFooter gap={3}>
            <Button variant="ghost" onClick={confirm.onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={() => {
                confirm.onClose();
                run(false);
              }}
            >
              Import now
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

function Tile({ label, value, detail, colorScheme }) {
  return (
    <Box borderWidth="1px" borderRadius="lg" p={3}>
      <Text fontSize="sm" color="gray.600">
        {label}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color={colorScheme ? `${colorScheme}.600` : undefined}>
        {value}
      </Text>
      {detail && (
        <Text fontSize="xs" color="gray.500">
          {detail}
        </Text>
      )}
    </Box>
  );
}

function SyncResult({ result }) {
  const s = syncSummary(result);
  const bills = result.bills || [];
  const skipped = result.skipped || [];
  const discrepancies = result.discrepancies || [];

  return (
    <Stack spacing={4}>
      <Flex align="center" gap={2}>
        <Badge colorScheme={s.dryRun ? "orange" : "green"}>{s.dryRun ? "Dry run" : "Synced"}</Badge>
        <Text fontSize="sm">
          {s.dryRun
            ? `Nothing imported. A sync now (last ${s.days} day(s), ${s.total} bill(s)) would:`
            : `Last ${s.days} day(s), ${s.total} bill(s):`}
        </Text>
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
        <Tile label={s.dryRun ? "New (would import)" : "New (imported)"} value={s.new} colorScheme="green" />
        <Tile
          label="Existing"
          value={s.existing}
          detail={`${s.updated} updated · ${s.unchanged} unchanged · ${s.approved} approved, not touched`}
        />
        <Tile label="Skipped" value={s.skipped} colorScheme={s.skipped ? "orange" : undefined} />
        <Tile
          label="Discrepancies"
          value={s.discrepancies}
          detail={s.discrepancies ? `on ${s.discrepancyBills} bill(s)` : undefined}
          colorScheme={s.discrepancies ? "red" : undefined}
        />
      </SimpleGrid>

      {skipped.length > 0 && (
        <Section title="Skipped">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Invoice</Th>
                <Th>Reason</Th>
              </Tr>
            </Thead>
            <Tbody>
              {skipped.map((x, i) => (
                <Tr key={`${x.invoice_slug}-${i}`}>
                  <Td>{x.invoice_slug}</Td>
                  <Td>{x.reason}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Section>
      )}

      {discrepancies.length > 0 && (
        <Section title="Discrepancies">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>MRC Ref No</Th>
                <Th>Finding</Th>
              </Tr>
            </Thead>
            <Tbody>
              {discrepancies.map((d, i) => (
                <Tr key={`${d.invoice_slug}-${d.code}-${i}`}>
                  <Td whiteSpace="nowrap">{d.mrc_ref}</Td>
                  <Td>
                    <Badge mr={2} colorScheme={d.severity === "block" ? "red" : "orange"}>
                      {d.severity === "block" ? "Correct before approval" : "Check"}
                    </Badge>
                    {d.message}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Section>
      )}

      {bills.length > 0 && (
        <Section title="Bills">
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>MRC Ref No</Th>
                <Th>Supplier</Th>
                <Th>MRC Date</Th>
                <Th isNumeric>MRC Amount</Th>
                <Th>{s.dryRun ? "Would be" : "Result"}</Th>
              </Tr>
            </Thead>
            <Tbody>
              {bills.map((b) => (
                <Tr key={`${b.outlet}-${b.invoice_slug}`}>
                  <Td>{b.mrc_ref}</Td>
                  <Td>{b.supplier_name}</Td>
                  <Td whiteSpace="nowrap">{b.mrc_date ? moment(b.mrc_date).format("DD-MM-YYYY") : "-"}</Td>
                  <Td isNumeric>{currencyFormatter(b.mrc_amt)}</Td>
                  <Td>{ACTION_LABELS[b.action] || b.action}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Section>
      )}
    </Stack>
  );
}

function Section({ title, children }) {
  return (
    <Box>
      <Text fontWeight="semibold" mb={2}>
        {title}
      </Text>
      <Box borderWidth="1px" borderRadius="md" maxH="260px" overflowY="auto">
        {children}
      </Box>
    </Box>
  );
}

export default RetailPilotSync;
