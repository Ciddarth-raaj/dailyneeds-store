import React from "react";
import {
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
import { GAP_REASONS, tone } from "../../../util/attendanceDashboard";

const REASON = GAP_REASONS.reduce((acc, r) => {
  acc[r.key] = r;
  return acc;
}, {});

/**
 * The employee list behind a NOW figure, PAGED FROM THE SERVER.
 *
 * WHY IT IS NOT BUILT FROM THE SNAPSHOT ANY MORE. It used to be, and that was
 * only safe while the snapshot carried the whole population - which it never
 * did: the array was cut at 200 rows with no indication, so above 200 employees
 * a list showed fewer people than the card it was opened from and nothing said
 * why. The snapshot now sends previews, and the full list comes from the
 * drilldown endpoint, whose `total` is produced by the same classification as
 * the card. They cannot disagree.
 *
 * AND IT SHOWS ITS OWN MOMENT. The drilldown recomputes, so a list opened a
 * minute after the card was read describes a slightly later instant. Its own
 * `as_of` is displayed, and when it differs from the card's the difference is
 * stated rather than hidden - punches arriving between the two are the normal
 * case, not an error.
 */
export default function StaffingListModal({
  request,
  result,
  loading,
  error,
  cardAsOf,
  isOpen,
  onClose,
  onPage,
  onOpenEmployee,
}) {
  const rows = (result && result.rows) || [];
  const total = result ? result.total : 0;
  const limit = (result && result.limit) || 50;
  const offset = (result && result.offset) || 0;
  const asOf = (result && result.as_of) || cardAsOf;
  const drifted = !!(result && cardAsOf && result.as_of && result.as_of !== cardAsOf);
  const from = total === 0 ? 0 : offset + 1;
  const to = offset + rows.length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md" color="#1B2A5B" pb={1}>
          {request ? request.title : "Employees"}
          <Text fontSize="xs" color="gray.500" fontWeight="400">
            {total} {total === 1 ? "employee" : "employees"} · as of {asOf || "—"}
          </Text>
          {drifted ? (
            <Text fontSize="10px" color="gray.500" fontWeight="400">
              This list was read at {result.as_of}; the card was read at {cardAsOf}. Punches that
              arrived in between are included here.
            </Text>
          ) : null}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pt={2}>
          {loading ? (
            <Flex minH="120px" align="center" justify="center">
              <Spinner size="sm" color="purple.500" />
            </Flex>
          ) : error ? (
            <Flex minH="120px" align="center" justify="center">
              <Text fontSize="sm" color="red.500">
                {error}
              </Text>
            </Flex>
          ) : rows.length === 0 ? (
            <Flex minH="120px" align="center" justify="center">
              <Text fontSize="sm" color="gray.500">
                Nobody in this group right now.
              </Text>
            </Flex>
          ) : (
            <Box>
              <Box overflowX="auto">
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th fontSize="10px">Employee</Th>
                      <Th fontSize="10px">Location / role</Th>
                      <Th fontSize="10px">Scheduled</Th>
                      <Th fontSize="10px">Recorded</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {rows.map((r) => {
                      const reason = REASON[r.gap_class];
                      return (
                        <Tr
                          key={`${r.employee_id}-${r.attendance_date}`}
                          _hover={{ bg: "gray.50", cursor: "pointer" }}
                          onClick={() => onOpenEmployee(r)}
                        >
                          <Td fontSize="xs">
                            <Text noOfLines={1}>{r.employee_name}</Text>
                            <Text fontSize="9px" color="gray.500">
                              #{r.employee_id}
                            </Text>
                          </Td>
                          <Td fontSize="xs" maxW="150px">
                            <Text noOfLines={2} lineHeight="1.25">
                              {r.outlet_name || "No outlet on record"} ·{" "}
                              {r.designation_name || "No role on record"}
                            </Text>
                          </Td>
                          <Td fontSize="xs" whiteSpace="nowrap">
                            {r.scheduled_start ? `${r.scheduled_start}–${r.scheduled_end}` : "—"}
                            <Text fontSize="9px" color="gray.500">
                              {r.shift_code || "—"}
                            </Text>
                          </Td>
                          <Td fontSize="xs">
                            {r.gap_class === "COVERED" ? (
                              <Badge colorScheme="green" fontSize="9px">
                                IN since {r.recorded_since || "—"}
                              </Badge>
                            ) : r.gap_class ? (
                              <Badge
                                fontSize="9px"
                                bg={tone((reason && reason.color) || "gray").bg}
                                color={tone((reason && reason.color) || "gray").fg}
                                borderWidth="1px"
                                borderColor={tone((reason && reason.color) || "gray").border}
                              >
                                {(reason && reason.label) || r.gap_label}
                              </Badge>
                            ) : (
                              <Text fontSize="xs" color="gray.600">
                                {r.reason || r.recorded_since || "—"}
                              </Text>
                            )}
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
              <Text fontSize="10px" color="gray.500" mt={2}>
                Recorded IN means a punch opened a session as of this moment — not that somebody is
                at a counter or not on a break.
              </Text>
            </Box>
          )}
        </ModalBody>
        <ModalFooter pt={2} justifyContent="space-between">
          <Text fontSize="10px" color="gray.500">
            {total > 0 ? `Showing ${from}–${to} of ${total}` : ""}
          </Text>
          <Flex gap={2}>
            <Button
              size="xs"
              variant="outline"
              isDisabled={loading || offset === 0}
              onClick={() => onPage(Math.max(0, offset - limit))}
            >
              Previous
            </Button>
            <Button
              size="xs"
              variant="outline"
              isDisabled={loading || !(result && result.has_more)}
              onClick={() => onPage(offset + limit)}
            >
              Next
            </Button>
            <Button size="xs" colorScheme="purple" onClick={onClose}>
              Close
            </Button>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
