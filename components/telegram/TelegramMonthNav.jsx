import React from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import { canGoNext, monthLabel, nextMonth, previousMonth } from "../../util/telegramAttendance";

/**
 * Month navigation for My Attendance.
 *
 * FORWARD STOPS AT THE MONTH WE ARE IN. `canGoNext` is the rule and it lives
 * in `util/telegramAttendance.js`, so the button's disabled state and any
 * test of it read the same function. A future month has no attendance to
 * show and the backend clamps it away regardless - offering the control
 * would only promise an empty screen.
 *
 * Backwards is deliberately NOT limited to the regularisation window: an
 * employee may read any month of their own attendance. What they may
 * CORRECT is a different question, answered by the Corrections section and
 * by the backend's own window.
 */
export default function TelegramMonthNav({ month, onChange, isDisabled }) {
  const forwardAllowed = canGoNext(month);
  return (
    <Flex align="center" justify="space-between" gap={2} mb={3}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onChange(previousMonth(month))}
        isDisabled={isDisabled}
        aria-label="Previous month"
      >
        ‹
      </Button>
      <Text fontSize="sm" fontWeight="700">
        {monthLabel(month)}
      </Text>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onChange(nextMonth(month))}
        isDisabled={isDisabled || !forwardAllowed}
        aria-label="Next month"
      >
        ›
      </Button>
    </Flex>
  );
}
