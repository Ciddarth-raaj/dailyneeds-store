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
  Input,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { positionalPunches, shiftLabel } from "../../util/attendanceV2";
import { buildSubmission, displayDate, weekday } from "../../util/telegramAttendance";

/**
 * ONE DATE inside Telegram: the shift, the existing punches, and the two
 * fields the employee fills in.
 *
 * ================================= THE SAME PRESENTATION AS THE WEB FORM ===
 *
 * The punch list is `positionalPunches` and the shift line is `shiftLabel` -
 * the same functions `components/attendance/RegularizationForm.jsx` and the
 * Day Detail use, so a punch reads identically on a phone in Telegram and on
 * a desktop in the browser. The punch TIMESTAMP is built by
 * `buildSubmission`, which delegates to the one `calendarDateFor` both
 * screens share. There is no second definition of how a punch time is made.
 *
 * ============================================ EXISTING PUNCHES ARE READ-ONLY
 *
 * They are rendered as text. There is no control to edit one, no control to
 * delete one, and no field that could name one - the request body is a date,
 * a time and a reason, and the API refuses anything else.
 *
 * The backend validates everything that decides the outcome: that the date
 * genuinely has a missing punch, that the time lands on this attendance date
 * under the shift's historical cutoff, that the reason is present, that no
 * request is already open, and that the period is not closed. Its message is
 * shown as it is rather than second-guessed here.
 */
export default function TelegramRegularizationForm({ detail, loading, saving, onSubmit, onBack }) {
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);

  if (loading || !detail) {
    return (
      <Flex justify="center" py={10}>
        <Spinner size="lg" color="purple.400" />
      </Flex>
    );
  }

  const day = detail.day || null;
  const punches = positionalPunches(day);

  const submit = () => {
    setError(null);
    const built = buildSubmission(day, time, reason);
    if (built.error) {
      setError(built.error);
      return;
    }
    onSubmit(built.body, (message) => setError(message));
  };

  return (
    <Stack spacing={5} pb={4}>
      <Box>
        <Button size="sm" variant="ghost" onClick={onBack} pl={0}>
          ← All dates
        </Button>
      </Box>

      <Box>
        <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
          Date
        </Text>
        <Text fontSize="lg" fontWeight="700">
          {displayDate(detail.attendance_date)}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {weekday(detail.attendance_date)}
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
          Existing punches (read only)
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

      {detail.can_submit ? (
        <>
          <FormControl isRequired>
            <FormLabel fontSize="sm">Missing punch time</FormLabel>
            <Input
              type="time"
              size="lg"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="HH:MM"
            />
          </FormControl>

          <FormControl isRequired>
            <FormLabel fontSize="sm">Reason</FormLabel>
            <Textarea
              size="md"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why was the punch missed?"
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
          {detail.state_label || "This date cannot be regularised."}
        </Alert>
      )}
    </Stack>
  );
}
