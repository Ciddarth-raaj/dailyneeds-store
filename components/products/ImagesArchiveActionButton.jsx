import React from "react";
import { Box, Button, HStack, Text, Tooltip, VStack } from "@chakra-ui/react";
import Badge from "../Badge";

function ImagesArchiveActionButton({
  hasDownloadJob,
  isDownloadRunning,
  downloadingStart,
  downloadPercent,
  statusMeta,
  miniSummary,
  compactProgressLabel,
  onOpen,
  onStart,
}) {
  if (hasDownloadJob) {
    return (
      <Tooltip
        openDelay={260}
        hasArrow
        bg="white"
        color="gray.700"
        borderWidth="1px"
        borderColor="gray.200"
        boxShadow="md"
        label={
          <Box p={1}>
            <VStack align="stretch" spacing={2}>
              <HStack justify="space-between">
                <Text fontSize="xs" color="gray.700">
                  Image Archive
                </Text>
                <Badge colorScheme={statusMeta.colorScheme}>
                  {statusMeta.label}
                </Badge>
              </HStack>
              <Text fontSize="xs" color="gray.600">
                {miniSummary}
              </Text>
            </VStack>
          </Box>
        }
      >
        {isDownloadRunning ? (
          <Button
            type="button"
            onClick={onOpen}
            size="sm"
            variant="outline"
            colorScheme="purple"
            borderWidth="1px"
            borderColor="purple.200"
            color="purple.800"
            bgGradient={`linear(to-r, purple.100 ${downloadPercent}%, white ${downloadPercent}%)`}
            _hover={{
              bgGradient: `linear(to-r, purple.200 ${downloadPercent}%, purple.50 ${downloadPercent}%)`,
            }}
            leftIcon={<i className="fa fa-file-archive" />}
          >
            {compactProgressLabel}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onOpen}
            size="sm"
            variant="outline"
            colorScheme="purple"
            leftIcon={<i className="fa fa-file-archive" />}
          >
            Image Archive
          </Button>
        )}
      </Tooltip>
    );
  }

  return (
    <Button
      colorScheme="purple"
      variant="outline"
      size="sm"
      onClick={onStart}
      isLoading={downloadingStart}
      leftIcon={<i className="fa fa-download" />}
    >
      Download Images
    </Button>
  );
}

export default ImagesArchiveActionButton;
