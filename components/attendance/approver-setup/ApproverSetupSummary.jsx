import React from "react";
import { Box, SimpleGrid, Skeleton, Text, Tooltip } from "@chakra-ui/react";
import { summaryCards } from "../../../util/attendanceApproverSetup";

/**
 * The three numbers above the filters: how many employees require attendance,
 * how many of them are set up, and how many are not.
 *
 * THE COUNTS ARE THE SERVER'S. They cover the whole filtered population, not
 * the page of rows the table is holding, so they stay true when the list is
 * paged. This component only renders what arrived.
 *
 * TWO OF THEM ARE FILTERS. Clicking "Approver Setup Completed" or "Without
 * Approver Setup" narrows the table to those employees; clicking the
 * selected one again, or "Attendance Required Employees", clears it. The
 * selected card is outlined rather than filled - the numbers are the point,
 * and a filled card competes with them.
 *
 * A card with no rows behind it is not clickable: filtering to nothing tells
 * nobody anything.
 */
export default function ApproverSetupSummary({ summary, activeStatus, onSelect, loading }) {
  const cards = summaryCards(summary, activeStatus);

  return (
    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3} data-testid="approver-summary">
      {cards.map((card) => {
        const clickable = typeof onSelect === "function" && !loading && (card.status === null || card.value > 0);
        return (
          <Tooltip key={card.key} label={card.help} hasArrow openDelay={400}>
            <Box
              data-testid={`summary-card-${card.key}`}
              data-selected={card.selected ? "true" : "false"}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-pressed={card.status === null ? undefined : card.selected}
              onClick={clickable ? () => onSelect(card.status) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(card.status);
                      }
                    }
                  : undefined
              }
              borderWidth={card.selected ? "2px" : "1px"}
              borderColor={card.selected ? `${card.colorScheme}.400` : "gray.200"}
              bg={card.selected ? `${card.colorScheme}.50` : "white"}
              borderRadius="md"
              px={3}
              py={2}
              cursor={clickable ? "pointer" : "default"}
              transition="border-color 0.15s, background-color 0.15s"
              _hover={clickable ? { borderColor: `${card.colorScheme}.300` } : undefined}
            >
              <Text fontSize="xs" color="gray.600" noOfLines={2} minH="32px">
                {card.label}
              </Text>
              {loading ? (
                <Skeleton height="24px" width="48px" mt={1} />
              ) : (
                <Text fontSize="xl" fontWeight="700" color={`${card.colorScheme}.600`} lineHeight="1.2">
                  {card.value}
                </Text>
              )}
            </Box>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}
