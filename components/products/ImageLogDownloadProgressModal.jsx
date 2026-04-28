import React from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import FileDownloadStatusPanel from "./FileDownloadStatusPanel";

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let idx = 0;
  let value = n;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(value >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
}

export default function ImageLogDownloadProgressModal({
  isOpen,
  onClose,
  onCancel,
  fileName,
  fileDownloadProgress,
  downloadingFile,
}) {
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="ZIP File Download"
      size="md"
      footer={
        <Flex w="100%" align="center" justify="space-between">
          <Button variant="ghost" colorScheme="purple" onClick={onCancel}>
            Cancel
          </Button>
          <Button colorScheme="purple" onClick={onClose} isDisabled={downloadingFile}>
            Close
          </Button>
        </Flex>
      }
    >
      <Text fontSize="sm" fontWeight="600" color="gray.700" mb={3}>
        {fileName || "Downloading archive file"}
      </Text>
      <FileDownloadStatusPanel
        fileDownloadProgress={fileDownloadProgress}
        formatBytes={formatBytes}
        title="Download Progress"
      />
    </CustomModal>
  );
}
