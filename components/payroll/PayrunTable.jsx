import React from "react";
import {
  Badge,
  Button,
  Checkbox,
  Select,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { reasonText } from "../../util/payrunSelection";
import { isRowInitializable } from "../../util/payrunAccess";

/**
 * Payrun Initialization - the month's employees, one row each.
 *
 * IT DECIDES NOTHING AND CALCULATES NOTHING. Every cell is a value the server
 * sent: the status, the blocking reasons, the gross, the pay type. The only
 * rule this component applies is `isRowInitializable`, which is the shared one
 * the page's selection uses, so a checkbox and a button can never disagree
 * about whether a row may be acted on.
 *
 * A BLOCKED ROW CANNOT BE TICKED OR INITIALIZED, and it says why rather than
 * merely being greyed out: a disabled control with no explanation sends
 * somebody to ask a colleague what is wrong with a record they are looking at.
 *
 * THE REASONS ARE SHOWN IN FULL. They are short, there are rarely more than
 * two, and hiding them behind an icon would defeat the point of the screen -
 * which is to tell a payroll clerk exactly what is outstanding.
 */

const STATUS_COLOR = {
  READY: "green",
  BLOCKED: "red",
  INITIALIZED: "purple",
};

function PayrunTable({
  rows,
  selectedIds,
  onSelectChange,
  onInitialize,
  onPayTypeChange,
  canInitialize,
  canChangePayType,
  busyEmployeeId,
  disabled,
}) {
  return (
    <Table size="sm" variant="simple">
      <Thead>
        <Tr>
          <Th width="40px" />
          <Th>Employee ID</Th>
          <Th>Employee Name</Th>
          <Th>Location</Th>
          <Th>Designation</Th>
          <Th isNumeric>Approved Monthly Gross</Th>
          <Th>Status</Th>
          <Th>Pay Type</Th>
          <Th>Blocking Reasons</Th>
          <Th />
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((row) => {
          const selectable = isRowInitializable(row) && canInitialize;
          const busy = busyEmployeeId === row.employee_id || disabled;
          return (
            <Tr key={row.employee_id}>
              <Td>
                <Checkbox
                  colorScheme="purple"
                  isChecked={selectedIds.includes(row.employee_id)}
                  isDisabled={!selectable || busy}
                  onChange={(e) => onSelectChange(row.employee_id, e.target.checked)}
                  aria-label={`Select employee ${row.employee_id}`}
                />
              </Td>
              <Td>{row.employee_id}</Td>
              <Td>
                {row.employee_name}
                {row.resigned ? (
                  <Badge ml={2} colorScheme="orange" fontSize="0.6rem">
                    Resigned
                  </Badge>
                ) : null}
              </Td>
              <Td>{row.store_name || "—"}</Td>
              <Td>{row.designation_name || "—"}</Td>
              {/* The figure is shown exactly as the server sent it. A gross
                  that has not been approved is NOT zero - it is unknown, and
                  rendering it as 0 would read as "this person is paid nothing". */}
              <Td isNumeric>
                {row.monthly_gross === null || row.monthly_gross === undefined
                  ? "—"
                  : Number(row.monthly_gross).toLocaleString("en-IN")}
              </Td>
              <Td>
                <Badge colorScheme={STATUS_COLOR[row.status] || "gray"}>{row.status}</Badge>
              </Td>
              <Td>
                {/* CHANGEABLE ONLY ONCE THE MONTH IS INITIALIZED, because
                    before that there is no month-specific record to change -
                    the value shown is the default it WOULD start on. */}
                {row.initialized && canChangePayType ? (
                  <Select
                    size="xs"
                    width="90px"
                    value={row.pay_type}
                    isDisabled={busy}
                    onChange={(e) => onPayTypeChange(row.employee_id, e.target.value)}
                    aria-label={`Pay type for employee ${row.employee_id}`}
                  >
                    <option value="BANK">BANK</option>
                    <option value="CASH">CASH</option>
                  </Select>
                ) : (
                  <Tooltip
                    label={
                      row.initialized
                        ? "You do not have permission to change the pay type"
                        : "Defaulted from the Employee Master. It becomes changeable, for this month only, once initialized."
                    }
                  >
                    <Text fontSize="xs">{row.pay_type}</Text>
                  </Tooltip>
                )}
              </Td>
              <Td maxWidth="320px">
                <Text fontSize="xs" color="red.600" whiteSpace="normal">
                  {reasonText(row)}
                </Text>
                {(row.warnings || []).map((warning) => (
                  <Text key={warning.code} fontSize="xs" color="orange.600" whiteSpace="normal">
                    {warning.message}
                  </Text>
                ))}
              </Td>
              <Td>
                {row.initialized ? (
                  <Text fontSize="xs" color="gray.600">
                    {row.initialized_at || "Initialized"}
                  </Text>
                ) : (
                  <Button
                    size="xs"
                    colorScheme="purple"
                    isDisabled={!selectable || busy}
                    isLoading={busyEmployeeId === row.employee_id}
                    onClick={() => onInitialize(row.employee_id)}
                  >
                    Initialize
                  </Button>
                )}
              </Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
}

export default PayrunTable;
