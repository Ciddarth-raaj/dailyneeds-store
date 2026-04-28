import React from "react";
import { Box, HStack, Progress, SimpleGrid, Text, VStack } from "@chakra-ui/react";

function getFileStatusMeta(status) {
  if (status === "completed") return { label: "Completed", colorScheme: "green" };
  if (status === "failed") return { label: "Failed", colorScheme: "red" };
  if (status === "downloading") return { label: "Downloading", colorScheme: "purple" };
  if (status === "starting") return { label: "Starting", colorScheme: "yellow" };
  return null;
}

export default function FileDownloadStatusPanel({
  fileDownloadProgress,
  formatBytes,
  title = "ZIP File Progress",
}) {
  const fileStatusMeta = getFileStatusMeta(fileDownloadProgress?.status);
  if (!fileStatusMeta) return null;

  return (
    <Box p={3} borderWidth="1px" borderColor="green.100" borderRadius="lg" bg="green.50">
      <SimpleGrid columns={2} spacing={3} mb={2}>
        <VStack align="flex-start" spacing={1}>
          <Text fontSize="xs" color="gray.500" fontWeight="500">
            Downloaded
          </Text>
          <Text fontSize="sm" fontWeight="600" color="green.700">
            {formatBytes(fileDownloadProgress?.loaded || 0)} /{" "}
            {formatBytes(fileDownloadProgress?.total || fileDownloadProgress?.loaded || 0)}
          </Text>
        </VStack>
      </SimpleGrid>
      <HStack spacing={2} align="center" mb={1}>
        <Text fontSize="xs" color="gray.500" fontWeight="500" flex={1}>
          {title}
        </Text>
        <Text fontSize="xs" fontWeight="600" color="green.600">
          {Number(fileDownloadProgress?.percent || 0)}%
        </Text>
      </HStack>
      <Progress
        value={Number(fileDownloadProgress?.percent || 0)}
        colorScheme={fileStatusMeta.colorScheme}
        borderRadius="full"
        size="sm"
        hasStripe={fileDownloadProgress?.status === "downloading"}
        isAnimated={fileDownloadProgress?.status === "downloading"}
      />
    </Box>
  );
}
