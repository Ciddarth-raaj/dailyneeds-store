import { Box, Text } from "@chakra-ui/react";
import React from "react";

function Badge({ children, colorScheme = "purple" }) {
  return (
    <Box
      bgColor={`${colorScheme}.50`}
      h="min-content"
      p="4px 8px"
      borderRadius="4px"
    >
      <Text
        fontSize="xs"
        fontWeight="500"
        color={`${colorScheme}.700`}
        lineHeight={1}
      >
        {children}
      </Text>
    </Box>
  );
}

export default Badge;
