import React from "react";
import {
  Badge,
  Box,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { formatMoney, formatEffectiveFrom, presentCurrentSalary } from "../../util/salaryView";
import { flattenPreview } from "../../util/salaryPreviewView";
import { typeLabel } from "../../util/bulkSalaryUpload";

/**
 * M5 — the two tables a bulk upload produces: what will be created, and what
 * was refused.
 *
 * EVERY FIGURE IN EITHER TABLE CAME FROM THE SERVER. The valid rows carry the
 * breakup, the contributions and the CTC that
 * `usecase/salary_bulk_upload.js` priced with the same engine that will fill
 * the record; the invalid rows carry the sentence the server wrote. Nothing is
 * calculated, classified or reworded here.
 *
 * THE CELLS GO THROUGH THE SHARED PRESENTER. `util/salaryView.js` is what
 * decides that an unresolved contribution reads "Pending" with its reason and
 * never ₹0.00 - the same rule on this table as on the Employee Master card and
 * the approval queue. A hundred rows of a fake zero would be a hundred wrong
 * answers about what an employer owes.
 *
 * THE INVALID TABLE SHOWS THE ORIGINAL THREE COLUMNS AND THE REASON, and that
 * is deliberately all of it: a refused row was never priced, and the file
 * somebody downloads to correct is the same three columns plus the reason.
 */

/** One priced figure from a row's `calculated` block. Pending stays Pending. */
function Figure({ cell }) {
  if (!cell) return <Text fontSize="xs">—</Text>;
  const tone =
    cell.kind === "pending" ? "orange.600" : cell.kind === "not_applicable" ? "gray.500" : "gray.800";
  return (
    <Text fontSize="xs" color={tone} whiteSpace="nowrap">
      {cell.text}
    </Text>
  );
}

/**
 * The priced view of one validated row.
 *
 * `calculated` is the engine's own shape and a stored record is flat, so it
 * goes through `flattenPreview` first - the same rename the Payroll preview
 * uses, so both screens read one presenter and cannot describe a figure
 * differently.
 */
function viewOf(row) {
  if (!row || !row.calculated) return null;
  return presentCurrentSalary(flattenPreview(row.calculated));
}

/** Everything that will be created, one row per employee. */
export function ValidRowsTable({ rows = [] }) {
  if (rows.length === 0) return null;

  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th fontSize="9px">Employee ID</Th>
            <Th fontSize="9px">Employee Name</Th>
            <Th fontSize="9px">Type</Th>
            <Th fontSize="9px" isNumeric>
              Monthly Gross
            </Th>
            <Th fontSize="9px">Effective From</Th>
            <Th fontSize="9px" isNumeric>
              Basic
            </Th>
            <Th fontSize="9px" isNumeric>
              Conveyance
            </Th>
            <Th fontSize="9px" isNumeric>
              HRA
            </Th>
            <Th fontSize="9px" isNumeric>
              Special Allowance
            </Th>
            <Th fontSize="9px" isNumeric>
              Employee PF
            </Th>
            <Th fontSize="9px" isNumeric>
              Employee ESI
            </Th>
            <Th fontSize="9px">Employer Contributions</Th>
            <Th fontSize="9px" isNumeric>
              Monthly CTC
            </Th>
            <Th fontSize="9px">Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => {
            const view = viewOf(row);
            const structure = (view && view.structure) || [];
            const deductions = (view && view.employeeDeductions) || [];
            const employer = (view && view.employerContributions) || [];
            const cellAt = (list, index) => (list[index] ? list[index].cell : null);

            return (
              <Tr key={`${row.row_number}-${row.employee_id}`}>
                <Td fontSize="xs">{row.employee_id}</Td>
                <Td fontSize="xs">{row.employee_name || "not recorded"}</Td>
                <Td>
                  <Badge
                    colorScheme={row.type === "OPENING_SALARY" ? "blue" : "purple"}
                    fontSize="9px"
                  >
                    {typeLabel(row.type)}
                  </Badge>
                </Td>
                <Td isNumeric fontSize="xs" fontWeight="bold" whiteSpace="nowrap">
                  {formatMoney(row.calculated && row.calculated.monthly_gross)}
                </Td>
                <Td fontSize="xs" whiteSpace="nowrap">
                  {/* The date the SERVER resolved. For an opening salary that
                      is the rule's date, which the file had to match. */}
                  {formatEffectiveFrom(row.resolved_effective_from)}
                </Td>
                <Td isNumeric>
                  <Figure cell={cellAt(structure, 0)} />
                </Td>
                <Td isNumeric>
                  <Figure cell={cellAt(structure, 1)} />
                </Td>
                <Td isNumeric>
                  <Figure cell={cellAt(structure, 2)} />
                </Td>
                <Td isNumeric>
                  <Figure cell={cellAt(structure, 3)} />
                </Td>
                <Td isNumeric>
                  <Figure cell={cellAt(deductions, 0)} />
                </Td>
                <Td isNumeric>
                  <Figure cell={cellAt(deductions, 1)} />
                </Td>
                <Td>
                  {/* All five, labelled and stacked rather than one total: EPS
                      is the one that goes Pending on its own, and a single
                      summed column would hide which part nobody could resolve. */}
                  {employer.map((item) => (
                    <Text key={item.label} fontSize="10px" color="gray.600" whiteSpace="nowrap">
                      {item.label}:{" "}
                      <Text
                        as="span"
                        color={item.cell && item.cell.kind === "pending" ? "orange.600" : "gray.800"}
                      >
                        {item.cell ? item.cell.text : "—"}
                      </Text>
                    </Text>
                  ))}
                </Td>
                <Td isNumeric>
                  <Figure cell={view ? view.ctc : null} />
                </Td>
                <Td>
                  {/* ALWAYS PENDING. Nothing a bulk upload creates is approved,
                      including for an administrator. */}
                  <Badge colorScheme="orange" fontSize="9px">
                    {row.status_to_be_created || "PENDING"}
                  </Badge>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}

/**
 * The refused rows: the three original columns, and the reason.
 *
 * `showRowNumber` IS OFF AFTER A SUBMIT, AND THAT IS NOT A TIDY-UP. A row
 * number counts positions in the list that was SENT, and submit sends only the
 * rows that passed validation - so after a submit the numbers no longer line up
 * with the lines in the file somebody is looking at. Printing them anyway would
 * point at the wrong row of a spreadsheet, which is worse than not pointing at
 * one: the Employee ID identifies the row unambiguously either way.
 */
export function InvalidRowsTable({ rows = [], showRowNumber = true }) {
  if (rows.length === 0) return null;

  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            {showRowNumber ? <Th fontSize="9px">Row</Th> : null}
            <Th fontSize="9px">Employee ID</Th>
            <Th fontSize="9px">Monthly Gross Salary</Th>
            <Th fontSize="9px">Effective From</Th>
            <Th fontSize="9px">Error Reason</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row, index) => (
            <Tr key={`${row.row_number}-${index}`}>
              {showRowNumber ? <Td fontSize="xs">{row.row_number}</Td> : null}
              {/* The ORIGINAL cells, exactly as the file had them. */}
              <Td fontSize="xs">{row.employee_id || "—"}</Td>
              <Td fontSize="xs">{row.monthly_gross || "—"}</Td>
              <Td fontSize="xs">{row.effective_from || "—"}</Td>
              <Td fontSize="xs" color="red.600">
                {row.error_reason || "Invalid row"}
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default ValidRowsTable;
