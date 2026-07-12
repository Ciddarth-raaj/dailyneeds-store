import React, { useCallback, useState } from "react";
import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Text,
  VStack,
  useDisclosure,
} from "@chakra-ui/react";
import { useDropzone } from "react-dropzone";
import { parseSpreadsheetFile } from "../../util/parseSpreadsheetFile";
import toast from "react-hot-toast";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";

/**
 * Coerce a raw value to the target type.
 */
function coerceValue(raw, type) {
  if (raw === "" || raw == null) return type === "number" ? null : "";
  const s = String(raw).trim();
  if (type === "number") {
    const n = parseFloat(s);
    return Number.isNaN(n) ? null : n;
  }
  if (type === "date") {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toISOString().slice(0, 10);
  }
  return s;
}

function AcceptedColumnsList({ config, colorScheme }) {
  const cs = colorScheme;
  return (
    <VStack align="stretch" spacing={2} mb={4}>
      <Text fontSize="sm" color="gray.600">
        Your file should include the following columns:
      </Text>
      <Box
        borderWidth="1px"
        borderColor={`${cs}.100`}
        borderRadius="md"
        overflow="hidden"
      >
        {config.map(({ key, label, required, suggestedKey }, index) => (
          <HStack
            key={key}
            px={3}
            py={2}
            spacing={3}
            bg={index % 2 === 0 ? "white" : `${cs}.50`}
            justify="space-between"
          >
            <HStack spacing={2} flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="medium" color={`${cs}.800`}>
                {label}
              </Text>
              {required ? (
                <Badge colorScheme="red" fontSize="10px">
                  Required
                </Badge>
              ) : (
                <Badge colorScheme="gray" fontSize="10px">
                  Optional
                </Badge>
              )}
            </HStack>
            {suggestedKey ? (
              <Text fontSize="xs" color="gray.500" flexShrink={0}>
                e.g. {suggestedKey}
              </Text>
            ) : null}
          </HStack>
        ))}
      </Box>
    </VStack>
  );
}

function DropzoneArea({
  getRootProps,
  getInputProps,
  isDragActive,
  compact,
  colorScheme,
}) {
  const cs = colorScheme;
  return (
    <Box
      {...getRootProps()}
      p={compact ? 5 : 6}
      borderWidth="2px"
      borderStyle="dashed"
      borderColor={isDragActive ? `${cs}.400` : `${cs}.200`}
      borderRadius="md"
      bg={isDragActive ? `${cs}.50` : "gray.50"}
      cursor="pointer"
      _hover={{ borderColor: `${cs}.300`, bg: `${cs}.50` }}
      textAlign="center"
    >
      <input {...getInputProps()} />
      <Text color="gray.600" fontSize="sm">
        {isDragActive
          ? "Drop the file here..."
          : "Drop an XLSX or CSV file here, or click to select"}
      </Text>
    </Box>
  );
}

function MappingModalHeader({ children, colorScheme }) {
  const cs = colorScheme;
  return (
    <ModalHeader
      borderBottomWidth="1px"
      borderColor={`${cs}.100`}
      bg={`${cs}.50`}
      color={`${cs}.700`}
      fontSize="16px"
    >
      {children}
    </ModalHeader>
  );
}

/**
 * FileUploaderWithColumnMapping
 * - Accepts .xlsx or .csv file
 * - With renderer: action button opens upload modal (accepted columns + dropzone), then column mapping modal
 * - Without renderer: accepted columns + dropzone inline, then column mapping modal
 * - config: [{ key, label, required, suggestedKey, type: "number"|"string"|"date" }]
 * - onMappedData(mappedRows) called with array of objects keyed by config keys
 * - skipHeaders: number of rows to skip before reading headers (default: 0)
 * - renderer: optional (openUploadModal) => element; call openUploadModal to open the upload step
 */
