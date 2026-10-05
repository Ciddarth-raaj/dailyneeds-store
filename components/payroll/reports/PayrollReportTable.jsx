import React from "react";
import { Box, Button, HStack, Table, Tbody, Td, Text, Tfoot, Th, Thead, Tr } from "@chakra-ui/react";

/**
 * Payroll Reports - the table. Columns arrive from the server in exactly the
 * selected order; this renders them in that order and adds nothing.
 * Totals are over the WHOLE report (every page), computed by the server, and
 * are finalized totals. A payrun employee whose month is not approved &
 * locked is highlighted: in the report, figures blank, never dropped.
 */
const numeric = (c) => c.type === "amount" || c.type === "number";

const show = (column, value) => {
  if (value === null || value === undefined || value === "") return "";
  if (column.type === "amount" && Number.isFinite(Number(value))) {
    return Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
};

function PayrollReportTable({ preview, onPage, loading }) {
  if (!preview) return null;
  const { columns, rows, totals, page, page_size: pageSize, matching_count: total } = preview;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Box>
      <Box overflowX="auto" borderWidth="1px" borderRadius="8px" opacity={loading ? 0.6 : 1}>
        <Table size="sm" data-testid="payroll-report-table">
          <Thead bg="gray.50">
            <Tr>
              {columns.map((c) => (
                <Th key={c.key} isNumeric={numeric(c)} whiteSpace="nowrap">
                  {c.label}
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {rows.map((row, i) => {
              const status = (preview.row_status || [])[i];
              const pending = status && status.status !== "APPROVED_LOCKED" && status.status !== "PUBLISHED";
              return (
              <Tr
                key={`${row.employee_id || ""}-${i}`}
                bg={pending ? "orange.50" : undefined}
                title={pending ? status.label : undefined}
                data-finalized={pending ? "false" : "true"}
              >
                {columns.map((c) => (
                  <Td key={c.key} isNumeric={numeric(c)} whiteSpace="nowrap" fontSize="13px">
                    {show(c, row[c.key])}
                  </Td>
                ))}
              </Tr>
              );
            })}
            {rows.length === 0 ? (
              <Tr>
                <Td colSpan={columns.length}>
                  <Text fontSize="sm" color="gray.500">
                    No finalized payroll rows match this report.
                  </Text>
                </Td>
              </Tr>
            ) : null}
          </Tbody>
          {totals && rows.length > 0 ? (
            <Tfoot bg="gray.50">
              <Tr>
                {columns.map((c, i) => (
                  <Th key={c.key} isNumeric={numeric(c)} whiteSpace="nowrap">
                    {i === 0 ? "Total" : c.key in totals ? show(c, totals[c.key]) : ""}
                  </Th>
                ))}
              </Tr>
            </Tfoot>
          ) : null}
        </Table>
      </Box>
      <HStack justify="space-between" marginTop="8px" fontSize="sm">
        <Text color="gray.600">
          {total} employee{total === 1 ? "" : "s"} - page {page} of {pages}
        </Text>
        <HStack>
          <Button size="xs" isDisabled={page <= 1 || loading} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <Button size="xs" isDisabled={page >= pages || loading} onClick={() => onPage(page + 1)}>
            Next
          </Button>
        </HStack>
      </HStack>
    </Box>
  );
}

export default PayrollReportTable;
