import React from "react";
import { Badge, Box, Button, Flex, SimpleGrid, Text } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import { outstandingActions, severityTone } from "../../../util/payrollDashboard";

/**
 * PAYROLL ACTION REQUIRED - what is stopping the month from being finished.
 *
 * Every item is a rule the Payrun stages already apply (an initialization
 * blocker, an approval blocker, a calculation status) or the stored net pay
 * itself; the dashboard invents no status. Each item opens its employees, and
 * "Fix" goes straight to the Payrun stage and card where it is resolved.
 */
export default function ActionRequiredPanel({ actions, onOpen, hrefFor, onNavigate }) {
  const items = actions || [];
  const open = outstandingActions(items);
  const allClear = open.length === 0;
  return (
    <CustomContainer
      title="Payroll Action Required"
      subtitle={allClear ? "Nothing is blocking this month" : `${open.length} item${open.length === 1 ? "" : "s"} need attention`}
      size="xs"
      filledHeader
    >
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3, "2xl": 5 }} spacing={3}>
        {items.map((a) => {
          const tone = severityTone(a.severity);
          const has = Number(a.count) > 0;
          const href = hrefFor(a.target);
          return (
            <Box
              key={a.key}
              borderWidth="1px"
              borderColor={has ? `${tone}.200` : "gray.200"}
              bg={has ? `${tone}.50` : "white"}
              borderRadius="md"
              px={3}
              py={2}
            >
              <Flex justify="space-between" align="flex-start" gap={2}>
                <Text fontSize="sm" fontWeight="600" color="gray.700" noOfLines={2}>
                  {a.label}
                </Text>
                <Badge colorScheme={has ? tone : "gray"} fontSize="md" px={2}>
                  {a.count}
                </Badge>
              </Flex>
              <Text fontSize="xs" color="gray.600" mt={1} noOfLines={2} title={a.description}>
                {a.description}
              </Text>
              <Flex gap={2} mt={2}>
                <Button size="xs" variant="outline" colorScheme="purple" isDisabled={!has} onClick={() => onOpen({ metric: a.metric, title: a.label })}>
                  Employees
                </Button>
                <Button
                  as="a"
                  href={href}
                  size="xs"
                  colorScheme="purple"
                  isDisabled={!has}
                  onClick={(e) => {
                    e.preventDefault();
                    if (has) onNavigate(href);
                  }}
                >
                  Fix in Payrun
                </Button>
              </Flex>
            </Box>
          );
        })}
      </SimpleGrid>
    </CustomContainer>
  );
}
