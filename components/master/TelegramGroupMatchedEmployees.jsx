import React from "react";
import { Alert, AlertIcon, Badge, Box, Spinner, Stack, Text } from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import {
  countsScopeNotice,
  emptyMatchedMessage,
  isBranchScoped,
  scopeSummary,
  telegramConnectedLabel,
} from "../../util/telegramGroupMapping";

/**
 * The employees a mapping - or the whole group - resolves to.
 *
 * SIX COLUMNS, AND THEY ARE THE ONLY SIX. Employee ID, Name, Outlet,
 * Designation, Department, Telegram Connected. No mobile number, no Telegram
 * username, user id or chat id, no salary, Aadhaar, PAN, PF, ESI, bank
 * details, address or date of birth. The server does not send any of those,
 * and this renders only what it names.
 *
 * TELEGRAM CONNECTED IS YES OR NO. It answers how much of this population is
 * already able to be added when the membership phase arrives. It says
 * nothing about WHICH Telegram account, and it does not decide whether
 * somebody matches the mapping.
 *
 * THE COUNT SAYS WHOSE EMPLOYEES IT COUNTS. A branch manager reads "12
 * employees match this mapping in your branch scope" - never a bare "12",
 * which would be false as labelled for a rule that may cover a hundred
 * people, and never a company-wide total, which is information about other
 * branches' staffing. Both halves matter: somebody who thinks a global rule
 * covers twelve people is somebody who deletes it.
 */
export default function TelegramGroupMatchedEmployees({
  isOpen,
  onClose,
  title,
  result,
  loading,
  error,
}) {
  // `columnDefs`, the prop AgGrid actually reads - see components/AgGrid.
  const columnDefs = [
    { field: "employee_id", headerName: "Employee ID", width: 130 },
    { field: "employee_name", headerName: "Employee Name", flex: 1, minWidth: 180 },
    { field: "outlet_name", headerName: "Outlet", flex: 1, minWidth: 140 },
    { field: "designation_name", headerName: "Designation", flex: 1, minWidth: 150 },
    { field: "department_name", headerName: "Department", flex: 1, minWidth: 150 },
    {
      field: "telegram_connected",
      headerName: "Telegram Connected",
      width: 180,
      valueGetter: (params) => (params.data ? telegramConnectedLabel(params.data) : ""),
    },
  ];

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} title={title || "Matched Employees"} size="5xl">
      <Stack spacing={4}>
        {loading && (
          <Box textAlign="center" py={8}>
            <Spinner color="purple.500" />
          </Box>
        )}

        {error && (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <Box fontSize="sm">{error.message || "Failed to fetch the matched employees"}</Box>
          </Alert>
        )}

        {!loading && !error && result && (
          <>
            <Alert status={isBranchScoped(result) ? "warning" : "info"} borderRadius="md">
              <AlertIcon />
              <Box fontSize="sm">
                {scopeSummary(result)}
                {countsScopeNotice(result) ? (
                  <Text as="span" color="gray.700">
                    {" "}
                    {countsScopeNotice(result)}
                  </Text>
                ) : null}
                {result.as_of_date ? (
                  <Text as="span" color="gray.600">
                    {" "}
                    As of {result.as_of_date}.
                  </Text>
                ) : null}
              </Box>
            </Alert>

            {result.employees && result.employees.length > 0 ? (
              <Box height="420px">
                <AgGrid
                  rowData={result.employees}
                  columnDefs={columnDefs}
                  tableKey="telegram-group-matched-employees"
                  gridOptions={{
                    getRowId: (params) => String(params.data?.employee_id ?? ""),
                  }}
                />
              </Box>
            ) : (
              <Alert status="info" borderRadius="md">
                <AlertIcon />
                {/* Never "nobody matches" to a branch-scoped caller - they
                    have learned only that nobody THEY MAY SEE matches. */}
                <Text fontSize="sm">{emptyMatchedMessage(result)}</Text>
              </Alert>
            )}
          </>
        )}
      </Stack>
    </CustomModal>
  );
}
