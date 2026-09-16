import React from "react";
import { Alert, AlertIcon, Badge, Box, Spinner, Stack, Text } from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import { scopeSummary, telegramConnectedLabel } from "../../util/telegramGroupMapping";

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
 * THE TOTAL IS ALWAYS STATED, AND IT IS COMPANY-WIDE. A branch manager sees
 * "34 employees match this mapping. 12 are visible in your branch scope." -
 * never twelve names with no indication that twenty-two others exist.
 * Leaving that out is how somebody decides a rule is wrong and deletes it.
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
            <Alert status={result.scope_limited ? "warning" : "info"} borderRadius="md">
              <AlertIcon />
              <Box fontSize="sm">
                {scopeSummary(result)}
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
                <Text fontSize="sm">
                  {result.total_matched > 0
                    ? "None of the matched employees is in your branch scope."
                    : "No currently employed staff match this mapping."}
                </Text>
              </Alert>
            )}
          </>
        )}
      </Stack>
    </CustomModal>
  );
}
