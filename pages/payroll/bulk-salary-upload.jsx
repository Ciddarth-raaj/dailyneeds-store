import React, { useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Code,
  Divider,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { InvalidRowsTable, ValidRowsTable } from "../../components/payroll/BulkSalaryRows";
import usePayrollActor from "../../customHooks/usePayrollActor";
import PayrollSalaryHelper from "../../helper/payrollSalary";
import { canOpenBulkSalaryUpload } from "../../util/payrollAccess";
import { describeApiResult, KIND } from "../../util/salaryApiError";
import { parseSpreadsheetFile } from "../../util/parseSpreadsheetFile";
import {
  REJECTED_FILENAME,
  TEMPLATE_COLUMNS,
  TEMPLATE_FILENAME,
  extraColumns,
  missingColumns,
  rejectedRowsCsv,
  summarize,
  templateCsv,
  toApiRows,
  validRowsFor,
} from "../../util/bulkSalaryUpload";

/**
 * M5 — Bulk Salary Upload.
 *
 * ONE SCREEN FOR BOTH KINDS OF ROW, AND THE USER CHOOSES NEITHER. A file may
 * contain opening salaries for people who have never had one and revisions for
 * people who have; the server reads each employee's own salary lifecycle and
 * decides which each row is. There is no "opening or revision" control here,
 * because there is no question for a person to answer.
 *
 * FIVE STEPS, IN ORDER: Download Template → Upload → Validate → Preview →
 * Submit. Nothing is written until the last one, and the fourth exists so that
 * nobody writes a hundred proposals without having read what they say.
 *
 * THE BROWSER DOES NOT CALCULATE, CLASSIFY OR VALIDATE ANYTHING. It reads a
 * spreadsheet into three named cells and posts them. Every verdict, every
 * amount, every effective date and every error sentence on this screen came
 * back from `POST /hr/salary/bulk/validate`. The one thing checked locally is
 * whether the FILE has the three columns at all - because a file with the
 * wrong headings would otherwise upload six hundred rows that every one come
 * back "Employee ID is required", which says once-over what is wrong with the
 * file six hundred times.
 *
 * SUBMIT SENDS ONLY THE ROWS THAT PASSED, AND THE SERVER CHECKS THEM AGAIN.
 * There is no validation token: a proposal can be raised for one of these
 * employees between the preview and the click, so a row that has since become
 * invalid comes back as a per-row failure rather than being written on the
 * strength of a check that has expired.
 *
 * NOTHING HERE APPROVES ANYTHING. Every row created lands PENDING and is
 * decided on Salary Approval, including one uploaded by an administrator. Bulk
 * is a faster way to PROPOSE.
 *
 * THERE IS NO MANUAL COMPONENT OVERRIDE IN BULK. The template has three
 * columns; departing from the automatic breakup is a per-employee statutory
 * decision that needs its own reason, and it is made on Salary Revision &
 * History where that reason can be written and read.
 */

/** The browser download, done the way every other export in this repo does it. */
function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function BulkSalaryUpload() {
  const toast = useToast();
  const actor = usePayrollActor();
  const mayOpen = canOpenBulkSalaryUpload(actor);

  const fileInput = useRef(null);

  const [fileName, setFileName] = useState(null);
  const [apiRows, setApiRows] = useState([]);
  const [fileProblem, setFileProblem] = useState(null);
  const [dropped, setDropped] = useState([]);

  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);

  const [submission, setSubmission] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [problem, setProblem] = useState(null);

  /** Everything a new file invalidates. A stale preview is a wrong preview. */
  const resetResults = () => {
    setValidation(null);
    setSubmission(null);
    setProblem(null);
  };

  const onTemplate = () => downloadText(TEMPLATE_FILENAME, templateCsv());

  const onFile = async (event) => {
    const file = event.target.files && event.target.files[0];
    // The input keeps its value, so re-picking the SAME corrected file after a
    // failed validation must still fire a change event.
    event.target.value = "";
    if (!file) return;

    setFileName(file.name);
    setApiRows([]);
    setDropped([]);
    setFileProblem(null);
    resetResults();

    try {
      const { headers, rows } = await parseSpreadsheetFile(file);
      const missing = missingColumns(headers);
      if (missing.length > 0) {
        setFileProblem(
          `This file is missing ${missing.join(", ")}. Download the template and use its exact column headings.`
        );
        return;
      }
      const normalized = toApiRows(rows);
      if (normalized.length === 0) {
        setFileProblem("This file has no rows to validate.");
        return;
      }
      setApiRows(normalized);
      setDropped(extraColumns(headers));
    } catch (err) {
      setFileProblem(
        (err && err.message) || "The file could not be read. Use a .csv, .xlsx or .xls file."
      );
    }
  };

  const onValidate = async () => {
    if (apiRows.length === 0) return;
    setValidating(true);
    setProblem(null);
    setSubmission(null);
    try {
      const body = await PayrollSalaryHelper.bulkValidate(apiRows);
      const outcome = describeApiResult(body);
      if (outcome.kind !== KIND.OK) {
        setValidation(null);
        setProblem(outcome);
        return;
      }
      setValidation(body);
    } catch (err) {
      setValidation(null);
      setProblem({ kind: KIND.ERROR, message: "The file could not be validated. Please try again." });
    } finally {
      setValidating(false);
    }
  };

  const onSubmit = async () => {
    const rows = validRowsFor(validation);
    if (submitting || rows.length === 0) return;

    setSubmitting(true);
    setProblem(null);
    try {
      // ONLY the rows that passed. The invalid ones are not sent at all, and
      // the server revalidates the ones that are.
      const body = await PayrollSalaryHelper.bulkSubmit(rows);
      const outcome = describeApiResult(body);
      if (outcome.kind !== KIND.OK) {
        setProblem(outcome);
        return;
      }
      setSubmission(body);
      const done = summarize(body);
      toast({
        title: `${done.created} salary ${done.created === 1 ? "proposal" : "proposals"} created as Pending.`,
        description:
          done.created === done.total
            ? "They are waiting for approval on Salary Approval."
            : `${done.total - done.created} row(s) could not be created — see the failures below.`,
        status: done.created === done.total ? "success" : "warning",
        duration: 6000,
        isClosable: true,
      });
    } catch (err) {
      setProblem({ kind: KIND.ERROR, message: "The upload could not be submitted. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const totals = validation ? summarize(validation) : null;
  const validRows = validation ? validation.rows.filter((r) => r.valid) : [];
  const invalidRows = validation ? validation.rows.filter((r) => !r.valid) : [];
  const failedRows = submission ? submission.rows.filter((r) => !r.created) : [];
  const submitted = Boolean(submission);

  const body = () => {
    if (!mayOpen) {
      return (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          You do not have permission to upload salaries. This screen needs View Employees, View
          Salary and Add Salary.
        </Alert>
      );
    }

    return (
      <Stack spacing={4}>
        {/* ------------------------------------------------ 1. the template -- */}
        <CustomContainer
          title="1. Download the template"
          subtitle="Three columns, and there are no others. Everything else — the breakup, the contributions, the CTC — is calculated by the server."
          smallHeader
        >
          <Stack spacing={3}>
            <Stack direction={{ base: "column", md: "row" }} spacing={2} align="flex-start">
              <Button size="sm" colorScheme="purple" variant="outline" onClick={onTemplate}>
                Download Template
              </Button>
            </Stack>
            <Box>
              <Text fontSize="11px" fontWeight="bold" color="gray.600" mb={1}>
                Required Columns
              </Text>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                {TEMPLATE_COLUMNS.map((column) => (
                  <Badge key={column} colorScheme="purple" fontSize="9px" mb={1}>
                    {column}
                  </Badge>
                ))}
              </Stack>
              <Text fontSize="xs" color="gray.600" mt={2}>
                Effective From must be written as <Code fontSize="xs">YYYY-MM-DD</Code>. For an
                employee who has never had a salary, the row is an Opening Salary and its Effective
                From must be the date the opening rule resolves to — the later of 01 Apr 2026 and
                the date of joining. A row whose date disagrees is refused and tells you the date it
                should carry; nothing is corrected silently.
              </Text>
              <Text fontSize="xs" color="gray.600" mt={1}>
                One row per employee. An employee may hold only one salary proposal at a time, so
                two rows for the same person are both refused even when their dates differ.
              </Text>
            </Box>
          </Stack>
        </CustomContainer>

        {/* -------------------------------------------------- 2. the upload -- */}
        <CustomContainer
          title="2. Upload and validate"
          subtitle="Nothing is written by validating. Every row is checked against the salary lifecycle as it is right now."
          smallHeader
        >
          <Stack spacing={3}>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFile}
              style={{ display: "none" }}
            />
            <Stack direction={{ base: "column", md: "row" }} spacing={2}>
              <Button
                size="sm"
                colorScheme="purple"
                variant="outline"
                onClick={() => fileInput.current && fileInput.current.click()}
                isDisabled={validating || submitting}
              >
                Choose File
              </Button>
              <Button
                size="sm"
                colorScheme="purple"
                onClick={onValidate}
                isLoading={validating}
                loadingText="Validating"
                isDisabled={apiRows.length === 0 || submitting}
              >
                Validate
              </Button>
            </Stack>

            {fileName ? (
              <Text fontSize="xs" color="gray.600">
                {fileName}
                {apiRows.length > 0 ? ` — ${apiRows.length} row(s) read` : ""}
              </Text>
            ) : (
              <Text fontSize="xs" color="gray.600">
                Choose a .csv, .xlsx or .xls file that uses the template&apos;s column headings.
              </Text>
            )}

            {dropped.length > 0 ? (
              <Alert status="info" fontSize="xs">
                <AlertIcon />
                {dropped.join(", ")} {dropped.length === 1 ? "is" : "are"} not part of the template
                and {dropped.length === 1 ? "was" : "were"} not uploaded. Only Employee ID, Monthly
                Gross Salary and Effective From are sent.
              </Alert>
            ) : null}

            {fileProblem ? (
              <Alert status="error" fontSize="sm">
                <AlertIcon />
                {fileProblem}
              </Alert>
            ) : null}

            {problem ? (
              <Alert status={problem.kind === KIND.DENIED ? "info" : "error"} fontSize="sm">
                <AlertIcon />
                {problem.message}
              </Alert>
            ) : null}
          </Stack>
        </CustomContainer>

        {/* ------------------------------------------------- 3. the preview -- */}
        {totals ? (
          <CustomContainer
            title="3. Preview"
            subtitle="What will be created, and what will not. Read this before submitting — it is the last point at which nothing has been written."
            smallHeader
          >
            <Stack spacing={4}>
              <SimpleGrid columns={{ base: 3, md: 3 }} spacing={3}>
                <Box>
                  <Text fontSize="10px" textTransform="uppercase" color="gray.500">
                    Total Rows
                  </Text>
                  <Text fontSize="lg" fontWeight="bold">
                    {totals.total}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="10px" textTransform="uppercase" color="gray.500">
                    Valid
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="green.600">
                    {totals.valid}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="10px" textTransform="uppercase" color="gray.500">
                    Invalid
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="red.600">
                    {totals.invalid}
                  </Text>
                </Box>
              </SimpleGrid>

              {validRows.length > 0 ? (
                <Box>
                  <Text fontSize="11px" fontWeight="bold" color="gray.600" mb={1.5}>
                    Will be created ({validRows.length}) — every one as Pending
                  </Text>
                  <ValidRowsTable rows={validRows} />
                </Box>
              ) : null}

              {invalidRows.length > 0 ? (
                <Box>
                  <Stack direction="row" align="center" spacing={2} mb={1.5} flexWrap="wrap">
                    <Text fontSize="11px" fontWeight="bold" color="gray.600">
                      Will not be created ({invalidRows.length})
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="purple"
                      onClick={() => downloadText(REJECTED_FILENAME, rejectedRowsCsv(invalidRows))}
                    >
                      Download rejected rows
                    </Button>
                  </Stack>
                  <InvalidRowsTable rows={invalidRows} />
                </Box>
              ) : null}

              <Divider />

              <Stack direction={{ base: "column", md: "row" }} spacing={2} align="flex-start">
                <Button
                  size="sm"
                  colorScheme="purple"
                  onClick={onSubmit}
                  isLoading={submitting}
                  loadingText="Submitting"
                  isDisabled={totals.valid === 0 || validating || submitted}
                >
                  Submit {totals.valid} valid row{totals.valid === 1 ? "" : "s"}
                </Button>
                <Text fontSize="xs" color="gray.600">
                  Only the valid rows are sent. Each one is checked again on the server, and every
                  proposal created is Pending until somebody approves it on Salary Approval.
                </Text>
              </Stack>
            </Stack>
          </CustomContainer>
        ) : null}

        {/* -------------------------------------------------- 4. the result -- */}
        {submission ? (
          <CustomContainer
            title="4. Result"
            subtitle="What the server actually created, row by row."
            smallHeader
          >
            <Stack spacing={4}>
              <SimpleGrid columns={{ base: 3, md: 3 }} spacing={3}>
                <Box>
                  <Text fontSize="10px" textTransform="uppercase" color="gray.500">
                    Submitted
                  </Text>
                  <Text fontSize="lg" fontWeight="bold">
                    {submission.total_rows}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="10px" textTransform="uppercase" color="gray.500">
                    Created (Pending)
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="green.600">
                    {submission.created_rows}
                  </Text>
                </Box>
                <Box>
                  <Text fontSize="10px" textTransform="uppercase" color="gray.500">
                    Failed
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="red.600">
                    {submission.failed_rows}
                  </Text>
                </Box>
              </SimpleGrid>

              {failedRows.length > 0 ? (
                <Box>
                  <Stack direction="row" align="center" spacing={2} mb={1.5} flexWrap="wrap">
                    <Text fontSize="11px" fontWeight="bold" color="gray.600">
                      Could not be created ({failedRows.length})
                    </Text>
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="purple"
                      onClick={() => downloadText(REJECTED_FILENAME, rejectedRowsCsv(failedRows))}
                    >
                      Download failed rows
                    </Button>
                  </Stack>
                  {/* A row that was valid at preview and failed at submit is
                      the race this revalidation exists to catch. It is shown
                      exactly as the server worded it - and without a row
                      number, because only the valid rows were sent and the
                      numbering no longer matches the file. */}
                  <InvalidRowsTable rows={failedRows} showRowNumber={false} />
                </Box>
              ) : (
                <Alert status="success" fontSize="sm">
                  <AlertIcon />
                  Every submitted row was created. They are waiting for approval on Salary
                  Approval.
                </Alert>
              )}

              <Text fontSize="xs" color="gray.600">
                Upload another file by choosing one above; validating again replaces this result.
              </Text>
            </Stack>
          </CustomContainer>
        ) : null}
      </Stack>
    );
  };

  return (
    <GlobalWrapper title="Bulk Salary Upload">
      <CustomContainer
        title="Bulk Salary Upload"
        subtitle="Opening salaries and revisions in one file. The system decides which each row is; every row created is Pending and is approved on Salary Approval."
      >
        {body()}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default BulkSalaryUpload;
