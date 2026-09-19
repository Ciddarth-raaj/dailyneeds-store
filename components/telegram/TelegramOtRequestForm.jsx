import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { positionalPunches, shiftLabel } from "../../util/attendanceV2";
import { displayDate, otCard, weekday } from "../../util/telegramAttendance";

/**
 * REQUEST OT for one date inside Telegram.
 *
 * ======================================== THE SAME SHAPE AS THE CORRECTION FORM
 *
 * Back link, the date, the shift, the read-only punches, then the field the
 * employee fills in and one Submit. `positionalPunches` and `shiftLabel` are
 * the same functions `TelegramRegularizationForm` and the web forms use, so
 * a punch reads identically everywhere.
 *
 * ===================================== THE DURATION IS NOT A FIELD ========
 *
 * There is exactly ONE input on this form, and it is the reason. The
 * Calculated OT is rendered as TEXT, from `candidate_ot_minutes` on the day
 * the server sent, and is labelled read-only; there is no number input, no
 * stepper and no time picker anywhere on this screen, so there is nothing
 * for an employee to type a duration into.
 *
 * That is not the protection, it is the presentation of it. The body this
 * submits is `{ attendance_date, reason }` and the API refuses any other
 * key with a 422; the server then RECALCULATES the date and stores its own
 * candidate, through the same `raiseOtRequest` the web app reaches. What is
 * shown here is a preview of the server's figure, never an input to it.
 *
 * ================================================= AND IT DECIDES NOTHING =
 *
 * `can_submit` and the blocking message are the server's answers carried
 * through `otCard`. The eligibility rules, the one-claim-per-date rule, the
 * open-correction refusal and the closed-period rule are all the engine's,
 * and its message is shown as it is rather than second-guessed here.
 */
export default function TelegramOtRequestForm({ day, saving, onSubmit, onBack }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);

  if (!day) return null;
  const card = otCard(day);
  const punches = positionalPunches(day);

  const submit = () => {
    setError(null);
    const trimmed = reason.trim();
    if (trimmed.length < 5) {
      setError("Enter a reason of at least 5 characters");
      return;
    }
    // TWO FIELDS. The day object is NOT spread: only these two names travel.
    onSubmit({ attendance_date: day.attendance_date, reason: trimmed }, (message) => setError(message));
  };

  return (
    <Stack spacing={5} pb={4}>
      <Box>
        <Button size="sm" variant="ghost" onClick={onBack} pl={0}>
          ← All OT dates
        </Button>
      </Box>

      <Box>
        <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
          Date
        </Text>
        <Text fontSize="lg" fontWeight="700">
          {displayDate(day.attendance_date)}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {weekday(day.attendance_date)}
        </Text>
      </Box>

      <Box>
        <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
          Shift
        </Text>
        <Text fontSize="sm" fontWeight="600">
          {shiftLabel(day)}
        </Text>
      </Box>

      <Box>
        <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={2}>
          Punches (read only)
        </Text>
        {punches.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            None
          </Text>
        ) : (
          <Stack spacing={2}>
            {punches.map((p) => (
              <Flex key={p.position} align="center" gap={3} fontSize="sm">
                <Badge
                  colorScheme={p.direction === "IN" ? "green" : "blue"}
                  borderRadius="full"
                  px={2}
                  fontSize="10px"
                >
                  {p.direction}
                </Badge>
                <Text fontWeight="600">{p.time}</Text>
                {p.regularized ? (
                  <Text fontSize="10px" color="gray.500">
                    Regularized
                  </Text>
                ) : null}
              </Flex>
            ))}
          </Stack>
        )}
      </Box>

      <SimpleGrid columns={2} spacing={3}>
        <Box>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            Worked
          </Text>
          <Text fontSize="sm" fontWeight="600">{card.worked}</Text>
        </Box>
        <Box>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            NRM
          </Text>
          <Text fontSize="sm" fontWeight="600">{card.nrm}</Text>
        </Box>
      </SimpleGrid>

      {/* THE CALCULATED FIGURE, AS TEXT. Not an input, and not editable. */}
      <Box borderWidth="1px" borderColor="blue.100" bg="blue.50" borderRadius="xl" px={4} py={3}>
        <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
          Calculated OT (read only)
        </Text>
        <Text fontSize="2xl" fontWeight="800" color="blue.700" fontFamily="mono">
          {card.eligible_ot}
        </Text>
        <Text fontSize="xs" color="gray.600">
          Calculated by the system from your punches and shift. It cannot be changed here.
        </Text>
      </Box>

      {card.can_submit ? (
        <>
          <FormControl isRequired>
            <FormLabel fontSize="sm">Reason</FormLabel>
            <Textarea
              size="md"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why were the extra hours worked?"
            />
          </FormControl>

          {error ? (
            <Alert status="error" fontSize="sm" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}

          <Button colorScheme="purple" size="lg" onClick={submit} isLoading={saving} w="100%">
            Submit
          </Button>
        </>
      ) : (
        <Alert status="info" fontSize="sm" borderRadius="md">
          <AlertIcon />
          {card.blocked_reason || card.label}
        </Alert>
      )}
    </Stack>
  );
}
