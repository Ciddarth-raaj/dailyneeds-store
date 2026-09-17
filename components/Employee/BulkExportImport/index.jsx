import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  HStack,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import toast from "react-hot-toast";

import CustomModal from "../../CustomModal";
import FileUpload from "../../FileUpload";
import EmployeeBulkUpdateHelper from "../../../helper/employeeBulkUpdate";
import { canConfirm } from "../../../util/employeeBulkUpdate";

/**
 * EMPLOYEE MASTER — BULK EXPORT / IMPORT.
 *
 * One modal, two halves, in the order somebody actually works:
 *
 *   EXPORT   pick the fields, pick the filters, download the .xlsx
 *   IMPORT   upload the edited file, read the preview, confirm
 *
 * DELIBERATELY NOT A WIZARD. The existing Employee Master screens are a grid
 * and a modal, and a five-step flow for "download a sheet, upload it back"
 * would be more ceremony than the task. The two halves sit in one dialog and
 * the import half simply reveals the preview once there is one.
 *
 * ===================================== THE UI IS NOT THE SAFETY MECHANISM ==
 *
 * `Confirm` is disabled while the preview reports a blocking error, because
 * that is the honest thing to show. It is not what STOPS a bad file: the
 * server re-runs the entire validation at confirm time and refuses the whole
 * operation if anything no longer validates, so a user who reaches the
 * endpoint another way gets the same answer. The same is true of every
 * dropdown in the exported sheet.
 *
 * WARNINGS NEVER BLOCK. A name mismatch is shown prominently - it usually
 * means rows were sorted or pasted out of line - but it is for a human to
 * judge, and the name in the file is never written either way.
 */
