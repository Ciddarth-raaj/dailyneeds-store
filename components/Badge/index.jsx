import { Box, Text } from "@chakra-ui/react";
import React from "react";

function Badge({ children, colorScheme = "purple", size = "xs" }) {
  const sizes = {
    xs: {
      p: "4px 8px",
      fontSize: "xs",
      fontWeight: "500",
    },
    md: {
      p: "6px 10px",
      fontSize: "12px",
    },
  };

  return (
    <Box
      bgColor={`${colorScheme}.50`}
      h="min-content"
      p={sizes[size].p}
      borderRadius="4px"
      border={`0.01px solid red`}
      borderColor={`${colorScheme}.100`}
    >
      <Text
        fontSize={sizes[size].fontSize}
        fontWeight={sizes[size].fontWeight}
        color={`${colorScheme}.700`}
        lineHeight={1}
      >
        {children}
      </Text>
    </Box>
  );
}

export default Badge;
