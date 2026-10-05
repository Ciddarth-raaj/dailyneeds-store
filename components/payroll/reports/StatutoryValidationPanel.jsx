import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  HStack,
  Input,
  Select,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";

/**
 * Payroll Reports - the EPF (ECR) / ESI (contribution file) validation.
 *
 * Every relevant employee is Ready or Blocked, and a blocked employee is
 * listed by name with every reason. A statutory file is ALL OR NOTHING:
 * while anybody is blocked the download stays disabled, and the server
 * refuses it too. There is no "ready employees only" file.
 *
 * The statutory file does not depend on the columns chosen for the visible
 * report - it is a fixed layout generated on the server.
 *
 * ESI zero-day employees need a reason code (and, for some codes, a last
 * working day). Choosing one here applies to this download only; it is sent
 * with the request and validated again on the server.
 */
const ZERO_DAY_CODES = new Set(["ZERO_REASON_MISSING", "ZERO_REASON_INVALID", "LWD_MISSING", "LWD_INVALID"]);

function StatutoryValidationPanel({
  kind,
  validation,
  loading,
  error,
  reasonCodes,
  overrides,
  onOverride,
  onRevalidate,
}) {
  const fileName = kind === "EPF" ? "ECR file" : "contribution file";
  if (loading && !validation) {
    return (
      <HStack fontSize="sm" color="gray.600">
        <Spinner size="sm" />
        <Text>Validating employees for the {fileName}...</Text>
      </HStack>
    );
  }
  if (error) {
    return (
      <Alert status="error" fontSize="sm">
        <AlertIcon />
        {error}
      </Alert>
    );
  }
  if (!validation) return null;

  const { summary, blocked } = validation;
  const needsReason = (b) => kind === "ESI" && b.reasons.some((r) => ZERO_DAY_CODES.has(r.code));
  const codeInfo = (code) => (reasonCodes || []).find((c) => c.code === Number(code));

  return (
    <Box borderWidth="1px" borderRadius="8px" padding="12px" data-testid="statutory-validation">
      <HStack spacing="12px" wrap="wrap" marginBottom={blocked.length ? "10px" : 0}>
        <Text fontWeight="bold" fontSize="sm">
          {kind === "EPF" ? "ECR validation" : "ESIC contribution file validation"}
        </Text>
        <Badge colorScheme="green" fontSize="12px">
          Ready: {summary.ready} employee{summary.ready === 1 ? "" : "s"}
        </Badge>
        <Badge colorScheme={summary.blocked ? "red" : "gray"} fontSize="12px">
          Blocked: {summary.blocked} employee{summary.blocked === 1 ? "" : "s"}
        </Badge>
        {loading ? <Spinner size="xs" /> : null}
        <Button size="xs" variant="ghost" onClick={onRevalidate}>
          Re-validate
        </Button>
      </HStack>

      {blocked.length > 0 ? (
        <Stack spacing="10px">
          <Box maxHeight="260px" overflowY="auto" borderWidth="1px" borderRadius="6px">
            <Table size="sm">
              <Thead position="sticky" top={0} bg="white">
                <Tr>
                  <Th>Employee ID</Th>
                  <Th>Name</Th>
                  <Th>Why blocked</Th>
                  {kind === "ESI" ? <Th>Zero-day reason / Last working day</Th> : null}
                </Tr>
              </Thead>
              <Tbody>
                {blocked.map((b) => {
                  const o = (overrides && overrides[b.employee_id]) || {};
                  const info = codeInfo(o.reason_code);
                  return (
                    <Tr key={b.employee_id}>
                      <Td>{b.employee_id}</Td>
                      <Td>{b.employee_name}</Td>
                      <Td>
                        {b.reasons.map((r) => (
                          <Text key={r.code + r.message} fontSize="xs" color="red.700">
                            {r.message}
                          </Text>
                        ))}
                      </Td>
                      {kind === "ESI" ? (
                        <Td>
                          {needsReason(b) ? (
                            <HStack spacing="6px">
                              <Select
                                size="xs"
                                placeholder="Reason code"
                                value={o.reason_code === undefined || o.reason_code === null ? "" : o.reason_code}
                                onChange={(e) =>
                                  onOverride(b.employee_id, {
                                    ...o,
                                    reason_code: e.target.value === "" ? null : Number(e.target.value),
                                  })
                                }
                                aria-label={`Zero-day reason for ${b.employee_id}`}
                              >
                                {(reasonCodes || []).map((c) => (
                                  <option key={c.code} value={c.code}>
                                    {c.code} - {c.label}
                                  </option>
                                ))}
                              </Select>
                              {info && info.requires_last_working_day ? (
                                <Input
                                  size="xs"
                                  type="date"
                                  value={o.last_working_day || ""}
                                  onChange={(e) => onOverride(b.employee_id, { ...o, last_working_day: e.target.value })}
                                  aria-label={`Last working day for ${b.employee_id}`}
                                />
                              ) : null}
                            </HStack>
                          ) : (
                            <Text fontSize="xs" color="gray.500">
                              -
                            </Text>
                          )}
                        </Td>
                      ) : null}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
          <Text fontSize="sm" color="red.700" fontWeight="semibold" data-testid="statutory-blocked-note">
            The {fileName} cannot be generated while any employee is blocked. Resolve every employee listed above
            {kind === "ESI" ? " (choose a reason for zero-day employees, then Re-validate)" : ""}.
          </Text>
        </Stack>
      ) : null}
    </Box>
  );
}

export default StatutoryValidationPanel;
