import React from "react";
import { Box, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import {
  ExitedBadge,
  InitializeControl,
  PayTypeControl,
  SelectCheckbox,
  StatusBadge,
  WarningsBlock,
  rowIsBusy,
  rowIsSelectable,
} from "./payrunPresentation";

/**
 * Payrun Initialization - ONE EMPLOYEE'S MONTH, on a phone.
 *
 * WHY A CARD RATHER THAN THE TABLE. The table has ten columns, and the four
 * that matter most - Status, Blocking Reasons, Pay Type and Initialize - are
 * the last four. On a phone that meant they were off the right-hand edge:
 * present, technically, behind a horizontal scroll nobody performs. A screen
 * whose purpose is to say what is outstanding was not saying it.
 *
 * SO THE CARD IS THE SAME INFORMATION, STACKED, and the order is deliberate:
 * who this is, then what is true of them, then what is stopping them, then
 * what you can do about it. Nothing is dropped and nothing is summarised -
 * this is the same row, turned ninety degrees.
 *
 * IT RENDERS THE SHARED CELLS. Every value and every disabled rule comes from
 * `payrunPresentation.jsx`, which the desktop table uses too, so the two
 * layouts cannot disagree about a gross, a status or whether a row may be
 * acted on. There is no payroll logic in this file, and no rule of its own.
 *
 * THE REASONS ARE A TAP AWAY, NOT A HOVER AWAY. There is no hover on a touch
 * screen, so the BLOCKED badge opens them on a CLICK - the one interaction a
 * tap and a desktop click both perform. They are shown in full when opened.
 */

/** One labelled fact. The label is small and grey; the value carries. */
function Field({ label, value, children }) {
  return (
    <Box minWidth={0}>
      <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="0.04em">
        {label}
      </Text>
      {children || (
        <Text fontSize="sm" color="gray.800" whiteSpace="normal" wordBreak="break-word">
          {value}
        </Text>
      )}
    </Box>
  );
}

function PayrunEmployeeCard({
  row,
  selectedIds,
  onSelectChange,
  onInitialize,
  onPayTypeChange,
  canInitialize,
  canChangePayType,
  busyEmployeeId,
  disabled,
}) {
  const selectable = rowIsSelectable(row, canInitialize);
  const busy = rowIsBusy(row, busyEmployeeId, disabled);

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white" p={3}>
      <Stack spacing={3}>
        {/* WHO, AND WHETHER THEY CAN BE PICKED. The tick sits on the name so
            that selecting somebody is one obvious tap, and it carries the same
            disabled rule as the Initialize button below it. */}
        <Flex align="flex-start" justify="space-between" gap={2}>
          <Flex align="flex-start" gap={2} minWidth={0}>
            <SelectCheckbox
              row={row}
              selectable={selectable}
              busy={busy}
              selectedIds={selectedIds}
              onSelectChange={onSelectChange}
            />
            <Box minWidth={0}>
              <Text fontSize="sm" fontWeight="600" whiteSpace="normal" wordBreak="break-word">
                {row.employee_name}
                <ExitedBadge row={row} />
              </Text>
              <Text fontSize="xs" color="gray.500">
                ID {row.employee_id}
              </Text>
            </Box>
          </Flex>
          <StatusBadge row={row} />
        </Flex>

        {/* FOUR FACTS WERE FIVE. The Approved Monthly Gross is gone from this
            screen - it belongs on the calculation screen - which is most of
            why the card got shorter. */}
        <SimpleGrid columns={2} spacing={3}>
          <Field label="Location" value={row.store_name || "—"} />
          <Field label="Designation" value={row.designation_name || "—"} />
          <Field label="Pay Type">
            <PayTypeControl
              row={row}
              canChangePayType={canChangePayType}
              busy={busy}
              onPayTypeChange={onPayTypeChange}
              size="sm"
              width="100%"
            />
          </Field>
        </SimpleGrid>

        {/* THE BLOCKING REASONS ARE ON THE STATUS BADGE ABOVE - tap it. What
            stays inline is the warning, because nothing announces it and there
            is at most one: a warning does not stop the month, so nobody would
            think to go looking for it. */}
        <WarningsBlock row={row} fontSize="xs" />

        <InitializeControl
          row={row}
          selectable={selectable}
          busy={busy}
          busyEmployeeId={busyEmployeeId}
          onInitialize={onInitialize}
          size="sm"
          width="100%"
        />
      </Stack>
    </Box>
  );
}

export default PayrunEmployeeCard;
