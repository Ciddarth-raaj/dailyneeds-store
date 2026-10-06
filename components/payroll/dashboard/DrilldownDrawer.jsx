import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { formatINR } from "../../../util/payrollDashboard";

/**
 * THE EMPLOYEES BEHIND ONE NUMBER. Fetched from the server only when opened,
 * a page at a time, with the same month and filters the number came from -
 * so the list's total is always the card's own number.
 *
 * Each row opens that employee in the Payrun stage that owns them:
 * Initialization when not yet initialized, Calculation & Review otherwise.
 */
export default function DrilldownDrawer({ isOpen, onClose, title, subtitle, result, loading, error, onPage, hrefForRow, onNavigate }) {
  const rows = (result && result.rows) || [];
  const total = Number(result && result.total) || 0;
  const page = Number(result && result.page) || 1;
  const size = Number(result && result.page_size) || 50;
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = (page - 1) * size + rows.length;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="xl">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader pb={1}>
          <Text fontSize="md" color="#1B2A5B">
            {title}
          </Text>
          <Text fontSize="xs" color="gray.500" fontWeight="400">
            {subtitle} · {total} {total === 1 ? "employee" : "employees"}
            {result && result.totals && result.totals.costed_employees ? ` · Gross ${formatINR(result.totals.gross)} · Net ${formatINR(result.totals.net)}` : ""}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          {error ? (
            <Alert status="error" fontSize="sm" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : loading && !result ? (
            <Flex align="center" gap={2} py={6} justify="center">
              <Spinner size="sm" />
              <Text fontSize="sm">Loading employees…</Text>
            </Flex>
          ) : rows.length === 0 ? (
            <Text fontSize="sm" color="gray.500" py={6} textAlign="center">
              No employees.
            </Text>
          ) : (
            <Box overflowX="auto" opacity={loading ? 0.6 : 1}>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Employee</Th>
                    <Th>Location / Dept / Designation</Th>
                    <Th>Status</Th>
                    <Th isNumeric>Gross</Th>
                    <Th isNumeric>Deductions</Th>
                    <Th isNumeric>Net</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((r) => {
                    const href = hrefForRow(r);
                    return (
                      <Tr key={r.employee_id}>
                        <Td>
                          <Text fontSize="sm" fontWeight="600">
                            {r.employee_name}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            #{r.employee_id}
                            {r.employment_type ? ` · ${r.employment_type}` : ""}
                          </Text>
                        </Td>
                        <Td fontSize="xs" color="gray.700">
                          {[r.location, r.department, r.designation].filter(Boolean).join(" · ") || "—"}
                        </Td>
                        <Td>
                          <Badge colorScheme={r.initialized ? "purple" : "orange"} fontSize="10px" whiteSpace="normal">
                            {r.status_label}
                          </Badge>
                          {r.reasons && r.reasons.length ? (
                            <Text fontSize="10px" color="red.600" mt={1} noOfLines={2} title={r.reasons.join(", ")}>
                              {r.reasons.join(" · ")}
                            </Text>
                          ) : null}
                        </Td>
                        <Td isNumeric fontSize="sm">{r.gross === null ? "—" : formatINR(r.gross)}</Td>
                        <Td isNumeric fontSize="sm">{r.deductions === null ? "—" : formatINR(r.deductions)}</Td>
                        <Td isNumeric fontSize="sm" color={r.net !== null && Number(r.net) < 0 ? "red.600" : undefined}>
                          {r.net === null ? "—" : formatINR(r.net)}
                        </Td>
                        <Td>
                          <Button
                            as="a"
                            href={href}
                            size="xs"
                            variant="ghost"
                            colorScheme="purple"
                            onClick={(e) => {
                              e.preventDefault();
                              onNavigate(href);
                            }}
                          >
                            Open
                          </Button>
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
          )}
        </DrawerBody>
        <DrawerFooter justifyContent="space-between">
          <Text fontSize="xs" color="gray.500">
            {total ? `Showing ${from}–${to} of ${total}` : ""}
          </Text>
          <Flex gap={2}>
            <Button size="sm" variant="outline" isDisabled={loading || page <= 1} onClick={() => onPage(page - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" isDisabled={loading || to >= total} onClick={() => onPage(page + 1)}>
              Next
            </Button>
          </Flex>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
