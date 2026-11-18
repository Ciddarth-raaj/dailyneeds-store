import React from "react";
import { Box, HStack, Text } from "@chakra-ui/react";

/** What the Pick & Pack calendar colours mean (see pickPackCalendarUtils.getPickPackDayVisual). */
const ITEMS = [
  { label: "No records", bg: "red.50", border: "red.200" },
  { label: "Uploaded - no write-off", bg: "blue.50", border: "blue.300" },
  { label: "Remarks pending", bg: "yellow.50", border: "yellow.300" },
  { label: "All remarks filled", bg: "green.50", border: "green.200" },
];

export default function PickPackCalendarLegend() {
  return (
    <HStack spacing={4} mt={3} flexWrap="wrap">
      {ITEMS.map((l) => (
        <HStack key={l.label} spacing={1}>
          <Box w="12px" h="12px" borderRadius="3px" bg={l.bg} border="1px solid" borderColor={l.border} />
          <Text fontSize="xs" color="gray.600">
            {l.label}
          </Text>
        </HStack>
      ))}
    </HStack>
  );
}
