import React from "react";
import { Center, Flex, Spinner, Text } from "@chakra-ui/react";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";

export default function GrnHighlightLoader({
  label = "Checking price mismatches...",
  minH = "200px",
}) {
  const { colorScheme } = useModuleTableTheme();

  return (
    <Center minH={minH} w="100%" py={8}>
      <Flex direction="column" align="center" gap={3}>
        <Spinner size="lg" color={`${colorScheme}.500`} thickness="3px" />
        <Text fontSize="sm" color="gray.600">
          {label}
        </Text>
      </Flex>
    </Center>
  );
}
