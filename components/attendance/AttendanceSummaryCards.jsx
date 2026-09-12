import React from "react";
import { Box, SimpleGrid, Text } from "@chakra-ui/react";
import { SUMMARY_FILTER } from "../../util/attendanceV2";

/**
 * The month at a glance - All | Present Days | Absent Days | Need Action -
 * and the filter for the table under it.
 *
 * THE CARDS ARE THE FILTER. Each one is a button: tapping Need Action leaves
 * only the days somebody has to act on, tapping All comes back to the month.
 * The chosen card is filled and outlined so the table below is never silently
 * filtered - a count you cannot get back out of is worse than no count.
 *
 * THE COUNTS ARE THE ROWS ALREADY LOADED. `attendanceSummary` counts the
 * `days` the screen is holding; switching cards filters in the browser and
 * makes no request. Changing employee or month reloads as it always did.
 *
 * CLASSIFICATION IS THE ATTENDANCE STATUS, NEVER THE OT CLAIM - see
 * `daySummaryBucket`. A day with OT Available, Pending, Approved or Rejected
 * is counted on its attendance alone.
 */
const CARDS = [
  { key: SUMMARY_FILTER.ALL, label: "All", color: "purple" },
  { key: SUMMARY_FILTER.PRESENT, label: "Present Days", color: "green" },
  { key: SUMMARY_FILTER.ABSENT, label: "Absent Days", color: "red" },
  { key: SUMMARY_FILTER.NEED_ACTION, label: "Need Action", color: "orange" },
];

function SummaryCard({ card, count, selected, onSelect }) {
  return (
    <Box
      as="button"
      type="button"
      aria-pressed={selected}
      title={`Show ${card.label}`}
      onClick={() => onSelect(card.key)}
      textAlign="left"
      w="100%"
      px={3}
      py={2}
      borderWidth="1px"
      borderRadius="md"
      borderColor={selected ? `${card.color}.400` : "gray.200"}
      bg={selected ? `${card.color}.50` : "white"}
      boxShadow={selected ? `inset 0 0 0 1px var(--chakra-colors-${card.color}-400)` : "none"}
      _hover={{ borderColor: `${card.color}.300` }}
      _active={{ bg: `${card.color}.50` }}
    >
      <Text fontSize="xl" fontWeight="700" lineHeight="short" color={`${card.color}.600`}>
        {count}
      </Text>
      <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
        {card.label}
      </Text>
    </Box>
  );
}

export default function AttendanceSummaryCards({ counts, filter, onFilterChange }) {
  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
      {CARDS.map((card) => (
        <SummaryCard
          key={card.key}
          card={card}
          count={counts[card.key] || 0}
          selected={filter === card.key}
          onSelect={onFilterChange}
        />
      ))}
    </SimpleGrid>
  );
}
