import React from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
} from "@chakra-ui/react";

import { isConfirmable, STATE } from "../../../util/payrunAdjustments";

/**
 * PAYRUN > ADJUSTMENTS — the month's initialized employees.
 *
 *   md and up   a table
 *   below md    one stacked card per employee
 *
 * THE SAME SWITCH, AT THE SAME BREAKPOINT, that
 * `components/payroll/PayrunEmployeeList.jsx` and the two attendance screens
 * already make. Inventing a third rule here would mean the payroll screens
 * disagreeing about what "mobile" means.
 *
 * IT IS A CHOICE OF LAYOUT AND NOTHING ELSE. Both branches receive the same
 * rows, apply the same permission, use the same `isConfirmable` predicate and
 * send the same actions. An employee who cannot be ticked on a desktop cannot
 * be ticked on a phone, because it is one module answering in both.
 *
 * `useBreakpointValue` RESOLVES TO `undefined` ON THE FIRST SERVER RENDER,
 * which is falsy, so the table renders before the browser knows its width -
 * the same default the initialization list takes.
 *
 * THE STATE BADGE IS THE SERVER'S WORDS. `adjustment_state_label` arrives on
 * the row; a browser mapping codes to its own labels would render a bare code
 * the day a state is added, for a state nobody notices is missing.
 */
const badgeScheme = (state) => {
  if (state === STATE.HAS_ADJUSTMENT) return "purple";
  if (state === STATE.NO_ADJUSTMENT_CONFIRMED) return "green";
  return "orange";
};

/** The amounts worth showing on a row: the ones that are not zero. */
const filledAmounts = (row, components) =>
  (components || []).filter((component) => Number(row.amounts?.[component.key] || 0) !== 0);

function Cells({ row, components, selected, onSelectChange, onEdit, onConfirm, canEdit, busyEmployeeId }) {
  const confirmable = isConfirmable(row);
  return {
    tick: (
      <Checkbox
        colorScheme="purple"
        isChecked={selected}
        isDisabled={!canEdit || !confirmable}
        onChange={(e) => onSelectChange(row.employee_id, e.target.checked)}
        aria-label={`Select ${row.employee_name || row.employee_id}`}
      />
    ),
    state: (
      <Badge colorScheme={badgeScheme(row.adjustment_state)} whiteSpace="normal" textAlign="left">
        {row.adjustment_state_label}
      </Badge>
    ),
    actions: (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button
          size="xs"
          variant="outline"
          onClick={() => onEdit(row)}
          isDisabled={!canEdit || busyEmployeeId === row.employee_id}
        >
          {row.adjustment_state === STATE.HAS_ADJUSTMENT ? "Edit" : "Add"}
        </Button>
        {/* THE INDIVIDUAL CONFIRMATION. Offered only where it would succeed:
            the server refuses to confirm somebody who has an adjustment, so
            showing the button there would be showing a button that fails. */}
        {confirmable ? (
          <Button
            size="xs"
            colorScheme="green"
            variant="outline"
            onClick={() => onConfirm([row.employee_id])}
            isDisabled={!canEdit}
            isLoading={busyEmployeeId === row.employee_id}
          >
            Confirm No Adjustment
          </Button>
        ) : null}
      </Stack>
    ),
  };
}

function AdjustmentTable(props) {
  const { rows } = props;
  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th width="1%" />
            <Th>Employee</Th>
            <Th>Status</Th>
            <Th isNumeric>Additions</Th>
            <Th isNumeric>Deductions</Th>
            <Th isNumeric>Net effect</Th>
            <Th>Balance Advance</Th>
            <Th>Remarks</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => {
            const cells = Cells({ ...props, row, selected: props.selectedIds.includes(row.employee_id) });
            return (
              <Tr key={row.employee_id}>
                <Td>{cells.tick}</Td>
                <Td fontSize="xs">
                  <Text fontWeight="medium">{row.employee_name || "—"}</Text>
                  <Text color="gray.600">
                    {row.employee_id} · {row.location || "—"}
                  </Text>
                </Td>
                <Td>{cells.state}</Td>
                <Td isNumeric fontSize="xs">{row.additions || 0}</Td>
                <Td isNumeric fontSize="xs">{row.deductions || 0}</Td>
                <Td isNumeric fontSize="xs" fontWeight="bold">{row.net_pay_delta || 0}</Td>
                {/* SHOWN IN ITS OWN COLUMN AND NEVER IN A TOTAL - which is the
                    whole of what "informational" means on this screen. */}
                <Td fontSize="xs" color="gray.600">
                  {row.informational ? `${row.informational} (no pay effect)` : "—"}
                </Td>
                <Td fontSize="xs" color="gray.600" maxW="220px" whiteSpace="normal">
                  {row.remarks || "—"}
                </Td>
                <Td>{cells.actions}</Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}

function AdjustmentCards(props) {
  const { rows, components } = props;
  return (
    <Stack spacing={2}>
      {rows.map((row) => {
        const cells = Cells({ ...props, row, selected: props.selectedIds.includes(row.employee_id) });
        const filled = filledAmounts(row, components);
        return (
          <Box key={row.employee_id} borderWidth="1px" borderRadius="md" p={3}>
            <Stack direction="row" align="flex-start" spacing={3}>
              {cells.tick}
              <Stack spacing={2} flex="1" minW={0}>
                <Stack spacing={0}>
                  <Text fontSize="sm" fontWeight="medium">
                    {row.employee_name || "—"}
                  </Text>
                  <Text fontSize="xs" color="gray.600">
                    {row.employee_id} · {row.location || "—"}
                  </Text>
                </Stack>
                {cells.state}
                {filled.length > 0 ? (
                  <Stack spacing={0}>
                    {filled.map((component) => (
                      <Text key={component.key} fontSize="xs" color="gray.700">
                        {component.label}: {row.amounts[component.key]}
                        {component.kind === "INFORMATIONAL" ? " (no pay effect)" : ""}
                      </Text>
                    ))}
                    <Text fontSize="xs" fontWeight="bold">
                      Net effect: {row.net_pay_delta || 0}
                    </Text>
                  </Stack>
                ) : (
                  <Text fontSize="xs" color="gray.600">
                    No amounts entered.
                  </Text>
                )}
                {row.remarks ? (
                  <Text fontSize="xs" color="gray.600">
                    {row.remarks}
                  </Text>
                ) : null}
                {cells.actions}
              </Stack>
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}

function AdjustmentEmployeeList(props) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  if (isMobile) return <AdjustmentCards {...props} />;
  return <AdjustmentTable {...props} />;
}

export default AdjustmentEmployeeList;
