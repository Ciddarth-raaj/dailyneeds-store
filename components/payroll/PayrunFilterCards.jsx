import React from "react";
import { Box, Button, SimpleGrid, Text } from "@chakra-ui/react";

/**
 * Payrun Initialization - THE SUMMARY CARDS, AND THEY ARE THE FILTERS.
 *
 * One group of cards, each a real button: a count from the server's month
 * summary and a click that narrows the table below to exactly those
 * employees. The selected card is the one filter in force, so there is no
 * second set of tabs or dropdowns repeating it.
 *
 * REAL BUTTONS, so a keyboard reaches every card with Tab and presses it with
 * Enter or Space, and `aria-pressed` tells a screen reader which is on. The
 * selected card takes the screen's purple; the rest are outlined and lift on
 * hover and focus, so they read as controls rather than as statistics.
 *
 * THE COUNT IS THE SERVER'S, for the whole month in the chosen location. A
 * card with no count shows a dash rather than 0 - "nobody counted" is not
 * "nobody".
 */
function PayrunFilterCards({ title, cards, active, counts, onSelect, isDisabled = false, columns }) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.06em" mb={1}>
        {title}
      </Text>
      <SimpleGrid columns={columns || { base: 2, md: 3, lg: 6 }} spacing={3} role="group" aria-label={title}>
        {cards.map((card) => {
          const selected = active === card.key;
          const count = counts ? counts(card.key) : undefined;
          return (
            <Button
              key={card.key}
              type="button"
              aria-pressed={selected}
              aria-label={`${card.label}: ${typeof count === "number" ? count : "not counted"}${
                selected ? " (selected)" : ""
              }`}
              data-card={card.key}
              onClick={() => onSelect(card.key)}
              isDisabled={isDisabled}
              cursor="pointer"
              height="auto"
              p={3}
              display="flex"
              flexDirection="column"
              alignItems="flex-start"
              justifyContent="flex-start"
              textAlign="left"
              whiteSpace="normal"
              borderRadius="md"
              borderWidth={selected ? "2px" : "1px"}
              borderColor={selected ? "purple.500" : "gray.200"}
              bg={selected ? "purple.50" : "white"}
              color={selected ? "purple.700" : "gray.800"}
              boxShadow={selected ? "sm" : "none"}
              _hover={{ borderColor: "purple.300", bg: selected ? "purple.50" : "gray.50" }}
              _focus={{ boxShadow: "outline" }}
              _active={{ bg: "purple.100" }}
            >
              <Text fontSize="xs" fontWeight="500">
                {card.label}
              </Text>
              <Text fontSize="lg" fontWeight="bold">
                {typeof count === "number" ? count : "—"}
              </Text>
            </Button>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}

export default PayrunFilterCards;
