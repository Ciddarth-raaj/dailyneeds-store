import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
} from "@chakra-ui/react";

import {
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_LABEL,
  ATTENDANCE_STATUS_SCHEME,
  heldDateLink,
  unresolvedLink,
} from "../../util/payrunTabs";

/**
 * WHY THIS EMPLOYEE'S ATTENDANCE IS NOT READY, and where to go and fix it.
 *
 * THE FAILURE IT EXISTS TO PREVENT: somebody works a whole month, calculates
 * it, and discovers at Approve & Lock that attendance was never settled - at
 * which point they have to work out WHICH of four different things is wrong
 * and which of three screens settles it. All of that is knowable at
 * Initialization, so it is said there.
 *
 * IT RECOMPUTES NOTHING AND DECIDES NOTHING. Every line below is an item the
 * server put on the row, with the server's own words; this file turns each
 * into a link to the screen that can actually settle it.
 *
 * THE LINKS GO TO SCREENS THAT ALREADY EXIST. A held date deep-links to
 * `/attendance/calculated` with the employee and the date, which that page
 * already understands; a pending regularization and a pending OT go to their
 * own approval queues, unchanged and unfiltered - getting somebody to the
 * right screen is the whole job here.
 */
function AttendancePendingDrawer({ isOpen, onClose, row, onCloseForPayroll, canClose, busy }) {
  if (!row) return null;

  const status = row.attendance_status;
  const items = row.attendance_unresolved || [];
  const closed = status === ATTENDANCE_STATUS.CLOSED_FOR_PAYROLL;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">
          {row.employee_name}
          <Badge ml={2} colorScheme={ATTENDANCE_STATUS_SCHEME[status] || "gray"}>
            {ATTENDANCE_STATUS_LABEL[status] || status}
          </Badge>
          <Text fontSize="xs" color="gray.500" fontWeight="normal" mt={1}>
            {row.employee_id} · {row.store_name || "—"}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Stack spacing={4}>
            {/*
              A CLOSED EMPLOYEE STILL SHOWS EVERY UNRESOLVED ITEM. They did not
              go away - they were ACCEPTED - and the person approving the month
              is entitled to see exactly what was accepted on their behalf.
            */}
            {closed ? (
              <Alert status="info" fontSize="sm">
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Attendance was closed for payroll.</Text>
                  <Text fontSize="xs">
                    Payroll accepted the attendance below as the basis for this month
                    {row.attendance_closed_at ? ` on ${row.attendance_closed_at}` : ""}. The items
                    are still open in their own queues and were not approved or rejected.
                  </Text>
                </Box>
              </Alert>
            ) : null}

            {items.length === 0 ? (
              <Text fontSize="sm" color="gray.600">
                Nothing about this employee&rsquo;s attendance is outstanding.
              </Text>
            ) : null}

            {items.map((item) => {
              const link = unresolvedLink(item, { employee_id: row.employee_id });
              const dates = Array.isArray(item.dates) ? item.dates : [];
              return (
                <Box key={item.code}>
                  <Stack direction="row" justify="space-between" align="baseline">
                    <Text fontSize="sm" fontWeight="medium">
                      {item.label}
                    </Text>
                    <Badge colorScheme="orange">{item.count}</Badge>
                  </Stack>
                  <Text fontSize="xs" color="gray.600" whiteSpace="normal">
                    {item.message}
                  </Text>

                  {/* THE DATES THEMSELVES, each its own link. The engine stored
                      which dates it held out, so nobody has to go hunting. */}
                  {dates.length > 0 ? (
                    <Stack direction="row" spacing={2} mt={1} flexWrap="wrap">
                      {dates.map((date) => (
                        <Link
                          key={date}
                          href={heldDateLink(row.employee_id, date)}
                          fontSize="xs"
                          color="purple.600"
                          textDecoration="underline"
                        >
                          {date}
                        </Link>
                      ))}
                    </Stack>
                  ) : link ? (
                    <Link href={link} fontSize="xs" color="purple.600" textDecoration="underline">
                      Open the screen that settles this
                    </Link>
                  ) : null}
                  <Divider mt={3} />
                </Box>
              );
            })}

            {/*
              THE CLOSE, OFFERED ONLY WHERE IT WOULD DO SOMETHING AND ONLY TO
              SOMEBODY WHO MAY. The server refuses it either way - this is the
              affordance, never the authorization.
            */}
            {row.attendance_closeable && canClose ? (
              <Button
                colorScheme="blue"
                size="sm"
                isLoading={busy}
                onClick={() => onCloseForPayroll(row)}
              >
                Close Attendance for Payroll
              </Button>
            ) : null}
            {row.attendance_closeable && !canClose ? (
              <Text fontSize="xs" color="gray.500">
                You do not have permission to close attendance for payroll.
              </Text>
            ) : null}
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

export default AttendancePendingDrawer;