export default function FileUploaderWithColumnMapping({
  config,
  onMappedData,
  accept = ".xlsx,.xls,.csv",
  maxFiles = 1,
  skipHeaders = 0,
  renderer,
  ...rest
}) {
  const { colorScheme } = useModuleTableTheme();
  const {
    isOpen: isUploadOpen,
    onOpen: onUploadOpen,
    onClose: onUploadClose,
  } = useDisclosure();
  const {
    isOpen: isMappingOpen,
    onOpen: onMappingOpen,
    onClose: onMappingClose,
  } = useDisclosure();
  const [fileHeaders, setFileHeaders] = useState([]);
  const [fileRows, setFileRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [fileName, setFileName] = useState("");

  const processFile = useCallback(
    (file) => {
      if (!file) return;
      parseSpreadsheetFile(file, { skipHeaders })
        .then(({ headers, rows }) => {
          setFileHeaders(headers);
          setFileRows(rows);
          setFileName(file.name);
          const initial = {};
          config.forEach(({ key, suggestedKey }) => {
            const match = headers.find(
              (h) =>
                h &&
                String(h).trim().toLowerCase() ===
                  String(suggestedKey || "")
                    .trim()
                    .toLowerCase()
            );
            initial[key] = match || headers[0] || "";
          });
          setColumnMapping(initial);
          onUploadClose();
          onMappingOpen();
        })
        .catch((err) => {
          toast.error(err.message || "Failed to parse file");
        });
    },
    [config, onMappingOpen, onUploadClose, skipHeaders]
  );

  const onDrop = useCallback(
    (acceptedFiles) => {
      processFile(acceptedFiles[0]);
    },
    [processFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    ...rest,
  });

  const handleUploadModalClose = useCallback(() => {
    onUploadClose();
  }, [onUploadClose]);

  const handleMappingModalClose = useCallback(() => {
    onMappingClose();
    setFileHeaders([]);
    setFileRows([]);
    setColumnMapping({});
    setFileName("");
  }, [onMappingClose]);

  const handleApplyMapping = useCallback(() => {
    const requiredKeys = config.filter((c) => c.required).map((c) => c.key);
    for (const key of requiredKeys) {
      const mapped = columnMapping[key];
      if (!mapped || !String(mapped).trim()) {
        const label = config.find((c) => c.key === key)?.label || key;
        toast.error(`Please map a column for required field: ${label}`);
        return;
      }
    }

    const mappedRows = fileRows.map((row) => {
      const obj = {};
      config.forEach(({ key, type = "string" }) => {
        const fileCol = columnMapping[key];
        const raw = fileCol ? row[fileCol] : undefined;
        obj[key] = coerceValue(raw, type);
      });
      return obj;
    });

    onMappedData(mappedRows);
    handleMappingModalClose();
  }, [
    config,
    columnMapping,
    fileRows,
    onMappedData,
    handleMappingModalClose,
  ]);

  const triggerElement = renderer ? (
    renderer(onUploadOpen)
  ) : (
    <Box>
      <AcceptedColumnsList config={config} colorScheme={colorScheme} />
      <DropzoneArea
        getRootProps={getRootProps}
        getInputProps={getInputProps}
        isDragActive={isDragActive}
        colorScheme={colorScheme}
      />
    </Box>
  );

  return (
    <>
      {triggerElement}

      {renderer ? (
        <Modal
          isOpen={isUploadOpen}
          onClose={handleUploadModalClose}
          size="md"
          isCentered
        >
          <ModalOverlay />
          <ModalContent borderRadius="xl" overflow="hidden">
            <MappingModalHeader colorScheme={colorScheme}>
              Import file
            </MappingModalHeader>
            <ModalBody py={4}>
              <AcceptedColumnsList config={config} colorScheme={colorScheme} />
              <DropzoneArea
                getRootProps={getRootProps}
                getInputProps={getInputProps}
                isDragActive={isDragActive}
                compact
                colorScheme={colorScheme}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" onClick={handleUploadModalClose}>
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      ) : null}

      <Modal
        isOpen={isMappingOpen}
        onClose={handleMappingModalClose}
        size="md"
        isCentered
      >
        <ModalOverlay />
        <ModalContent borderRadius="xl" overflow="hidden">
          <MappingModalHeader colorScheme={colorScheme}>
            Map columns
          </MappingModalHeader>
          <ModalBody py={4}>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Map file columns to fields. File: {fileName} ({fileRows.length}{" "}
              rows)
            </Text>
            <VStack align="stretch" spacing={4}>
              {config.map(({ key, label, required, suggestedKey }) => (
                <FormControl key={key} isRequired={required}>
                  <FormLabel fontSize="sm">
                    {label}
                    {suggestedKey ? (
                      <Text as="span" fontWeight="normal" color="gray.500">
                        {" "}
                        (e.g. {suggestedKey})
                      </Text>
                    ) : null}
                  </FormLabel>
                  <Select
                    size="sm"
                    value={columnMapping[key] || ""}
                    onChange={(e) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [key]: e.target.value,
                      }))
                    }
                    placeholder="Select column"
                    borderColor={`${colorScheme}.200`}
                    borderRadius="md"
                    _hover={{ borderColor: `${colorScheme}.300` }}
                  >
                    {fileHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h || "(empty)"}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={handleMappingModalClose}>
              Cancel
            </Button>
            <Button onClick={handleApplyMapping}>Apply mapping</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