function BulkExportImport({ isOpen, onClose, filters = {}, onApplied }) {
  const [catalogue, setCatalogue] = useState(null);
  const [selected, setSelected] = useState([]);
  const [exporting, setExporting] = useState(false);

  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  /* ------------------------------------------------------------ catalogue */

  useEffect(() => {
    if (!isOpen || catalogue) return;
    let cancelled = false;
    EmployeeBulkUpdateHelper.getFields()
      .then((data) => {
        if (cancelled) return;
        if (data?.code && data.code !== 200) {
          toast.error(data.msg || "Could not load the bulk update fields");
          return;
        }
        setCatalogue(data);
        // Everything ticked to begin with: the common case is "export the
        // employment block, change one column". Unticking is cheaper than
        // hunting for the field somebody wanted.
        setSelected((data.update_fields || []).map((f) => f.key));
      })
      .catch(() => {
        if (!cancelled) toast.error("Could not load the bulk update fields");
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, catalogue]);

  const resetImport = useCallback(() => {
    setFile(null);
    setParsed(null);
    setPreview(null);
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    resetImport();
    onClose();
  }, [onClose, resetImport]);

  /* --------------------------------------------------------------- export */

  const toggleField = (key) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const handleExport = async () => {
    if (selected.length === 0) {
      toast.error("Select at least one field to export");
      return;
    }
    setExporting(true);
    try {
      const name = await EmployeeBulkUpdateHelper.exportXlsx({
        fields: selected,
        // The FILTERS THE LIST IS ALREADY SHOWING, so "export" means what is
        // on screen. The server scopes the population again regardless: a
        // filter can only ever narrow, and a branch outside the caller's
        // scope is refused rather than quietly dropped.
        filters,
      });
      toast.success(`Exported ${name}`);
    } catch (err) {
      toast.error(err?.message || "The export failed");
    } finally {
      setExporting(false);
    }
  };

  /* --------------------------------------------------------------- import */

  const handleFile = async (picked) => {
    resetImport();
    setFile(picked);
    if (!picked) return;

    setBusy(true);
    try {
      const { headers, rows } = await EmployeeBulkUpdateHelper.parseFile(picked);
      setParsed({ headers, rows, filename: picked.name });

      const data = await EmployeeBulkUpdateHelper.preview({
        headers,
        rows,
        filename: picked.name,
      });
      if (data?.code && data.code !== 200) {
        toast.error(data.msg || "The file could not be read");
        setParsed(null);
        return;
      }
      setPreview(data);
    } catch (err) {
      toast.error(err?.message || "The file could not be read");
      setParsed(null);
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsed || !preview) return;
    setBusy(true);
    try {
      const data = await EmployeeBulkUpdateHelper.confirm({ ...parsed, preview });

      if (data?.code === 409) {
        // The file no longer validates against current data, so NOTHING was
        // applied. The refreshed preview comes back in the same response.
        toast.error(data.msg || "Nothing was changed; please review again");
        setPreview(data);
        return;
      }
      if (data?.code && data.code !== 200) {
        toast.error(data.msg || "The bulk update failed");
        return;
      }

      setResult(data);
      const problems = (data.rows_conflicted || 0) + (data.rows_failed || 0);
      if (problems > 0) {
        toast.error(
          `${data.rows_applied} updated, ${problems} could not be applied`
        );
      } else {
        toast.success(`${data.rows_applied} employees updated`);
      }
      if (onApplied) onApplied();
    } catch (err) {
      toast.error(err?.message || "The bulk update failed");
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------------------------- render */

  const shown = result || preview;
  const changedRows = useMemo(
    () => (shown?.rows || []).filter((r) => r.has_changes),
    [shown]
  );
  const errorRows = useMemo(
    () => (shown?.rows || []).filter((r) => !r.valid),
    [shown]
  );
  const warningRows = useMemo(
    () => (shown?.rows || []).filter((r) => (r.warnings || []).length > 0),
    [shown]
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Export / Import"
      size="5xl"
      footer={
        <HStack spacing="8px">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Close
          </Button>
          {preview && !result && (
            <Button
              colorScheme="purple"
              size="sm"
              isLoading={busy}
              isDisabled={!canConfirm(preview)}
              onClick={handleConfirm}
            >
              {`Confirm Bulk Update (${preview.rows_with_changes || 0})`}
            </Button>
          )}
        </HStack>
      }
    >
      <VStack align="stretch" spacing="18px">
        {/* ------------------------------------------------------- export */}
        <Box>
          <Text fontWeight="600" mb="6px">
            1. Export
          </Text>
          <Text fontSize="sm" color="gray.600" mb="10px">
            {`Employee ID and Employee Name are always included. Employee Name is for reference only and is never changed by an import. Dates are ${
              catalogue?.date_format || "dd/mm/yyyy"
            }.`}
          </Text>

          {!catalogue ? (
            <Spinner size="sm" />
          ) : (
            <SimpleGrid columns={{ base: 2, md: 3 }} spacing="8px" mb="12px">
              {catalogue.update_fields.map((field) => (
                <Checkbox
                  key={field.key}
                  colorScheme="purple"
                  isChecked={selected.includes(field.key)}
                  onChange={() => toggleField(field.key)}
                >
                  <Text fontSize="sm">{field.label}</Text>
                </Checkbox>
              ))}
            </SimpleGrid>
          )}

          <Button
            colorScheme="purple"
            variant="outline"
            size="sm"
            isLoading={exporting}
            isDisabled={!catalogue || selected.length === 0}
            onClick={handleExport}
          >
            Export Excel
          </Button>
        </Box>

        <Divider />

        {/* ------------------------------------------------------- import */}
        <Box>
          <Text fontWeight="600" mb="6px">
            2. Upload the edited file
          </Text>
          <Text fontSize="sm" color="gray.600" mb="10px">
            A blank cell leaves the current value unchanged. Nothing is updated
            until you confirm.
          </Text>
          <FileUpload
            value={file}
            onChange={handleFile}
            /*
             * THE STRING FORM, which is what react-dropzone 11 accepts - the
             * same spelling every other FileUpload in this repo uses.
             *
             * The `{mime: [ext]}` object form is react-dropzone 12+ syntax.
             * On 11 it reaches `attr-accept`, which does `accepts.split(",")`
             * on whatever it is handed and throws `TypeError: r.split is not
             * a function` for an object. That happens inside the drop / file
             * -selection handler, so the file was never accepted, onDropAccepted
             * never fired, and choosing a file did NOTHING AT ALL - no error,
             * no preview, no reaction. A build cannot catch it because a build
             * never runs the dropzone.
             */
            accept=".xlsx,.xls,.csv"
            placeholderText="Drag the edited .xlsx here, or click to select"
          />
          {busy && !shown && (
            <HStack mt="10px">
              <Spinner size="sm" />
              <Text fontSize="sm">Validating…</Text>
            </HStack>
          )}
        </Box>

        {/* ------------------------------------------------------ preview */}
        {shown && (
          <Box>
            <Text fontWeight="600" mb="10px">
              {result ? "3. Result" : "3. Preview"}
            </Text>

            <SimpleGrid columns={{ base: 2, md: 4 }} spacing="10px" mb="14px">
              <Summary label="Rows uploaded" value={shown.rows_uploaded} />
              <Summary label="Valid rows" value={shown.valid_rows} />
              <Summary
                label="Error rows"
                value={shown.error_rows}
                tone={shown.error_rows > 0 ? "red" : undefined}
              />
              <Summary
                label="Warning rows"
                value={shown.warning_rows}
                tone={shown.warning_rows > 0 ? "orange" : undefined}
              />
              <Summary
                label={result ? "Employees updated" : "Employees with changes"}
                value={result ? result.rows_applied : shown.rows_with_changes}
                tone="purple"
              />
              <Summary
                label="Rows with no changes"
                value={result ? result.rows_unchanged : shown.rows_without_changes}
              />
              {result && (
                <Summary
                  label="Conflicts"
                  value={result.rows_conflicted}
                  tone={result.rows_conflicted > 0 ? "red" : undefined}
                />
              )}
              {result && (
                <Summary
                  label="Failed"
                  value={result.rows_failed}
                  tone={result.rows_failed > 0 ? "red" : undefined}
                />
              )}
            </SimpleGrid>

            {!result && shown.error_rows > 0 && (
              <Alert status="error" borderRadius="md" mb="12px" fontSize="sm">
                <AlertIcon />
                Fix every error row and upload the file again. Nothing can be
                confirmed while there are errors.
              </Alert>
            )}
            {!result && shown.error_rows === 0 && shown.rows_with_changes === 0 && (
              <Alert status="info" borderRadius="md" mb="12px" fontSize="sm">
                <AlertIcon />
                This file matches the current data exactly, so there is nothing
                to update.
              </Alert>
            )}

            {errorRows.length > 0 && (
              <Section title={`Errors (${errorRows.length})`}>
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th width="70px">Row</Th>
                      <Th width="110px">Employee</Th>
                      <Th>Reason</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {errorRows.map((r) => (
                      <Tr key={`e-${r.row_number}`}>
                        <Td>{r.row_number}</Td>
                        <Td>{r.raw?.employee_id || "—"}</Td>
                        <Td>
                          <Text color="red.600" fontSize="sm">
                            {r.errors.join("; ")}
                          </Text>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Section>
            )}

            {warningRows.length > 0 && (
              <Section title={`Warnings (${warningRows.length})`}>
                <VStack align="stretch" spacing="6px">
                  {warningRows.map((r) => (
                    <Text key={`w-${r.row_number}`} fontSize="sm" color="orange.600">
                      {`Row ${r.row_number}: ${r.warnings.join("; ")}`}
                    </Text>
                  ))}
                </VStack>
              </Section>
            )}

            {changedRows.length > 0 && (
              <Section
                title={`${result ? "Changes" : "Changes to be made"} (${changedRows.length})`}
              >
                <VStack align="stretch" spacing="10px">
                  {changedRows.map((r) => (
                    <Box
                      key={`c-${r.row_number}`}
                      borderWidth="1px"
                      borderColor="gray.100"
                      borderRadius="md"
                      p="10px"
                    >
                      <Flex align="center" gap="8px" mb="4px">
                        <Text fontWeight="600" fontSize="sm">
                          {`Employee ${r.employee_id} — ${r.employee_name || ""}`}
                        </Text>
                        {r.outcome && <OutcomeBadge outcome={r.outcome} />}
                        {r.sessions_revoked && (
                          <Badge colorScheme="purple" fontSize="10px">
                            sessions signed out
                          </Badge>
                        )}
                      </Flex>
                      {r.changes.map((c) => (
                        <Text key={c.field} fontSize="sm" color="gray.700">
                          {`• ${c.label}: ${c.from_display || "—"} → ${c.to_display}`}
                        </Text>
                      ))}
                      {r.failure_reason && (
                        <Text fontSize="sm" color="red.600" mt="4px">
                          {r.failure_reason}
                        </Text>
                      )}
                    </Box>
                  ))}
                </VStack>
              </Section>
            )}
          </Box>
        )}
      </VStack>
    </CustomModal>
  );
}

function Summary({ label, value, tone }) {
  return (
    <Stat
      borderWidth="1px"
      borderColor={tone ? `${tone}.100` : "gray.100"}
      bg={tone ? `${tone}.50` : "gray.50"}
      borderRadius="md"
      px="10px"
      py="6px"
    >
      <StatLabel fontSize="11px" color="gray.600">
        {label}
      </StatLabel>
      <StatNumber fontSize="18px" color={tone ? `${tone}.700` : "gray.800"}>
        {value ?? 0}
      </StatNumber>
    </Stat>
  );
}

function Section({ title, children }) {
  return (
    <Box mb="14px">
      <Text fontSize="sm" fontWeight="600" mb="6px">
        {title}
      </Text>
      {children}
    </Box>
  );
}

/** APPLIED / NO_CHANGE / CONFLICT / FAILED, as the server reported it. */
function OutcomeBadge({ outcome }) {
  const scheme = {
    APPLIED: "green",
    NO_CHANGE: "gray",
    CONFLICT: "red",
    FAILED: "red",
    ERROR: "red",
  }[outcome];
  return (
    <Badge colorScheme={scheme || "gray"} fontSize="10px">
      {String(outcome).replace("_", " ").toLowerCase()}
    </Badge>
  );
}

export default BulkExportImport;
