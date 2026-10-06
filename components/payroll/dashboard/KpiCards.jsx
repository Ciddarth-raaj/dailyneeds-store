import React from "react";
import { Box, SimpleGrid, Text, Tooltip } from "@chakra-ui/react";
import { compactINR, formatINR } from "../../../util/payrollDashboard";

/**
 * The six KPI cards. EVERY CARD IS A BUTTON that opens the employees behind
 * its number - the server re-derives that list from the same month and the
 * same filters, so the list always matches the card.
 */
const CARDS = [
  { key: "total_employees", label: "Total Employees", metric: "ALL", color: "#1B2A5B", bg: "#EEF1F8", help: "Payroll population for the month and filters" },
  { key: "initialized", label: "Initialized", metric: "INITIALIZED", color: "green.700", bg: "green.50", help: "Payroll snapshot taken for the month" },
  { key: "not_initialized", label: "Not Initialized", metric: "NOT_INITIALIZED", color: "red.700", bg: "red.50", help: "Still pending initialization (ready or blocked)" },
  { key: "payroll_cost", label: "Payroll Cost", metric: "COSTED", money: true, color: "#1B2A5B", bg: "white", help: "Gross wages of the calculated employees" },
  { key: "total_deductions", label: "Total Deductions", metric: "COSTED", money: true, color: "red.700", bg: "white", help: "Employee deductions of the calculated employees" },
  { key: "net_payable", label: "Net Payable", metric: "COSTED", money: true, color: "green.700", bg: "white", help: "Final net salary payable" },
];

export default function KpiCards({ kpis, onOpen }) {
  if (!kpis) return null;
  const uncosted = Number(kpis.uncosted_initialized) || 0;
  return (
    <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} spacing={3}>
      {CARDS.map((card) => {
        const value = kpis[card.key];
        const sub = card.money
          ? `${kpis.costed_employees} calculated${uncosted ? ` · ${uncosted} not yet costed` : ""}`
          : null;
        return (
          <Tooltip key={card.key} label={card.money ? `${card.help}: ${formatINR(value)}` : card.help} hasArrow openDelay={300}>
            <Box
              as="button"
              type="button"
              onClick={() => onOpen({ metric: card.metric, title: card.label })}
              aria-label={`Show employees: ${card.label}`}
              textAlign="left"
              px={4}
              py={3}
              bg={card.bg}
              borderWidth="1px"
              borderColor="gray.200"
              borderLeftWidth="4px"
              borderLeftColor={card.color}
              borderRadius="md"
              _hover={{ boxShadow: "md" }}
            >
              <Text fontSize="xs" color="gray.600" fontWeight="600">
                {card.label}
              </Text>
              <Text fontSize="2xl" fontWeight="700" color={card.color} lineHeight="short" isTruncated>
                {card.money ? compactINR(value) : Number(value) || 0}
              </Text>
              {card.money ? (
                <Text fontSize="xs" color="gray.700" isTruncated>
                  {formatINR(value)}
                </Text>
              ) : null}
              {sub ? (
                <Text fontSize="10px" color="gray.500" noOfLines={1}>
                  {sub}
                </Text>
              ) : null}
            </Box>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}
