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
 * The employee list behind a NOW figure.
 *
 * It is built from the snapshot the cards were computed from, not from a
 * second request - so the list and the number are the same as-of answer by
 * construction, and no later arrival can make them disagree mid-read. The
 * snapshot's own `as_of` is shown so it is clear which moment is described.
 */
export default function StaffingListModal({ list, asOf, isOpen, onClose, onOpenEmployee }) {
  const rows = (list && list.rows) || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md" color="#1B2A5B" pb={1}>
          {list ? list.title : "Employees"}
          <Text fontSize="xs" color="gray.500" fontWeight="400">
            {rows.length} {rows.length === 1 ? "employee" : "employees"} · as of {asOf}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pt={2}>
          {rows.length === 0 ? (
            <Flex minH="120px" align="center" justify="center">
              <Text fontSize="sm" color="gray.500">
                Nobody in this group right now.
              </Text>
            </Flex>
          ) : (
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
                            {r.outlet_name} · {r.designation_name}
                          </Text>
                        </Td>
                        <Td fontSize="xs" whiteSpace="nowrap">
                          {r.scheduled_start}–{r.scheduled_end}
                          <Text fontSize="9px" color="gray.500">
                            {r.shift_code || "—"}
                          </Text>
                        </Td>
                        <Td fontSize="xs">
                          {r.gap_class === "COVERED" ? (
                            <Badge colorScheme="green" fontSize="9px">
                              IN since {r.recorded_since || "—"}
                            </Badge>
                          ) : (
                            <Badge
                              fontSize="9px"
                              bg={tone((reason && reason.color) || "gray").bg}
                              color={tone((reason && reason.color) || "gray").fg}
                              borderWidth="1px"
                              borderColor={tone((reason && reason.color) || "gray").border}
                            >
                              {(reason && reason.label) || r.gap_label}
                            </Badge>
                          )}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
              <Text fontSize="10px" color="gray.500" mt={2}>
                Recorded IN means a punch opened a session as of this moment — not that somebody is
                at a counter or not on a break.
              </Text>
            </Box>
          )}
        </ModalBody>
        <ModalFooter pt={2}>
          <Button size="xs" colorScheme="purple" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
