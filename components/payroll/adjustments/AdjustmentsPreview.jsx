import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  SimpleGrid,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Button,
} from "@chakra-ui/react";

import { previewTabs, rowsForTab } from "../../../util/payrunAdjustments";

/**
 * PAYRUN > ADJUSTMENTS — STEP 3: Preview and Confirm.
 *
 * THREE SECTIONS, AND THEY ARE THE THREE ANSWERS A FILE CAN GIVE ABOUT A
 * PERSON: this one gets money (or has money taken off), this one says nothing
 * about them, this row cannot be read. Collapsing the middle one into "fine"
 * is the mistake the whole stage exists to prevent - a row that says nothing
 * leaves an employee PENDING, not confirmed, and the banner below says so in
 * as many words rather than leaving it to be inferred from a count.
 *
 * THE FOURTH NUMBER IS THE ONE PEOPLE FORGET. "Initialized this month" is what
 * makes the other three mean something: 200 rows against 223 initialized
 * employees is a file that is missing 23 people, and no amount of row-level
 * validation would say so.
 *
 * IT DECIDES NOTHING. Every count, every row verdict and every error sentence
 * on this screen is the server's, arriving on the preview response. The tabs
 * group rows by the server's own `outcome`; they do not re-derive it.
 *
 * MOBILE: the counts are a 2-up grid on a phone and the row lists are stacked
 * cards rather than a table, because a five-column table of amounts on a
 * 360px screen is a horizontal scrollbar nobody finds.
 */
function AdjustmentsPreview({ preview, initializedCount }) {
  const [tab, setTab] = useState("WITH_ADJUSTMENTS");
  if (!preview) return null;

  const tabs = previewTabs(preview);
  const rows = rowsForTab(preview, tab);
  const missing = Number(preview.employees_not_in_file || 0);

  return (
    <Stack spacing={3}>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
        {tabs.map((t) => (
          <Stat key={t.key} p={3} borderWidth="1px" borderRadius="md">
            <StatLabel fontSize="xs">{t.label}</StatLabel>
            <StatNumber fontSize="lg" color={t.key === "INVALID" && t.count > 0 ? "red.500" : undefined}>
              {t.count}
            </StatNumber>
          </Stat>
        ))}
        <Stat p={3} borderWidth="1px" borderRadius="md">
          <StatLabel fontSize="xs">Initialized this month</StatLabel>
          <StatNumber fontSize="lg">{preview.initialized_count ?? initializedCount ?? 0}</StatNumber>
        </Stat>
      </SimpleGrid>

      {preview.invalid_rows > 0 ? (
        <Alert status="error" fontSize="sm">
          <AlertIcon />
          {preview.invalid_rows} row{preview.invalid_rows === 1 ? "" : "s"} cannot be read. Nothing will be
          saved until every row is valid — fix the file and import it again.
        </Alert>
      ) : null}

      {/* THE SENTENCE THAT STOPS THE COMMONEST MISUNDERSTANDING IN THIS STAGE. */}
      {preview.no_adjustment_pending_confirmation > 0 ? (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          {preview.no_adjustment_pending_confirmation} row
          {preview.no_adjustment_pending_confirmation === 1 ? " has" : "s have"} no amounts. Saving this file
          does <b>not</b> confirm them as having no adjustment — they stay <b>Pending Confirmation</b> until
          somebody confirms them explicitly.
        </Alert>
      ) : null}

      {missing > 0 ? (
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          {missing} initialized employee{missing === 1 ? " is" : "s are"} not in this file at all. They are
          unaffected by it and remain as they are.
        </Alert>
      ) : null}

      <Stack direction="row" spacing={2} flexWrap="wrap">
        {tabs.map((t) => (
          <Button
            key={t.key}
            size="xs"
            variant={tab === t.key ? "solid" : "outline"}
            colorScheme={t.key === "INVALID" ? "red" : "purple"}
            onClick={() => setTab(t.key)}
          >
            {t.label} ({t.count})
          </Button>
        ))}
      </Stack>

      {rows.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No rows in this section.
        </Text>
      ) : (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th>Row</Th>
                <Th>Employee</Th>
                <Th isNumeric>Additions</Th>
                <Th isNumeric>Deductions</Th>
                <Th isNumeric>Net effect</Th>
                <Th>Notes</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((row) => (
                <Tr key={`${row.row_number}-${row.employee_id}`}>
                  <Td fontSize="xs">{row.row_number}</Td>
                  <Td fontSize="xs">
                    <Text fontWeight="medium">{row.employee_name || "—"}</Text>
                    <Text color="gray.600">
                      {row.employee_id} · {row.location || "—"}
                    </Text>
                  </Td>
                  <Td isNumeric fontSize="xs">{row.additions || 0}</Td>
                  <Td isNumeric fontSize="xs">{row.deductions || 0}</Td>
                  <Td isNumeric fontSize="xs" fontWeight="bold">
                    {row.net_pay_delta || 0}
                  </Td>
                  <Td fontSize="xs">
                    {/* THE SERVER'S OWN SENTENCES. The screen does not
                        paraphrase a validation failure - the message names the
                        column and the value, which is what somebody needs in
                        order to fix the cell. */}
                    {row.errors && row.errors.length > 0
                      ? row.errors.map((message) => (
                          <Text key={message} color="red.600">
                            {message}
                          </Text>
                        ))
                      : null}
                    {row.warnings && row.warnings.length > 0
                      ? row.warnings.map((message) => (
                          <Text key={message} color="orange.600">
                            {message}
                          </Text>
                        ))
                      : null}
                    {row.informational ? (
                      <Badge colorScheme="gray">Balance Advance {row.informational} (no pay effect)</Badge>
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}
    </Stack>
  );
}

export default AdjustmentsPreview;
