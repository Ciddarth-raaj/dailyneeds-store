import React from "react";
import { Box, Flex, Text, Stack } from "@chakra-ui/react";

/**
 * New Employee onboarding — the manager's progress through the four stages.
 *
 * IT SHOWS FOUR STEPS BECAUSE THERE ARE FOUR (M1). The payment, statutory,
 * payroll and document sections are completed on the employee profile
 * afterwards; showing them here as greyed-out future steps would tell a store
 * manager they have six steps and are being prevented from taking three of
 * them, which is both untrue and an invitation to ask for the permission.
 *
 * BACKWARDS ONLY. A completed step is a link back to what was entered - going
 * back must never lose anything - and a step ahead is not, because reaching
 * it means passing the stage in front of it.
 *
 * On a phone this stays one compact row: the circles keep their size, the
 * labels shrink, and the connectors take whatever is left.
 */
function OnboardingStepper({ stages = [], current = 0, furthest = 0, onSelect }) {
  return (
    <Flex align="flex-start" width="100%" mb={5} role="list" aria-label="Onboarding stages">
      {stages.map((stage, index) => {
        const done = index < current;
        const active = index === current;
        const reachable = index <= furthest && index !== current && typeof onSelect === "function";

        return (
          <React.Fragment key={stage.key}>
            <Stack
              spacing={1}
              align="center"
              flex="0 0 auto"
              minW={{ base: "68px", sm: "96px" }}
              role="listitem"
              aria-current={active ? "step" : undefined}
              cursor={reachable ? "pointer" : "default"}
              onClick={reachable ? () => onSelect(index) : undefined}
            >
              <Flex
                align="center"
                justify="center"
                w="32px"
                h="32px"
                borderRadius="full"
                fontSize="sm"
                fontWeight="bold"
                borderWidth="2px"
                borderColor={active || done ? "purple.500" : "gray.300"}
                bg={done ? "purple.500" : active ? "white" : "gray.50"}
                color={done ? "white" : active ? "purple.600" : "gray.500"}
              >
                {done ? "✓" : index + 1}
              </Flex>
              <Text
                fontSize={{ base: "2xs", sm: "xs" }}
                fontWeight={active ? "bold" : "normal"}
                color={active ? "purple.600" : done ? "gray.700" : "gray.500"}
                textAlign="center"
                noOfLines={1}
              >
                {stage.label}
              </Text>
            </Stack>

            {index < stages.length - 1 ? (
              <Box
                flex="1 1 auto"
                height="2px"
                bg={index < current ? "purple.500" : "gray.200"}
                mt="15px"
                minW="8px"
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </Flex>
  );
}

export default OnboardingStepper;
