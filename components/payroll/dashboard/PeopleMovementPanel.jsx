import React from "react";
import { Box, Flex, SimpleGrid, Text } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import { formatINR } from "../../../util/payrollDashboard";

/**
 * PEOPLE MOVEMENT for the selected month - New Joined, Rejoined and
 * Resigned / Exited, each with its count and its payroll cost, deductions and
 * net wages (from the calculated employees among them). Clicking a category
 * lists its employees.
 *
 * HOLD / PRE-JOINING ARE NOT SHOWN because DnDS payroll has no such status;
 * a category that can only ever read zero would be a claim nobody made.
 */
const TONE = {
  JOINED: { fg: "green.700", bg: "green.50", border: "green.400" },
  REJOINED: { fg: "blue.700", bg: "blue.50", border: "blue.400" },
  RESIGNED: { fg: "red.700", bg: "red.50", border: "red.400" },
};

function Figure({ label, value, color }) {
  return (
    <Box textAlign="center">
      <Text fontSize="sm" fontWeight="600" color={color || "gray.800"}>
        {formatINR(value)}
      </Text>
      <Text fontSize="10px" color="gray.500" textTransform="uppercase">
        {label}
      </Text>
    </Box>
  );
}

export default function PeopleMovementPanel({ movement, periodLabel, onOpen }) {
  return (
    <CustomContainer title="People Movement" subtitle={periodLabel} size="xs" filledHeader>
      <Flex direction="column" gap={3}>
        <Text fontSize="10px" color="gray.500">
          From the employment history. A rejoin is counted when it was recorded through DnDS Rejoin; older rejoins
          read as New Joined. Hold and pre-joining are not payroll statuses in DnDS, so they are not shown.
        </Text>
        {(movement || []).map((m) => {
          const t = TONE[m.key] || TONE.JOINED;
          return (
            <Box
              key={m.key}
              as="button"
              type="button"
              onClick={() => onOpen({ metric: m.metric, title: `People Movement · ${m.label}` })}
              aria-label={`Show ${m.label} employees`}
              textAlign="left"
              borderWidth="1px"
              borderColor="gray.200"
              borderLeftWidth="4px"
              borderLeftColor={t.border}
              borderRadius="md"
              bg={t.bg}
              px={3}
              py={2}
              _hover={{ boxShadow: "sm" }}
            >
              <Flex justify="space-between" align="center" mb={1}>
                <Text fontSize="sm" fontWeight="600" color="gray.700">
                  {m.label}
                </Text>
                <Text fontSize="xl" fontWeight="700" color={t.fg}>
                  {m.count}
                </Text>
              </Flex>
              <SimpleGrid columns={3} spacing={2} bg="white" borderRadius="md" py={1}>
                <Figure label="Payroll cost" value={m.payroll_cost} />
                <Figure label="Deductions" value={m.deductions} color="red.600" />
                <Figure label="Net wages" value={m.net_wages} color="green.700" />
              </SimpleGrid>
              {m.count > m.costed_employees ? (
                <Text fontSize="10px" color="gray.500" mt={1}>
                  {m.count - m.costed_employees} not yet calculated
                </Text>
              ) : null}
            </Box>
          );
        })}
      </Flex>
    </CustomContainer>
  );
}
