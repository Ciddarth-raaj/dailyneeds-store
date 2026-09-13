import React from "react";
import { Box, Flex, SimpleGrid, Text, Tooltip } from "@chakra-ui/react";
import { GAP_REASONS, PRIMARY_CARDS, tone } from "../../../util/attendanceDashboard";

/**
 * Expected Now / Recorded IN / Gap — the three primary cards.
 *
 * The Gap card carries its reasons inline, because the number on its own
 * invites the wrong reading. "4" means four schedules not covered by a
 * recorded IN; the breakdown says how many of those are somebody who punched
 * out, somebody at another branch, and somebody whose punch data needs
 * checking. None of them is an absence.
 *
 * Every card opens the exact employee list behind it.
 */
export default function StaffingCards({ snapshot, onOpen }) {
  if (!snapshot) return null;

  const value = (key) => Number(snapshot[key]) || 0;
  const reasons = (snapshot.gap_by_class || []).reduce((acc, c) => {
    acc[c.key] = Number(c.count) || 0;
    return acc;
  }, {});

  return (
    <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={2}>
      {PRIMARY_CARDS.map((card) => {
        const t = tone(card.color);
        return (
          <Tooltip key={card.key} label={card.help} placement="bottom" hasArrow openDelay={300}>
            <Box
              as="button"
              type="button"
              onClick={() => onOpen(card.bucket)}
              aria-label={`Show ${card.label}`}
              textAlign="left"
              w="100%"
              px={3}
              py={2}
              borderWidth="1px"
              borderRadius="md"
              borderColor={t.border}
              bg={t.bg}
              _hover={{ boxShadow: "sm", borderColor: t.chart }}
            >
              <Text fontSize="2xl" fontWeight="700" lineHeight="short" color={t.fg}>
                {value(card.key)}
              </Text>
              <Text fontSize="xs" color="gray.700" fontWeight="600">
                {card.label}
              </Text>

              {card.key === "gap" ? (
                <Flex wrap="wrap" gap={1} mt={1}>
                  {GAP_REASONS.filter((r) => reasons[r.key] > 0).map((r) => (
                    <Text key={r.key} fontSize="10px" color="gray.600" noOfLines={1}>
                      {reasons[r.key]} {r.label.toLowerCase()}
                    </Text>
                  ))}
                  {Object.values(reasons).every((n) => !n) ? (
                    <Text fontSize="10px" color="gray.500">
                      Every scheduled employee is recorded IN
                    </Text>
                  ) : null}
                </Flex>
              ) : null}

              {card.key === "recorded_in" ? (
                <Text fontSize="10px" color="gray.500" noOfLines={1}>
                  at their expected location
                </Text>
              ) : null}
              {card.key === "expected_now" ? (
                <Text fontSize="10px" color="gray.500" noOfLines={1}>
                  by assigned shift interval
                </Text>
              ) : null}
            </Box>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}
