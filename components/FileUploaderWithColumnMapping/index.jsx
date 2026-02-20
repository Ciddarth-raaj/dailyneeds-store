import React, { useCallback, useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
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

/**
 * FileUploaderWithColumnMapping
 * - Accepts .xlsx or .csv file
 * - Parses file and opens a modal to map file columns to config keys
 * - config: [{ key, label, required, suggestedKey, type: "number"|"string"|"date" }]
 * - onMappedData(mappedRows) called with array of objects keyed by config keys
 * - skipHeaders: number of rows to skip before reading headers (default: 0)
 */
export default function FileUploaderWithColumnMapping({
  config,
  onMappedData,
  accept = ".xlsx,.xls,.csv",
  maxFiles = 1,
  skipHeaders = 0,
  ...rest
}) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [fileHeaders, setFileHeaders] = useState([]);
  const [fileRows, setFileRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({}); // key -> file header name
  const [fileName, setFileName] = useState("");

  const onDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
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
          onOpen();
        })
        .catch((err) => {
          toast.error(err.message || "Failed to parse file");
        });
    },
    [config, onOpen, skipHeaders]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    ...rest,
  });

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
    onClose();
    setFileHeaders([]);
    setFileRows([]);
    setColumnMapping({});
  }, [config, columnMapping, fileRows, onMappedData, onClose]);

  return (
    <>
      <Box
        {...getRootProps()}
        p={6}
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragActive ? "purple.400" : "purple.200"}
        borderRadius="md"
        bg={isDragActive ? "purple.50" : "gray.50"}
        cursor="pointer"
        _hover={{ borderColor: "purple.300", bg: "purple.50" }}
        textAlign="center"
      >
        <input {...getInputProps()} />
        <Text color="gray.600" fontSize="sm">
          {isDragActive
            ? "Drop the file here..."
            : "Drop an XLSX or CSV file here, or click to select"}
        </Text>
      </Box>

      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="xl" overflow="hidden">
          <ModalHeader
            borderBottomWidth="1px"
            borderColor="purple.100"
            bg="purple.50"
            color="purple.700"
            fontSize="16px"
          >
            Map columns
          </ModalHeader>
          <ModalBody py={4}>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Map file columns to fields. File: {fileName} ({fileRows.length}{" "}
              rows)
            </Text>
            <VStack align="stretch" spacing={4}>
              {config.map(({ key, label, required, suggestedKey }) => (
                <FormControl key={key} isRequired={required}>
                  <FormLabel fontSize="sm" color="purple.700">
                    {label}
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
                    borderColor="purple.200"
                    borderRadius="md"
                    _hover={{ borderColor: "purple.300" }}
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
            <Button
              variant="ghost"
              colorScheme="purple"
              mr={2}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleApplyMapping}>
              Apply mapping
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
