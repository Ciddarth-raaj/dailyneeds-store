import React from "react";
import {
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  HStack,
  Progress,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import Badge from "../Badge";
import { capitalize } from "../../util/string";
import FileDownloadStatusPanel from "./FileDownloadStatusPanel";

function ImagesArchiveProgressModal({
  isOpen,
  onClose,
  onCancelJob,
  isCancelling,
  downloadProgress,
  statusMeta,
  stageLabel,
  modalMessage,
  isListingStage,
  isDownloadRunning,
  miniStatusColor,
  downloadPercent,
  formatBytes,
  onDownloadZip,
  downloadingFile,
  fileDownloadProgress,
}) {
  const hasFileDownloadStatus = Boolean(fileDownloadProgress?.status);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Image Download Progress"
      size="lg"
      footer={
        <Flex w="100%" align="center" justify="space-between">
          <Button
            variant="ghost"
            colorScheme="purple"
            onClick={onCancelJob}
            isLoading={isCancelling}
            loadingText="Cancelling..."
          >
            Cancel
          </Button>
          <HStack spacing={2}>
            {downloadProgress?.ready ? (
              <Button
                colorScheme="purple"
                onClick={onDownloadZip}
                isLoading={downloadingFile}
                loadingText="Downloading..."
              >
                Download Archive
              </Button>
            ) : null}
          </HStack>
        </Flex>
      }
    >
      {!downloadProgress ? (
        <Text color="gray.600">No active image archive job.</Text>
      ) : downloadProgress?.status === "failed" ? (
        <Box
          p={4}
          borderWidth="1px"
          borderColor="red.100"
          borderRadius="lg"
          bg="red.50"
        >
          <Text fontSize="sm" fontWeight="700" color="red.700" mb={1}>
            Image archive failed
          </Text>
          <Text fontSize="sm" color="red.600">
            {downloadProgress.message ||
              "The image archive could not be created. Please try again."}
          </Text>
        </Box>
      ) : hasFileDownloadStatus ? (
        <VStack align="stretch" spacing={4}>
          <FileDownloadStatusPanel
            fileDownloadProgress={fileDownloadProgress}
            formatBytes={formatBytes}
          />
        </VStack>
      ) : (
        <VStack align="stretch" spacing={4}>
          <SimpleGrid columns={2} spacing={3}>
            <VStack align="flex-start" spacing={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="500">
                Archive Status
              </Text>
              <Badge colorScheme={statusMeta.colorScheme}>
                {statusMeta.label}
              </Badge>
            </VStack>

            <VStack align="flex-start" spacing={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="500">
                Current Step
              </Text>
              <Badge colorScheme="purple">{capitalize(stageLabel)}</Badge>
            </VStack>
          </SimpleGrid>

          <Text fontSize="xs" color="gray.700" fontWeight="500">
            {modalMessage}
          </Text>

          {downloadProgress?.stage === "listing" ? (
            <Grid
              p={3}
              borderWidth="1px"
              borderColor="purple.100"
              borderRadius="lg"
              bg="purple.50"
              templateColumns="1fr 1fr"
              gap={2}
            >
              <VStack align="flex-start" spacing={0.5}>
                <Text fontSize="xs" color="gray.600">
                  Files Found
                </Text>
                <Text fontSize="sm" fontWeight="600">
                  {Number(downloadProgress?.listed_files || 0)}
                </Text>
              </VStack>

              <VStack align="flex-start" spacing={0.5}>
                <Text fontSize="xs" color="gray.600">
                  List Pages Scanned
                </Text>
                <Text fontSize="sm" fontWeight="600">
                  {Number(downloadProgress?.scanned_pages || 0)}
                </Text>
              </VStack>
            </Grid>
          ) : null}

          {!isListingStage ? (
            <>
              <Divider />

              <Box
                p={3}
                borderWidth="1px"
                borderColor="purple.100"
                borderRadius="lg"
                bg="purple.50"
              >
                <HStack spacing={2} align="center" mb={2}>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    fontWeight="500"
                    flex={1}
                  >
                    Data Progress
                  </Text>

                  <Text fontSize="xs" fontWeight="600" color="purple.500">
                    {downloadPercent}%
                  </Text>
                </HStack>
                <HStack spacing={2} align="center">
                  <Progress
                    flex={1}
                    value={downloadPercent}
                    colorScheme={miniStatusColor}
                    borderRadius="full"
                    size="sm"
                    hasStripe={isDownloadRunning}
                    isAnimated={isDownloadRunning}
                  />
                </HStack>
                <Text fontSize="xs" color="gray.500" mt={1} textAlign="right">
                  {formatBytes(downloadProgress.downloaded_bytes)} /{" "}
                  {formatBytes(downloadProgress.total_bytes)}
                </Text>
              </Box>

              <Box
                p={3}
                borderWidth="1px"
                borderColor="purple.100"
                borderRadius="lg"
                bg="purple.50"
              >
                <HStack spacing={2} align="center" mb={2}>
                  <Text
                    fontSize="xs"
                    color="gray.500"
                    fontWeight="500"
                    flex={1}
                  >
                    Image Files
                  </Text>

                  <Text fontSize="xs" fontWeight="600" color="purple.500">
                    {Number(downloadProgress.downloaded_files || 0)} /{" "}
                    {Number(downloadProgress.total_files || 0)}
                  </Text>
                </HStack>
                <HStack spacing={2} align="center">
                  <Progress
                    flex={1}
                    value={Number(downloadProgress.files_percent || 0)}
                    colorScheme={miniStatusColor}
                    borderRadius="full"
                    size="sm"
                    hasStripe={isDownloadRunning}
                    isAnimated={isDownloadRunning}
                  />
                </HStack>
              </Box>

            </>
          ) : null}
        </VStack>
      )}
    </CustomModal>
  );
}

export default ImagesArchiveProgressModal;
