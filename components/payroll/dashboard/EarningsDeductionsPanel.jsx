import React from "react";
import { Box, Flex, SimpleGrid, Text, Tooltip as ChakraTooltip } from "@chakra-ui/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import CustomContainer from "../../CustomContainer";
import { compactINR, formatINR } from "../../../util/payrollDashboard";

/**
 * EARNINGS VS DEDUCTIONS. The donut is the gross split into what is paid
 * (net) and what is deducted, so its two slices add up to the gross in the
 * centre. Below it, the deduction breakdown from the stored calculation;
 * PT and Income Tax / TDS are shown as NOT TRACKED - DnDS stores no monthly
 * figure for either, and a ₹0 would claim one.
 *
 * Every amount opens the employees behind it.
 */
const NET = "#2F855A";
const DEDUCTED = "#C53030";

function Legend({ color, label, value, onClick }) {
  return (
    <Flex as="button" type="button" onClick={onClick} align="center" gap={2} textAlign="left" _hover={{ textDecoration: "underline" }}>
      <Box w="10px" h="10px" borderRadius="sm" bg={color} flexShrink={0} />
      <Text fontSize="sm" color="gray.600">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="600" color="gray.800">
        {formatINR(value)}
      </Text>
    </Flex>
  );
}

export default function EarningsDeductionsPanel({ earnings, periodLabel, onOpen }) {
  if (!earnings) return null;
  const net = Math.max(Number(earnings.net) || 0, 0);
  const deducted = Math.max(Number(earnings.deductions) || 0, 0);
  const empty = net === 0 && deducted === 0;
  const slices = [
    { name: "Net Payable", value: net, color: NET },
    { name: "Deductions", value: deducted, color: DEDUCTED },
  ];
  const openCosted = (title) => onOpen({ metric: "COSTED", title });

  return (
    <CustomContainer title="Earnings vs Deductions" subtitle={periodLabel} size="xs" filledHeader>
      <Flex direction={{ base: "column", md: "row" }} align="center" gap={6}>
        <Box w="180px" h="180px" position="relative" flexShrink={0}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={empty ? [{ name: "Nothing calculated", value: 1, color: "#E2E8F0" }] : slices}
                dataKey="value"
                innerRadius={62}
                outerRadius={84}
                startAngle={90}
                endAngle={-270}
                stroke="#fff"
                strokeWidth={2}
                isAnimationActive={false}
                onClick={() => !empty && openCosted("Payroll Cost")}
                cursor={empty ? "default" : "pointer"}
              >
                {(empty ? [{ color: "#E2E8F0" }] : slices).map((s, i) => (
                  <Cell key={i} fill={s.color} />
                ))}
              </Pie>
              {!empty ? <Tooltip formatter={(v, n) => [formatINR(v), n]} /> : null}
            </PieChart>
          </ResponsiveContainer>
          <Flex position="absolute" inset={0} direction="column" align="center" justify="center" pointerEvents="none">
            <Text fontSize="10px" color="gray.500" letterSpacing="wide">
              GROSS
            </Text>
            <Text fontSize="lg" fontWeight="700" color="#1B2A5B">
              {compactINR(earnings.gross)}
            </Text>
          </Flex>
        </Box>
        <Flex direction="column" gap={2}>
          <Legend color="#1B2A5B" label="Gross Wages" value={earnings.gross} onClick={() => openCosted("Gross Wages")} />
          <Legend color={NET} label="Net Payable" value={earnings.net} onClick={() => openCosted("Net Payable")} />
          <Legend color={DEDUCTED} label="Deductions" value={earnings.deductions} onClick={() => openCosted("Total Deductions")} />
          <Text fontSize="xs" color="gray.500">
            From {earnings.costed_employees} costed employees
            {Number(earnings.net_pay_rounding) !== 0 ? ` · net pay rounding ${formatINR(earnings.net_pay_rounding)}` : ""}
          </Text>
          <Text fontSize="10px" color="gray.400">
            Gross − Deductions + Rounding = Net Payable. Employer PF/ESI not included.
          </Text>
        </Flex>
      </Flex>

      <SimpleGrid columns={{ base: 2, md: 3 }} spacing={2} mt={4}>
        {(earnings.breakdown || []).map((d) => {
          const clickable = d.tracked && d.metric && Number(d.employees) > 0;
          return (
            <ChakraTooltip
              key={d.key}
              label={d.tracked ? `${d.employees} employees` : "DnDS does not record this deduction yet"}
              hasArrow
              openDelay={300}
            >
              <Box
                as={clickable ? "button" : "div"}
                type={clickable ? "button" : undefined}
                onClick={clickable ? () => onOpen({ metric: d.metric, title: `Deduction · ${d.label}` }) : undefined}
                textAlign="center"
                px={2}
                py={2}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                bg={d.tracked ? "gray.50" : "white"}
                _hover={clickable ? { borderColor: "purple.300" } : undefined}
              >
                <Text fontSize="10px" color="gray.500" fontWeight="600" textTransform="uppercase" noOfLines={1}>
                  {d.label}
                </Text>
                <Text fontSize="sm" fontWeight="600" color={d.tracked ? "gray.800" : "gray.400"}>
                  {d.tracked ? formatINR(d.amount) : "Not tracked"}
                </Text>
              </Box>
            </ChakraTooltip>
          );
        })}
      </SimpleGrid>
    </CustomContainer>
  );
}
