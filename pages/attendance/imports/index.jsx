import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomModal from "../../../components/CustomModal";
import AgGrid from "../../../components/AgGrid";
import AttendanceHelper from "../../../helper/attendance";
import {
  BATCH_STATUS_LABEL,
  BATCH_STATUS_TONE,
  CLASSIFICATION_LABEL,
  CLASSIFICATION_TONE,
  ITEMS_PAGE_SIZE,
  ITEM_FILTERS,
  batchFacts,
  canCommit,
  commitPlan,
  commitResultMessage,
  dateRangeText,
  displayDate,
  displayDateTime,
  formatBytes,
  formatCount,
  itemColumns,
  itemsQuery,
  outcomeRows,
  pageCount,
  requestErrorMessage,
  summaryCards,
  validateSelectedFile,
} from "../../../util/attendanceImport";

/**
 * Attendance Import - the permanent DigiSME fallback, as a screen.
 *
 * TWO TABS.
 *
 *   New Import      choose the DigiSME ATD Daily Attendance export, PREVIEW
 *                   it, read what the server found, then commit it
 *                   deliberately. Preview writes no punch; commit is the only
 *                   thing that does, and only for a batch that was previewed.
 *   Import History  every batch ever previewed or committed, permanently.
 *                   There is no delete: this is audit history.
 *
 * THE BROWSER DOES NOT READ THE WORKBOOK. The file is posted as-is and every
 * count, classification, employee match and attendance date on this page is
 * the server's answer, redisplayed. Nothing here calculates attendance: no
 * IN/OUT, no hours, no status.
 *
 * A collision is not data loss and is not presented as one. An unmatched
 * employee code does not lose the punch either. Only a bad row or cell is
 * skipped, and only that row or cell.
 */
export default function AttendanceImportPage() {
  const [tab, setTab] = useState(0);
  const [historyToken, setHistoryToken] = useState(0);
  const [openBatchId, setOpenBatchId] = useState(null);

  return (
    <GlobalWrapper title="Attendance Import" permissionKey={["manage_attendance_import"]}>
      <Tabs index={tab} onChange={setTab} colorScheme="purple" isLazy>
        <TabList mb={3}>
          <Tab>New Import</Tab>
          <Tab>Import History</Tab>
        </TabList>
        <TabPanels>
          <TabPanel p={0}>
            <NewImportTab onCommitted={() => setHistoryToken((t) => t + 1)} />
          </TabPanel>
          <TabPanel p={0}>
            <ImportHistoryTab
              refreshToken={historyToken}
              openBatchId={openBatchId}
              onOpenBatch={setOpenBatchId}
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </GlobalWrapper>
  );
}

/* ====================================================== shared fragments */

function Facts({ batch }) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={3} mb={4}>
      {batchFacts(batch).map((f) => (
        <Box key={f.key}>
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            {f.label}
          </Text>
          <Text fontSize="sm" fontWeight="medium" wordBreak="break-word">
            {f.value}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  );
}

/** The five counts. Each card says what its number MEANS, not just how many. */
function SummaryCards({ batch, onPick, active }) {
  return (
    <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 5 }} spacing={3}>
      {summaryCards(batch).map((c) => (
        <Box
          key={c.key}
          borderWidth="1px"
          borderRadius="md"
          borderColor={active === c.classification ? `${c.tone}.400` : "gray.200"}
          p={3}
          cursor={onPick && c.count > 0 ? "pointer" : "default"}
          onClick={onPick && c.count > 0 ? () => onPick(c.classification) : undefined}
        >
          <Flex align="center" justify="space-between" mb={1}>
            <Text fontSize="xs" color="gray.600" fontWeight="semibold">
              {c.label}
            </Text>
            <Badge colorScheme={c.tone}>{formatCount(c.count)}</Badge>
          </Flex>
          <Text fontSize="xs" color="gray.500" lineHeight="short">
            {c.note}
          </Text>
        </Box>
      ))}
    </SimpleGrid>
  );
}

