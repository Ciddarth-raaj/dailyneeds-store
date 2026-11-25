import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import {
  BLOCK_REASONS,
  OTHER_REASON,
  assignedShiftLabel,
  displayDate,
} from "../../util/attendanceShiftChangeEligibility";

/**
 * MARK NOT ELIGIBLE / BLOCK FURTHER REQUESTS / REMOVE BLOCK.
 *
 * ONE MODAL FOR BOTH DIRECTIONS, because the decision either way needs the
 * same three things on screen: WHO, WHICH DAY, and WHAT THAT DAY LOOKED LIKE.
 * HR is deciding whether a long day was genuine, and the assigned shift beside
 * the worked and extra hours is the whole evidence for that - a modal that
 * asked for a reason without showing them would be asking somebody to decide
 * from memory.
 *
 * THE REASON IS MANDATORY, in both directions and on the server as well.
 * A block nobody explained cannot be reviewed later, and "Other" deliberately
 * does not let somebody skip the explanation: choosing it reveals a free-text
 * box that must be filled. The suggestions are suggestions - the server takes
 * any text of at least five characters.
 *
 * IT DECIDES NOTHING. The button that opened it was chosen from values the
 * server sent, and pressing Confirm asks the server, which re-decides from
 * live facts and may still refuse - a month may have closed, or somebody may
 * have raised a request, since the row was drawn. The refusal is surfaced
 * here rather than swallowed.
 */
export default function ShiftChangeBlockModal({
  isOpen,
  mode, // "BLOCK" | "UNBLOCK"
  row,
  busy = false,
  error = null,
  onCancel,
  onConfirm,
}) {
  const blocking = mode === "BLOCK";
  const [choice, setChoice] = useState(BLOCK_REASONS[0]);
  const [other, setOther] = useState("");
  const [removalReason, setRemovalReason] = useState("");

  // The subject of this dialog, as one statically checkable value - the row
  // identity rather than the row object, so reopening on the same employee and
  // date does not reset a half-typed reason while switching rows does.
  const subject = row ? `${row.employee_id}:${row.attendance_date}` : null;

  // A fresh decision every time it opens: a reason typed for one employee must
  // never be left sitting in the box for the next one.
  useEffect(() => {
    if (!isOpen) return;
    setChoice(BLOCK_REASONS[0]);
    setOther("");
    setRemovalReason("");
  }, [isOpen, subject]);

  /** What will actually be sent. "Other" carries the typed text, never the word. */
  const reason = useMemo(() => {
    if (!blocking) return removalReason.trim();
    return (choice === OTHER_REASON ? other : choice).trim();
  }, [blocking, choice, other, removalReason]);

  const tooShort = reason.length < 5;

  if (!row) return null;

  const title = blocking
    ? row.request_status === "Rejected"
      ? "Block Further Requests"
      : "Mark Not Eligible"
    : "Remove Block";

  return (
    <Modal isOpen={isOpen} onClose={onCancel} size="lg" closeOnOverlayClick={!busy}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">{title}</ModalHeader>
        <ModalCloseButton isDisabled={busy} />
        <ModalBody>
          <Stack spacing={4}>
            {/* THE EVIDENCE, so the decision is made from the day itself. */}
            <SimpleGrid columns={2} spacing={3} fontSize="sm">
              <Text color="gray.500">Employee</Text>
              <Text fontWeight="600">
                {row.employee_name} ({row.employee_id})
              </Text>
              <Text color="gray.500">Date</Text>
              <Text fontWeight="600">{displayDate(row.attendance_date)}</Text>
              <Text color="gray.500">Assigned Shift</Text>
              <Text fontWeight="600">{assignedShiftLabel(row) || "-"}</Text>
              <Text color="gray.500">Worked Hours</Text>
              <Text fontWeight="600">{row.worked_hours}</Text>
              <Text color="gray.500">Extra Hours</Text>
              <Text fontWeight="600">{row.extra_hours}</Text>
            </SimpleGrid>

            {/* WHAT IS ALREADY RECORDED, when removing. */}
            {!blocking ? (
              <Alert status="warning" fontSize="sm">
                <AlertIcon />
                <Stack spacing={0}>
                  <Text>
                    Blocked by {row.hr_blocked_by || "-"} on {row.hr_blocked_at || "-"}
                  </Text>
                  <Text color="gray.600">Reason: {row.hr_block_reason || "-"}</Text>
                </Stack>
              </Alert>
            ) : null}

            {blocking ? (
              <>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Reason for blocking</FormLabel>
                  <Select size="sm" value={choice} onChange={(e) => setChoice(e.target.value)}>
                    {BLOCK_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                {choice === OTHER_REASON ? (
                  <FormControl isRequired>
                    <FormLabel fontSize="sm">Please explain</FormLabel>
                    <Textarea
                      size="sm"
                      rows={3}
                      value={other}
                      placeholder="Why is this date not eligible?"
                      onChange={(e) => setOther(e.target.value)}
                    />
                  </FormControl>
                ) : null}
                <Text fontSize="xs" color="gray.500">
                  The employee will not be able to raise a shift change request for this date, and
                  will be shown this reason. It does not change any existing request.
                </Text>
              </>
            ) : (
              <>
                <FormControl isRequired>
                  <FormLabel fontSize="sm">Reason for removing the block</FormLabel>
                  <Textarea
                    size="sm"
                    rows={3}
                    value={removalReason}
                    placeholder="Why is this date eligible again?"
                    onChange={(e) => setRemovalReason(e.target.value)}
                  />
                </FormControl>
                <Text fontSize="xs" color="gray.500">
                  Removing the block only lifts HR&apos;s decision. The employee may raise a request
                  again only if the normal rules still allow it, and no previous request is changed.
                </Text>
              </>
            )}

            {error ? (
              <Alert status="error" fontSize="sm">
                <AlertIcon />
                {error}
              </Alert>
            ) : null}
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" variant="ghost" mr={3} onClick={onCancel} isDisabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            colorScheme={blocking ? "red" : "purple"}
            isLoading={busy}
            isDisabled={tooShort}
            onClick={() => onConfirm(reason)}
          >
            {blocking ? "Confirm block" : "Remove block"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
