import React from "react";
import { Badge, Box, Flex, Spinner, Stack, Text } from "@chakra-ui/react";
import { dateCard, stateColor } from "../../util/telegramAttendance";

/**
 * MISSING ATTENDANCE, as a phone shows it: one tappable card per date.
 *
 * NO PUNCH COUNT. A card says which day needs a correction and what state it
 * is in - it never says how many times a machine saw somebody, and the server
 * does not send a count to this screen at all.
 *
 * NO EMPLOYEE SELECTOR AND NO BRANCH SELECTOR. There is exactly one employee
 * in this app - the one Telegram's signature resolved to - and no control
 * here could name another.
 *
 * `highlight` is the `?date=` NAVIGATION HINT from the Telegram button. It
 * only ever draws a ring: a date that is not in this list is not shown, and a
 * date that is not actionable is not made actionable by being pointed at.
 */
export default function TelegramMissingDateList({ dates, loading, highlight, onSelect }) {
  if (loading) {
    return (
      <Flex justify="center" py={10}>
        <Spinner size="lg" color="purple.400" />
      </Flex>
    );
  }

  if (!dates || dates.length === 0) {
    return (
      <Box textAlign="center" py={10} px={4}>
        <Text fontSize="lg" fontWeight="600">
          Nothing to regularise
        </Text>
        <Text fontSize="sm" color="gray.500" mt={2}>
          Your attendance has no missing punches right now.
        </Text>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {dates.map((row) => {
        const card = dateCard(row);
        const isHint = highlight && card.attendance_date === highlight;
        return (
          <Box
            key={card.attendance_date}
            as="button"
            type="button"
            textAlign="left"
            w="100%"
            p={4}
            borderWidth="1px"
            borderRadius="xl"
            borderColor={isHint ? "purple.400" : "gray.200"}
            boxShadow={isHint ? "0 0 0 2px var(--chakra-colors-purple-100)" : "sm"}
            bg="white"
            onClick={() => onSelect(card.attendance_date)}
          >
            <Flex align="center" justify="space-between" gap={3}>
              <Box minW={0}>
                <Text fontSize="md" fontWeight="700" noOfLines={1}>
                  {card.title}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {card.weekday}
                </Text>
              </Box>
              <Badge
                colorScheme={stateColor(card.state)}
                borderRadius="full"
                px={3}
                py={1}
                fontSize="10px"
                textTransform="none"
                whiteSpace="nowrap"
              >
                {card.label}
              </Badge>
            </Flex>
          </Box>
        );
      })}
    </Stack>
  );
}