function UnmatchedCodes({ codes }) {
  if (!codes || codes.length === 0) return null;
  return (
    <CustomContainer
      title="Unmatched Employee Codes"
      subtitle="These Employee Codes are not in the employee master on dnds.co.in. Their punches are still imported and kept, with the code recorded, exactly as a live punch from an unknown code is. Nothing on this screen changes employee identity."
      filledHeader
    >
      <Box overflowX="auto">
        <Box as="table" width="100%" fontSize="sm">
          <Box as="thead">
            <Box as="tr" textAlign="left" color="gray.600">
              <Box as="th" py={2} pr={6}>Employee Code</Box>
              <Box as="th" py={2} pr={6}>Punch Count</Box>
              <Box as="th" py={2}>First Excel Row</Box>
            </Box>
          </Box>
          <Box as="tbody">
            {codes.map((c) => (
              <Box as="tr" key={c.user_id} borderTopWidth="1px">
                <Box as="td" py={2} pr={6} fontFamily="mono">{c.user_id}</Box>
                <Box as="td" py={2} pr={6}>{formatCount(c.punches)}</Box>
                <Box as="td" py={2}>{c.first_excel_row}</Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </CustomContainer>
  );
}

/** The paginated exception grid. Every page is a server request. */
function ItemsSection({ importBatchId, initialFilter }) {
  const [classification, setClassification] = useState(initialFilter || "");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setClassification(initialFilter || "");
    setPage(1);
  }, [initialFilter, importBatchId]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!importBatchId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await AttendanceHelper.getAttendanceImportItems(
          itemsQuery(importBatchId, classification, page, ITEMS_PAGE_SIZE)
        );
        if (cancelled) return;
        if (res && res.code === 200) setData(res.data || { rows: [], total: 0 });
        else setError(requestErrorMessage(res, "Could not load the import rows"));
      } catch (err) {
        console.log(err);
        if (!cancelled) setError("Could not reach the server");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [importBatchId, classification, page]);

  const colDefs = useMemo(
    () =>
      itemColumns(classification).map((c) => {
        if (c.key === "classification") {
          return {
            field: "classification",
            headerName: c.header,
            minWidth: c.width,
            valueGetter: (p) => (p.data ? CLASSIFICATION_LABEL[p.data.classification] || p.data.classification : ""),
            cellRenderer: (p) =>
              p.data ? (
                <Badge colorScheme={CLASSIFICATION_TONE[p.data.classification] || "gray"}>
                  {CLASSIFICATION_LABEL[p.data.classification] || p.data.classification}
                </Badge>
              ) : null,
          };
        }
        if (c.key === "attendance_date") {
          return {
            field: "attendance_date",
            headerName: c.header,
            minWidth: c.width,
            valueGetter: (p) => (p.data ? displayDate(p.data.attendance_date) : ""),
          };
        }
        return { field: c.key, headerName: c.header, minWidth: c.width };
      }),
    [classification]
  );

  const pages = pageCount(data.total, ITEMS_PAGE_SIZE);

  return (
    <CustomContainer
      title="Rows and exceptions"
      subtitle="Every punch candidate the server read from the workbook, and why it was classified as it was. Imported punches have no device and no punch location - that is correct, not missing data."
      filledHeader
    >
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        {ITEM_FILTERS.map((f) => (
          <Button
            key={f.key || "all"}
            size="xs"
            mb={1}
            variant={classification === f.key ? "solid" : "outline"}
            colorScheme="purple"
            onClick={() => {
              setClassification(f.key);
              setPage(1);
            }}
          >
            {f.label}
          </Button>
        ))}
      </Stack>

      {error ? (
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          {error}
        </Alert>
      ) : loading ? (
        <Stack align="center" py={8}>
          <Spinner color="purple.500" />
        </Stack>
      ) : (
        <>
          <AgGrid rowData={data.rows || []} colDefs={colDefs} tableKey="attendance-import-items" hideExport />
          <Flex mt={3} align="center" justify="space-between" flexWrap="wrap" gridGap={2}>
            <Text fontSize="sm" color="gray.600">
              {formatCount(data.total)} row(s){classification ? ` classified ${CLASSIFICATION_LABEL[classification]}` : ""}
            </Text>
            <Stack direction="row" spacing={2} align="center">
              <Button size="xs" variant="outline" isDisabled={page <= 1} onClick={() => setPage((p) => Math.max(p - 1, 1))}>
                Previous
              </Button>
              <Text fontSize="sm">
                Page {page} of {pages}
              </Text>
              <Button size="xs" variant="outline" isDisabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </Stack>
          </Flex>
        </>
      )}
    </CustomContainer>
  );
}

/* ========================================================== New Import */

function NewImportTab({ onCommitted }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [filterFromCard, setFilterFromCard] = useState("");

  const batch = preview ? preview.batch : null;
  const committed = Boolean(batch) && batch.status !== "PREVIEWED";

  const onChooseFile = (e) => {
    // While a staged batch is being committed the choice is ignored outright:
    // the operator must not be able to swap the file under a commit in
    // flight. The input is disabled too; this is the guard behind it.
    if (committing) return;
    const next = (e.target.files && e.target.files[0]) || null;
    // ANY new selection invalidates what is on screen, even a file with the
    // same name and size. Two different workbooks can agree on both, and the
    // staged batch belongs to the bytes that were actually uploaded - which
    // the browser deliberately does not read to compare. So the preview is
    // cleared and the operator previews again.
    setPreview(null);
    setFilterFromCard("");
    setFile(next);
    setError(null);
  };

  const reset = () => {
    if (committing) return;
    setFile(null);
    setPreview(null);
    setError(null);
    setFilterFromCard("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runPreview = async () => {
    // No new preview while a batch is being committed, and never twice at once.
    if (previewing || committing) return;
    const check = validateSelectedFile(file);
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setPreviewing(true);
    setError(null);
    try {
      const res = await AttendanceHelper.previewDigiSmeImport(file);
      if (res && res.code === 200) {
        setPreview(res);
        setFilterFromCard("");
      } else {
        setPreview(null);
        setError(requestErrorMessage(res, "The file could not be previewed"));
      }
    } catch (err) {
      console.log(err);
      setError("Could not reach the server");
    } finally {
      setPreviewing(false);
    }
  };

  const refreshDetails = async (batchId) => {
    const res = await AttendanceHelper.getAttendanceImportDetails(batchId);
    if (res && res.code === 200 && res.data) setPreview({ code: 200, ...res.data });
  };

  const runCommit = async () => {
    if (committing || !batch) return;
    setCommitting(true);
    setConfirmOpen(false);
    try {
      const res = await AttendanceHelper.commitAttendanceImport(batch.import_batch_id);
      if (res && res.code === 200) {
        setPreview(res);
        toast({ title: "Import complete", status: "success", duration: 5000 });
        if (onCommitted) onCommitted();
      } else if (res && res.code === 409) {
        // Somebody committed this batch already. The punches are in; show
        // what actually happened rather than treat it as an error.
        await refreshDetails(batch.import_batch_id);
        toast({ title: requestErrorMessage(res), status: "info", duration: 7000 });
        if (onCommitted) onCommitted();
      } else {
        toast({ title: requestErrorMessage(res, "The import could not be completed"), status: "error", duration: 7000 });
      }
    } catch (err) {
      console.log(err);
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
    } finally {
      setCommitting(false);
    }
  };

  const plan = commitPlan(batch);
  const result = committed ? commitResultMessage(batch, preview.outcome_counts) : null;

  return (
    <>
      <CustomContainer
        title="Attendance Import"
        subtitle="Import historical attendance punches from DigiSME Excel exports."
        filledHeader
      >
        <Alert status="info" fontSize="sm" mb={4} borderRadius="md">
          <AlertIcon />
          <Box>
            <Text fontWeight="semibold">Accepted file: DigiSME &mdash; ATD Daily Attendance (.xlsx)</Text>
            <Text color="gray.600">
              Every non-empty Clock Time cell becomes one attendance punch. Imported punches are stored in
              the same attendance punch store with source DigiSME Import. No attendance calculation is
              performed here.
            </Text>
          </Box>
        </Alert>

        <Stack direction={{ base: "column", md: "row" }} spacing={4} align={{ md: "flex-end" }} flexWrap="wrap">
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Choose Excel File
            </Text>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={onChooseFile}
              disabled={previewing || committing}
            />
          </Box>
          {file ? (
            <Box fontSize="sm">
              <Text fontWeight="medium" wordBreak="break-all">{file.name}</Text>
              <Text color="gray.500">{formatBytes(file.size)}</Text>
            </Box>
          ) : null}
          <Stack direction="row" spacing={2}>
            <Button
              colorScheme="purple"
              size="sm"
              onClick={runPreview}
              isLoading={previewing}
              loadingText="Previewing"
              isDisabled={!file || previewing || committing}
            >
              Preview Import
            </Button>
            {preview ? (
              <Button size="sm" variant="outline" onClick={reset} isDisabled={previewing || committing}>
                Start Over
              </Button>
            ) : null}
          </Stack>
        </Stack>

        {error ? (
          <Alert status="warning" fontSize="sm" mt={4}>
            <AlertIcon />
            {error}
          </Alert>
        ) : null}
        {!preview && !error ? (
          <Text fontSize="xs" color="gray.500" mt={4}>
            Preview first. Nothing is written until you confirm the import.
          </Text>
        ) : null}
      </CustomContainer>

      {preview ? (
        <CustomContainer
          title={committed ? "Import result" : "Preview"}
          subtitle={
            committed
              ? "What was written. Import history keeps this permanently."
              : "What the server found in this workbook. No punch has been written yet."
          }
          filledHeader
          rightSection={
            <Stack direction="row" spacing={2} align="center">
              <Badge colorScheme={BATCH_STATUS_TONE[batch.status] || "gray"}>
                {BATCH_STATUS_LABEL[batch.status] || batch.status}
              </Badge>
              {canCommit(batch) ? (
                <Button
                  size="sm"
                  colorScheme="purple"
                  onClick={() => setConfirmOpen(true)}
                  isLoading={committing}
                  loadingText="Importing"
                  isDisabled={committing}
                >
                  Confirm Import
                </Button>
              ) : null}
              {committed ? (
                <Link href="/attendance/list?tab=audit" passHref>
                  <Button size="sm" variant="outline" colorScheme="purple">
                    View Punch Audit
                  </Button>
                </Link>
              ) : null}
            </Stack>
          }
        >
          <Facts batch={batch} />
          <Divider mb={4} />
          {result ? (
            <Alert status={result.tone} fontSize="sm" mb={4} borderRadius="md">
              <AlertIcon />
              {result.text}
            </Alert>
          ) : null}
          {committed ? (
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing={3}>
              {outcomeRows(preview.outcome_counts).map((o) => (
                <Box key={o.key} borderWidth="1px" borderRadius="md" p={3}>
                  <Flex align="center" justify="space-between" mb={1}>
                    <Text fontSize="xs" color="gray.600" fontWeight="semibold">
                      {o.label}
                    </Text>
                    <Badge colorScheme={o.tone}>{formatCount(o.count)}</Badge>
                  </Flex>
                </Box>
              ))}
            </SimpleGrid>
          ) : (
            <SummaryCards batch={batch} onPick={setFilterFromCard} active={filterFromCard} />
          )}
        </CustomContainer>
      ) : null}

      {preview ? <UnmatchedCodes codes={preview.unmatched_employee_codes} /> : null}
      {preview ? <ItemsSection importBatchId={batch.import_batch_id} initialFilter={filterFromCard} /> : null}

      <CustomModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Import attendance punches?"
        size="lg"
        footer={
          <Stack direction="row" spacing={3}>
            <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" colorScheme="purple" onClick={runCommit} isLoading={committing} isDisabled={committing}>
              Import Attendance
            </Button>
          </Stack>
        }
      >
        <Stack spacing={3} fontSize="sm">
          <Text fontSize="md" fontWeight="semibold">
            You are about to import {formatCount(plan.toImport)} punches.
          </Text>
          <Stack spacing={1}>
            <Text>Unmatched punches: {formatCount(plan.unmatched)} (imported and kept)</Text>
            <Text>Duplicates to skip: {formatCount(plan.duplicates)}</Text>
            <Text>Collisions to retain: {formatCount(plan.collisions)} (both punches kept)</Text>
            <Text>Bad rows to skip: {formatCount(plan.badRows)}</Text>
          </Stack>
          <Text color="gray.600">
            {batch ? batch.original_filename : ""} &middot; {dateRangeText(batch)}
          </Text>
          <Text color="gray.500" fontSize="xs">
            Existing punches are never changed or deleted. Importing the same export again is safe: anything
            already imported is skipped.
          </Text>
        </Stack>
      </CustomModal>
    </>
  );
}

/* ======================================================= Import History */

function ImportHistoryTab({ refreshToken, openBatchId, onOpenBatch }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await AttendanceHelper.listAttendanceImports();
      if (res && res.code === 200) setBatches(res.data || []);
      else setError(requestErrorMessage(res, "Could not load the import history"));
    } catch (err) {
      console.log(err);
      setError("Could not reach the server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const openBatch = useCallback(async (id) => {
    onOpenBatch(id);
    setDetailsLoading(true);
    try {
      const res = await AttendanceHelper.getAttendanceImportDetails(id);
      if (res && res.code === 200) setDetails(res.data || null);
      else setDetails(null);
    } catch (err) {
      console.log(err);
      setDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }, [onOpenBatch]);

  const colDefs = useMemo(
    () => [
      {
        field: "created_at",
        headerName: "Date/Time",
        minWidth: 160,
        valueGetter: (p) => (p.data ? displayDateTime(p.data.previewed_at || p.data.created_at) : ""),
      },
      { field: "original_filename", headerName: "Filename", minWidth: 220 },
      {
        field: "date_from",
        headerName: "Date Range",
        minWidth: 180,
        valueGetter: (p) => (p.data ? dateRangeText(p.data) : ""),
      },
      {
        field: "uploaded_by_name",
        headerName: "Uploaded By",
        minWidth: 160,
        valueGetter: (p) => (p.data ? p.data.uploaded_by_name || "-" : ""),
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 200,
        valueGetter: (p) => (p.data ? BATCH_STATUS_LABEL[p.data.status] || p.data.status : ""),
        cellRenderer: (p) =>
          p.data ? (
            <Badge colorScheme={BATCH_STATUS_TONE[p.data.status] || "gray"}>
              {BATCH_STATUS_LABEL[p.data.status] || p.data.status}
            </Badge>
          ) : null,
      },
      { field: "candidate_count", headerName: "Punches Found", minWidth: 140 },
      { field: "imported_count", headerName: "Imported", minWidth: 120 },
      { field: "skipped_count", headerName: "Skipped", minWidth: 110 },
      { field: "failed_count", headerName: "Failed", minWidth: 110 },
      {
        field: "import_batch_id",
        headerName: "Action",
        minWidth: 110,
        cellRenderer: (p) =>
          p.data ? (
            <Button size="xs" variant="outline" colorScheme="purple" onClick={() => openBatch(p.data.import_batch_id)}>
              View
            </Button>
          ) : null,
      },
    ],
    [openBatch]
  );

  return (
    <>
      <CustomContainer
        title="Import History"
        subtitle="Every DigiSME import ever previewed or committed, with who uploaded it and what it did. This history is permanent: there is no delete."
        filledHeader
        rightSection={
          <Button size="sm" variant="outline" colorScheme="purple" onClick={load} isDisabled={loading}>
            Refresh
          </Button>
        }
      >
        {error ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            {error}
          </Alert>
        ) : loading ? (
          <Stack align="center" py={10}>
            <Spinner color="purple.500" />
          </Stack>
        ) : batches.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            No attendance file has been imported yet.
          </Text>
        ) : (
          <AgGrid rowData={batches} colDefs={colDefs} tableKey="attendance-import-history" hideExport />
        )}
      </CustomContainer>

      {openBatchId ? (
        detailsLoading ? (
          <CustomContainer title="Import details" filledHeader>
            <Stack align="center" py={8}>
              <Spinner color="purple.500" />
            </Stack>
          </CustomContainer>
        ) : details ? (
          <>
            <CustomContainer
              title={`Import #${details.batch.import_batch_id}`}
              subtitle="What this batch contained and what it wrote."
              filledHeader
              rightSection={
                <Stack direction="row" spacing={2} align="center">
                  <Badge colorScheme={BATCH_STATUS_TONE[details.batch.status] || "gray"}>
                    {BATCH_STATUS_LABEL[details.batch.status] || details.batch.status}
                  </Badge>
                  <Link href="/attendance/list?tab=audit" passHref>
                    <Button size="sm" variant="outline" colorScheme="purple">
                      View Punch Audit
                    </Button>
                  </Link>
                  <Button size="sm" variant="ghost" onClick={() => onOpenBatch(null)}>
                    Close
                  </Button>
                </Stack>
              }
            >
              <Facts batch={details.batch} />
              <Divider mb={4} />
              <Heading size="xs" mb={2} color="gray.600">
                Outcome
              </Heading>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 6 }} spacing={3} mb={4}>
                {outcomeRows(details.outcome_counts).map((o) => (
                  <Box key={o.key} borderWidth="1px" borderRadius="md" p={3}>
                    <Flex align="center" justify="space-between">
                      <Text fontSize="xs" color="gray.600" fontWeight="semibold">
                        {o.label}
                      </Text>
                      <Badge colorScheme={o.tone}>{formatCount(o.count)}</Badge>
                    </Flex>
                  </Box>
                ))}
              </SimpleGrid>
              <Heading size="xs" mb={2} color="gray.600">
                What the file contained
              </Heading>
              <SummaryCards batch={details.batch} />
            </CustomContainer>
            <UnmatchedCodes codes={details.unmatched_employee_codes} />
            <ItemsSection importBatchId={details.batch.import_batch_id} initialFilter="" />
          </>
        ) : (
          <CustomContainer title="Import details" filledHeader>
            <Alert status="warning" fontSize="sm">
              <AlertIcon />
              That import could not be loaded.
            </Alert>
          </CustomContainer>
        )
      ) : null}
    </>
  );
}
