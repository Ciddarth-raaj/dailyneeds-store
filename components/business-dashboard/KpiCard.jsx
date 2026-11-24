import React from "react";
import { Box, Text, Tooltip } from "@chakra-ui/react";
import { compactINR, formatINR } from "../../util/payrollDashboard";

/** A dashboard tile. With onClick (and data available) it is a button that opens its drawer. */
export function KpiCard({ label, value, sub, help, accent = "#1B2A5B", valueColor, unavailable, onClick }) {
  const clickable = Boolean(onClick) && !unavailable;
  return (
    <Tooltip label={help} hasArrow openDelay={300} isDisabled={!help}>
      <Box
        as={clickable ? "button" : "div"}
        type={clickable ? "button" : undefined}
        onClick={clickable ? onClick : undefined}
        textAlign="left"
        w="100%"
        h="100%"
        px={4}
        py={3}
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderLeftWidth="4px"
        borderLeftColor={unavailable ? "gray.300" : accent}
        borderRadius="md"
        cursor={clickable ? "pointer" : "default"}
        _hover={clickable ? { boxShadow: "md", borderColor: "purple.300", borderLeftColor: accent } : undefined}
      >
        <Text fontSize="xs" color="gray.600" fontWeight="600">
          {label}
        </Text>
        {unavailable ? (
          <Text fontSize="sm" color="gray.500" mt={1}>
            {unavailable}
          </Text>
        ) : (
          <>
            <Text fontSize="2xl" fontWeight="700" color={valueColor || "gray.800"} lineHeight="short" isTruncated>
              {compactINR(value === null || value === undefined ? value : Math.round(value))}
            </Text>
            <Text fontSize="xs" color="gray.600" noOfLines={2}>
              {sub || formatINR(value)}
            </Text>
          </>
        )}
      </Box>
    </Tooltip>
  );
}
