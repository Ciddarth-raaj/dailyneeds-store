import React from "react";
import { Badge, Box, Button, Checkbox, Flex, SimpleGrid, Stack, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import { approverCell } from "../../../util/attendanceApproverSetup";

/**
 * The setup list. Desktop: one compact table -
 *   Select | Emp Code | Employee | Store | Designation | First Level Approver | Second Level Approver | Final Approver | (Edit)
 * Mobile: one card per employee with the same fields. The three approver
 * columns are always present, blank levels shown as a dash, so who the final
 * authority is can be read straight down the last column.
 */
const COLUMNS = ["Select", "Emp Code", "Employee", "Store", "Designation", "First Level Approver", "Second Level Approver", "Final Approver", ""];

function ApproverText({ row, keyName }) {
  const active = row[keyName.replace("_employee_id", "_active")];
  const text = approverCell(row, keyName);
  return (
    <Text as="span" fontSize="xs" color={text === "—" ? "gray.400" : undefined}>
      {text}
      {active === false ? <Badge ml={1} colorScheme="red" fontSize="9px">inactive</Badge> : null}
    </Text>
  );
}

export default function ApproverSetupTable({ rows, selectedIds, onToggle, onToggleAll, onEdit, isMobile, loading }) {
  const allTicked = rows.length > 0 && rows.every((r) => selectedIds.includes(r.employee_id));
  if (loading) return <Text fontSize="sm" color="gray.500">Loading employees…</Text>;
  if (!rows.length) return <Text fontSize="sm" color="gray.600">No employees match these filters.</Text>;

  if (isMobile) {
    return (
      <Stack spacing={2}>
        <Checkbox size="sm" isChecked={allTicked} isIndeterminate={selectedIds.length > 0 && !allTicked} onChange={onToggleAll}>Select all shown</Checkbox>
        {rows.map((row) => (
          <Box key={row.employee_id} borderWidth="1px" borderRadius="md" p={3} data-testid="approver-card">
            <Flex justify="space-between" align="flex-start" gap={2}>
              <Checkbox size="sm" isChecked={selectedIds.includes(row.employee_id)} onChange={() => onToggle(row.employee_id)}>
                <Text fontSize="sm" fontWeight="600">{row.employee_name} <Text as="span" color="gray.500" fontWeight="400">· {row.employee_id}</Text></Text>
              </Checkbox>
              <Button size="xs" variant="outline" colorScheme="purple" onClick={() => onEdit(row)}>Edit</Button>
            </Flex>
            <Text fontSize="xs" color="gray.600" mt={1}>{[row.store_name, row.designation_name].filter(Boolean).join(" · ") || "—"}</Text>
            <SimpleGrid columns={1} spacing={1} mt={2}>
              {[["First Level Approver", "first_level_approver_employee_id"], ["Second Level Approver", "second_level_approver_employee_id"], ["Final Approver", "final_approver_employee_id"]].map(([label, key]) => (
                <Flex key={key} justify="space-between" gap={2}>
                  <Text fontSize="10px" color="gray.500" textTransform="uppercase">{label}</Text>
                  <ApproverText row={row} keyName={key} />
                </Flex>
              ))}
            </SimpleGrid>
            {!row.has_setup ? <Badge mt={2} colorScheme="gray" fontSize="9px">No setup — role-based fallback applies</Badge> : null}
          </Box>
        ))}
      </Stack>
    );
  }

  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead bg="gray.50">
          <Tr>
            {COLUMNS.map((c, i) => (
              <Th key={c || `col-${i}`} fontSize="10px" px={2}>
                {c === "Select" ? (
                  <Checkbox size="sm" isChecked={allTicked} isIndeterminate={selectedIds.length > 0 && !allTicked} onChange={onToggleAll} aria-label="Select all shown" />
                ) : c}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => (
            <Tr key={row.employee_id} bg={selectedIds.includes(row.employee_id) ? "purple.50" : undefined}>
              <Td px={2}><Checkbox size="sm" isChecked={selectedIds.includes(row.employee_id)} onChange={() => onToggle(row.employee_id)} aria-label={`Select ${row.employee_name}`} /></Td>
              <Td px={2} fontSize="xs" whiteSpace="nowrap">{row.employee_id}</Td>
              <Td px={2} fontSize="xs" fontWeight="600">{row.employee_name}{!row.has_setup ? <Badge ml={1} colorScheme="gray" fontSize="9px" title="No employee-level setup; the role-based chain applies">fallback</Badge> : null}</Td>
              <Td px={2} fontSize="xs">{row.store_name || "—"}</Td>
              <Td px={2} fontSize="xs">{row.designation_name || "—"}</Td>
              <Td px={2}><ApproverText row={row} keyName="first_level_approver_employee_id" /></Td>
              <Td px={2}><ApproverText row={row} keyName="second_level_approver_employee_id" /></Td>
              <Td px={2}><ApproverText row={row} keyName="final_approver_employee_id" /></Td>
              <Td px={2}><Button size="xs" variant="outline" colorScheme="purple" onClick={() => onEdit(row)}>Edit</Button></Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
