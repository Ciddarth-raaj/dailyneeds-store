import React from "react";
import { Box, SimpleGrid, Skeleton, Text } from "@chakra-ui/react";

/**
 * The counters above a list. Each tile is a filter — tapping "Overdue" shows
 * the overdue items rather than just telling you how many there are.
 */
function SummaryStrip({ summary, loading, active, onSelect }) {
  const tiles = [
    { key: "open", label: "Open", value: summary?.open_count, colorScheme: "orange" },
    {
      key: "in_progress",
      label: "In Progress",
      value: summary?.in_progress_count,
      colorScheme: "blue",
    },
    {
      key: "overdue",
      label: "Overdue",
      value: summary?.overdue_count,
      colorScheme: "red",
    },
    {
      key: "unassigned",
      label: "Unassigned",
      value: summary?.unassigned_count,
      colorScheme: "purple",
    },
  ];

  if (loading && !summary) {
    return (
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing="10px" mb="16px">
        {tiles.map((tile) => (
          <Skeleton key={tile.key} height="72px" borderRadius="10px" />
        ))}
      </SimpleGrid>
    );
  }

  if (!summary) return null;

  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} spacing="10px" mb="16px">
      {tiles.map((tile) => {
        const isActive = active === tile.key;
        const count = Number(tile.value) || 0;

        return (
          <Box
            key={tile.key}
            as="button"
            type="button"
            textAlign="left"
            bg={isActive ? `${tile.colorScheme}.50` : "white"}
            borderWidth="1px"
            borderColor={isActive ? `${tile.colorScheme}.300` : "gray.200"}
            borderRadius="10px"
            p="12px 14px"
            transition="border-color 0.15s ease, background 0.15s ease"
            _hover={{ borderColor: `${tile.colorScheme}.300` }}
            _focusVisible={{ outline: "2px solid", outlineColor: "purple.400" }}
            onClick={() => onSelect && onSelect(isActive ? null : tile.key)}
            aria-pressed={isActive}
          >
            <Text
              fontSize="24px"
              fontWeight="700"
              lineHeight="1.1"
              color={count > 0 ? `${tile.colorScheme}.600` : "gray.400"}
            >
              {count}
            </Text>
            <Text fontSize="xs" color="gray.600" mt="2px">
              {tile.label}
            </Text>
          </Box>
        );
      })}
    </SimpleGrid>
  );
}

export default SummaryStrip;
