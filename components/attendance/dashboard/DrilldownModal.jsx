import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { bucketTitle, clock, displayDate } from "../../../util/attendanceDashboard";

/**
 * The drilldown behind every card, slice and issue.
 *
 * THE LIST IS THE SERVER'S, NOT A CLIENT-SIDE FILTER. It is fetched from
 * `/attendance/dashboard/drilldown` with the SAME date and filters the cards
 * were built from, and the server re-derives the population through the same
 * code path - so this list can never show somebody the card did not count, and
 * the header's total is the card's own number.
 *
 * PAGINATED. The endpoint caps a page and reports the full total, so a
 * thousand-employee bucket is a page at a time rather than one enormous
 * response.
 *
 * EACH ROW LINKS TO THE EMPLOYEE'S EXISTING MONTHLY SCREEN for this date,
 * which is where the day detail, the punches, Edit Shift and Void Punch
 * already live. The dashboard does not reimplement any of that.
 */
export default function DrilldownModal({
  isOpen,
  onClose,
  bucket,
  attendanceDate,
  result,
  loading,
  error,
  onPage,
  onOpenEmployee,
}) {
  const rows = (result && result.employees) || [];
  const total = Number(result && result.total) || 0;
  const limit = Number(result && result.limit) || 50;
  const offset = Number(result && result.offset) || 0;
  const shown = rows.length;
  const hasPrev = offset > 0;
  const hasNext = offset + shown < total;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md" color="#1B2A5B" pb={1}>
          {bucketTitle(bucket)}
          <Text fontSize="xs" color="gray.500" fontWeight="400">
            {displayDate(attendanceDate)} · {total} {total === 1 ? "employee" : "employees"}
            {total > shown ? ` · showing ${offset + 1}–${offset + shown}` : ""}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pt={2}>
          {error ? (
            <Alert status="error" fontSize="sm" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : loading ? (
            <Flex minH="140px" align="center" justify="center">
              <Spinner color="purple.500" />
            </Flex>
          ) : rows.length === 0 ? (
            <Flex minH="120px" align="center" justify="center">
              <Text fontSize="sm" color="gray.500">
                No employees in this group for the selected date and filters.
              </Text>
            </Flex>
          ) : (
            <Box overflowX="auto">
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th fontSize="10px">Employee</Th>
                    <Th fontSize="10px">Location</Th>
                    <Th fontSize="10px">Shift</Th>
                    <Th fontSize="10px">Punches</Th>
                    <Th fontSize="10px">Status</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((e) => (
                    <Tr
                      key={e.employee_id}
                      _hover={{ bg: "gray.50", cursor: "pointer" }}
                      onClick={() => onOpenEmployee(e)}
                      title="Open this employee's attendance for the date"
                    >
                      <Td fontSize="xs">
                        <Text noOfLines={1}>{e.employee_name}</Text>
                        <Text fontSize="9px" color="gray.500">
                          #{e.employee_id}
                          {e.designation_name ? ` · ${e.designation_name}` : ""}
                        </Text>
                      </Td>
                      <Td fontSize="xs" maxW="120px">
                        <Text noOfLines={1}>{e.outlet_name || "—"}</Text>
                      </Td>
                      <Td fontSize="xs" maxW="110px">
                        <Text noOfLines={1}>{e.shift_code || e.shift_name || "—"}</Text>
                      </Td>
                      <Td fontSize="xs" whiteSpace="nowrap">
                        {e.punch_count > 0 ? (
                          <>
                            <Text>{clock(e.first_punch)}</Text>
                            {e.punch_count > 1 ? (
                              <Text fontSize="9px" color="gray.500">
                                last {clock(e.last_punch)} · {e.punch_count} punches
                              </Text>
                            ) : (
                              <Text fontSize="9px" color="gray.500">
                                1 punch
                              </Text>
                            )}
                          </>
                        ) : (
                          <Text color="gray.400">none</Text>
                        )}
                      </Td>
                      <Td fontSize="xs">
                        {e.issue_label ? (
                          <Badge
                            colorScheme={
                              e.issue_key === "ABSENT" || e.issue_key === "MISSING_PUNCH"
                                ? "red"
                                : e.issue_key === "REGULARIZATION_PENDING"
                                ? "orange"
                                : "gray"
                            }
                            fontSize="9px"
                          >
                            {e.issue_label}
                          </Badge>
                        ) : e.punch_count > 0 ? (
                          <Badge colorScheme="green" fontSize="9px">
                            Checked in
                          </Badge>
                        ) : (
                          <Text color="gray.400">—</Text>
                        )}
                        {e.ot_request_pending ? (
                          <Badge colorScheme="purple" fontSize="9px" ml={1}>
                            OT pending
                          </Badge>
                        ) : null}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </ModalBody>
        <ModalFooter pt={2} gap={2}>
          {hasPrev || hasNext ? (
            <>
              <Button
                size="xs"
                variant="outline"
                onClick={() => onPage(Math.max(0, offset - limit))}
                isDisabled={!hasPrev || loading}
              >
                Previous
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => onPage(offset + limit)}
                isDisabled={!hasNext || loading}
              >
                Next
              </Button>
            </>
          ) : null}
          <Button size="xs" colorScheme="purple" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
