import React from "react";
import { Box, Table, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";
import {
  ExitedBadge,
  InitializeControl,
  PayTypeControl,
  SelectCheckbox,
  StatusBadge,
  AttendanceStatusBadge,
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
 * THE REASONS ARE BEHIND THE STATUS BADGE, IN FULL. They were a column of
 * their own, in full sentences, and it was the widest thing on the screen -
 * forty rows of explanatory prose for a list somebody is scanning. A BLOCKED
 * badge now says how many there are and opens them on a click. Nothing is
 * dropped or summarised, and no rule changed.
 *
 * THERE IS NO APPROVED MONTHLY GROSS COLUMN. Initialization is about whether a
 * month can be taken, not what it is worth; the figure belongs on the
 * calculation screen. The API still sends it.
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
  onOpenAttendance,
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
            {/* NO Approved Monthly Gross, and NO Blocking Reasons column. The
                gross belongs on the calculation screen; the reasons are behind
                the Status badge, in full. Both are presentation decisions - the
                server still sends every one of those values. */}
            <Th>Status</Th>
            {/* THE ATTENDANCE DIMENSION, beside the payrun one rather than
                folded into it: an employee can be Initialized AND attendance
                pending, and one badge could only say one of those. */}
            <Th>Attendance</Th>
            <Th>Pay Type</Th>
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
                <Td>
                  <StatusBadge row={row} />
                </Td>
                <Td>
                  <AttendanceStatusBadge row={row} onOpen={onOpenAttendance} />
                </Td>
                <Td>
                  <PayTypeControl
                    row={row}
                    canChangePayType={canChangePayType}
                    busy={busy}
                    onPayTypeChange={onPayTypeChange}
                  />
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
