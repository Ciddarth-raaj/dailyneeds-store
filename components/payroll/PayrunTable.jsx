import React from "react";
import { Box, Table, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";
import {
  ExitedBadge,
  InitializeControl,
  PayTypeControl,
  ReasonsBlock,
  SelectCheckbox,
  StatusBadge,
  grossText,
  rowIsBusy,
  rowIsSelectable,
} from "./payrunPresentation";

/**
 * Payrun Initialization - the month's employees, one row each. THE DESKTOP
 * LAYOUT; the phone gets `PayrunEmployeeCard`, and `PayrunEmployeeList`
 * chooses between them.
 *
 * IT DECIDES NOTHING AND CALCULATES NOTHING. Every cell is a value the server
 * sent: the status, the blocking reasons, the gross, the pay type. The cells
 * themselves come from `payrunPresentation.jsx` - shared with the card - so a
 * row and a card can never disagree about a figure or about whether a row may
 * be acted on.
 *
 * A BLOCKED ROW CANNOT BE TICKED OR INITIALIZED, and it says why rather than
 * merely being greyed out: a disabled control with no explanation sends
 * somebody to ask a colleague what is wrong with a record they are looking at.
 *
 * THE REASONS ARE SHOWN IN FULL. They are short, there are rarely more than
 * two, and hiding them behind an icon would defeat the point of the screen -
 * which is to tell a payroll clerk exactly what is outstanding.
 *
 * THE COLUMNS ARE UNCHANGED by the responsive work: same ten, same order, same
 * behaviour. `overflowX` on the wrapper is the one addition, so that a narrow
 * LAPTOP - which still gets this layout - scrolls the table rather than
 * bursting the page width.
 */
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
    <Box overflowX="auto">
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
            const selectable = rowIsSelectable(row, canInitialize);
            const busy = rowIsBusy(row, busyEmployeeId, disabled);
            return (
              <Tr key={row.employee_id}>
                <Td>
                  <SelectCheckbox
                    row={row}
                    selectable={selectable}
                    busy={busy}
                    selectedIds={selectedIds}
                    onSelectChange={onSelectChange}
                  />
                </Td>
                <Td>{row.employee_id}</Td>
                <Td>
                  {row.employee_name}
                  <ExitedBadge row={row} />
                </Td>
                <Td>{row.store_name || "—"}</Td>
                <Td>{row.designation_name || "—"}</Td>
                <Td isNumeric>{grossText(row)}</Td>
                <Td>
                  <StatusBadge row={row} />
                </Td>
                <Td>
                  <PayTypeControl
                    row={row}
                    canChangePayType={canChangePayType}
                    busy={busy}
                    onPayTypeChange={onPayTypeChange}
                  />
                </Td>
                <Td maxWidth="320px">
                  <ReasonsBlock row={row} />
                </Td>
                <Td>
                  <InitializeControl
                    row={row}
                    selectable={selectable}
                    busy={busy}
                    busyEmployeeId={busyEmployeeId}
                    onInitialize={onInitialize}
                  />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}

export default PayrunTable;
