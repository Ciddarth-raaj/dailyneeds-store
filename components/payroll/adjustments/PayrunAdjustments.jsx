import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Divider,
  Heading,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  useToast,
} from "@chakra-ui/react";

import FileUpload from "../../FileUpload";
import AdjustmentEmployeeList from "./AdjustmentEmployeeList";
import AdjustmentEditor from "./AdjustmentEditor";
import AdjustmentsPreview from "./AdjustmentsPreview";
import PayrunAdjustmentsHelper from "../../../helper/payrunAdjustments";
import usePayrunAdjustmentsMonth from "../../../customHooks/usePayrunAdjustmentsMonth";
import { describeApiResult, KIND } from "../../../util/salaryApiError";
import {
  canSaveImport,
  confirmableEmployeeIds,
  confirmNoAdjustmentMessage,
  isAllSelected,
  nextSelectAll,
  progressOf,
  pruneSelection,
  saveOutcomeMessage,
  toggleSelection,
  STATE,
} from "../../../util/payrunAdjustments";

/**
 * PAYRUN > ADJUSTMENTS — the second stage of the monthly payrun.
 *
 * A WORKFLOW, NOT A GIANT ALWAYS-EDITABLE TABLE. Three steps in the order
 * somebody actually works:
 *
 *   STEP 1  Export Template      the month's initialized employees, pre-filled
 *   STEP 2  Fill and Import      upload the edited sheet
 *   STEP 3  Preview and Confirm  read what it will do, then Save Adjustments
 *
 * and, beneath them, the month itself: every initialized employee, their
 * state, and the explicit No Adjustment confirmation - individually and in
 * bulk. A spreadsheet of two hundred rows is how the bulk of the work gets
 * done; the list is how the exceptions and the confirmations get done, and
 * both are needed.
 *
 * THE HEADER IS WHERE THE STAGE STANDS, AND THE PENDING COUNT IS THE POINT OF
 * IT. The stage is finished when nothing is pending - not when a file has been
 * imported - and the screen leads with that number rather than with how many
 * rows somebody uploaded.
 *
 * IT DECIDES NOTHING. Every state, every count and every amount is the
 * server's answer. This screen chooses what to draw and which ids to send; it
 * never classifies a component, sums a net effect or derives a state, because
 * a second copy of those rules in a browser is a second answer that drifts.
 *
 * IMPORTING NEVER CONFIRMS ANYBODY. The Save Adjustments button writes the
 * file's amounts; the employees whose rows were blank stay Pending
 * Confirmation, and both the preview and the success message say so, because
 * that is the assumption everybody arrives with.
 *
 * THERE IS NO "PAY SEPARATELY" AND NO OFF-CYCLE PAYMENT HERE, deliberately:
 * an affordance for a stage that does not exist is a promise the system cannot
 * keep.
 */
function PayrunAdjustments({ year, month, storeId, mayEdit, monthName }) {
  const toast = useToast();

  const [catalogue, setCatalogue] = useState(null);
  const [stateFilter, setStateFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [busyEmployeeId, setBusyEmployeeId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [preview, setPreview] = useState(null);
  const [importBusy, setImportBusy] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editorBusy, setEditorBusy] = useState(false);

  const filters = useMemo(
    () => ({ year, month, store_ids: storeId, state: stateFilter }),
    [year, month, storeId, stateFilter]
  );

  const { rows, summary, monthLocked, loading, loaded, denied, error, refresh } =
    usePayrunAdjustmentsMonth(filters, true);

  /* The V1 catalogue: the components, their labels and the template's columns.
     Loaded once - it is a fact about the system, not about the month. */
  useEffect(() => {
    if (catalogue) return;
    let cancelled = false;
    PayrunAdjustmentsHelper.getComponents()
      .then((data) => {
        if (cancelled) return;
        if (!data || (data.code && data.code !== 200)) return;
        setCatalogue(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [catalogue]);

  const components = (catalogue && catalogue.components) || [];
  const selectableIds = useMemo(
    () => (mayEdit && !monthLocked ? confirmableEmployeeIds(rows) : []),
    [rows, mayEdit, monthLocked]
  );

  /* A selection never outlives the rows it was made on - most obviously the
     rows that were just confirmed and are no longer pending. */
  useEffect(() => {
    setSelectedIds((prev) => pruneSelection(prev, selectableIds));
  }, [selectableIds]);

  const progress = progressOf(summary);
  const allSelected = isAllSelected(selectableIds, selectedIds);
  const canEdit = mayEdit && !monthLocked;

  const say = (outcome) =>
    toast({
      title: outcome.message,
      status: outcome.kind === KIND.DENIED ? "info" : "error",
      duration: 8000,
      isClosable: true,
    });

  /* ------------------------------------------------ STEP 1: the template */

  const handleExport = async () => {
    setExporting(true);
    try {
      const name = await PayrunAdjustmentsHelper.exportTemplate({
        year,
        month,
        store_ids: storeId || undefined,
      });
      toast({ title: `Exported ${name}`, status: "success", duration: 5000, isClosable: true });
    } catch (err) {
      toast({
        title: err?.message || "The template could not be exported",
        status: "error",
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setExporting(false);
    }
  };

  /* -------------------------------------- STEP 2: the file, and its preview */

  const resetImport = () => {
    setFile(null);
    setParsed(null);
    setPreview(null);
  };

  const handleFile = async (picked) => {
    resetImport();
    setFile(picked);
    if (!picked) return;

    setImportBusy(true);
    try {
      const { headers, rows: cells } = await PayrunAdjustmentsHelper.parseFile(picked);
      setParsed({ headers, rows: cells, filename: picked.name });

      // PREVIEW WRITES NOTHING. The server validates and answers; no month is
      // touched until Save Adjustments is pressed.
      const data = await PayrunAdjustmentsHelper.preview({
        year,
        month,
        headers,
        rows: cells,
        filename: picked.name,
      });
      const outcome = describeApiResult(data);
      if (outcome.kind !== KIND.OK) {
        say(outcome);
        setParsed(null);
        return;
      }
      setPreview(data);
    } catch (err) {
      toast({
        title: err?.message || "The file could not be read",
        status: "error",
        duration: 7000,
        isClosable: true,
      });
      setParsed(null);
    } finally {
      setImportBusy(false);
    }
  };

  /* -------------------------------------------- STEP 3: Save Adjustments */

  const handleSaveImport = async () => {
    if (!parsed || !preview) return;
    setImportBusy(true);
    try {
      const data = await PayrunAdjustmentsHelper.confirm({ year, month, ...parsed });

      if (data?.code === 409) {
        /* The file no longer validates against the month as it is now, so
           NOTHING was saved. The refreshed preview comes back in the same
           response and replaces what is on screen. */
        toast({
          title: data.msg || "Nothing was saved; please review again",
          status: "error",
          duration: 9000,
          isClosable: true,
        });
        setPreview(data);
        return;
      }

      const outcome = describeApiResult(data);
      if (outcome.kind !== KIND.OK) {
        say(outcome);
        return;
      }

      toast({
        title: saveOutcomeMessage(data),
        status: Number(data.pending_confirmation_after_save || 0) > 0 ? "warning" : "success",
        duration: 10000,
        isClosable: true,
      });
      resetImport();
      await refresh();
    } catch (err) {
      toast({
        title: "The adjustments could not be saved. Please try again.",
        status: "error",
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setImportBusy(false);
    }
  };

  /* --------------------------------- the explicit No Adjustment confirmation */

  const confirmNoAdjustment = async (employeeIds, { confirm = true } = {}) => {
    if (!employeeIds || employeeIds.length === 0) return;
    if (confirm && !window.confirm(confirmNoAdjustmentMessage(employeeIds.length))) return;

    if (employeeIds.length === 1) setBusyEmployeeId(employeeIds[0]);
    else setBulkBusy(true);

    try {
      const result = await PayrunAdjustmentsHelper.confirmNoAdjustment({
        year,
        month,
        employee_ids: employeeIds,
      });
      const outcome = describeApiResult(result);
      if (outcome.kind !== KIND.OK) {
        say(outcome);
        return;
      }

      /* A PARTIAL OUTCOME IS REPORTED AS ONE. Somebody whose adjustment was
         entered in another tab is refused, and saying "84 confirmed" when 83
         were would leave one person unconfirmed and nobody looking. */
      const refused =
        Number(result.has_adjustment_count || 0) + Number(result.not_initialized_count || 0);
      toast({
        title: `${result.confirmed_count} employee${result.confirmed_count === 1 ? "" : "s"} confirmed as having no adjustment.`,
        description: refused
          ? `${refused} could not be confirmed — they have an adjustment, or they are not initialized for this month.`
          : undefined,
        status: refused ? "warning" : "success",
        duration: 8000,
        isClosable: true,
      });
      setSelectedIds([]);
      await refresh();
    } catch (err) {
      toast({
        title: "The confirmation could not be recorded. Please try again.",
        status: "error",
        duration: 7000,
        isClosable: true,
      });
    } finally {
      setBusyEmployeeId(null);
      setBulkBusy(false);
    }
  };

  /* ------------------------------------------------------ manual editing */

  const saveEmployee = async ({ amounts, remarks }) => {
    setEditorBusy(true);
    try {
      const result = await PayrunAdjustmentsHelper.saveEmployee({
        year,
        month,
        employee_id: editing.employee_id,
        amounts,
        remarks,
      });
      const outcome = describeApiResult(result);
      if (outcome.kind !== KIND.OK) return { error: outcome.message };

      toast({ title: "Adjustments saved.", status: "success", duration: 5000, isClosable: true });
      await refresh();
      return {};
    } catch (err) {
      return { error: "The adjustments could not be saved. Please try again." };
    } finally {
      setEditorBusy(false);
    }
  };

  /* ---------------------------------------------------------------- render */

  const cards = [
    { label: "Initialized", value: progress.initialized },
    { label: "Has adjustment", value: summary.has_adjustment_count || 0 },
    { label: "No Adjustment — Confirmed", value: summary.no_adjustment_confirmed_count || 0 },
    { label: "Pending confirmation", value: progress.pending, danger: progress.pending > 0 },
  ];

  const step = (number, title, children) => (
    <Box borderWidth="1px" borderRadius="md" p={3}>
      <Stack spacing={2}>
        <Heading size="xs" color="gray.700">
          STEP {number} — {title}
        </Heading>
        {children}
      </Stack>
    </Box>
  );

  return (
    <Stack spacing={4}>
      <Stack spacing={1}>
        <Text fontSize="sm" color="gray.700">
          Adjustments for <b>{monthName} {year}</b>. Only employees <b>initialized</b> for this month take
          part, and the counts below are recalculated from the current initialized list every time this
          screen is read — an employee initialized later appears here as pending by itself.
        </Text>
      </Stack>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
        {cards.map((card) => (
          <Stat key={card.label} p={3} borderWidth="1px" borderRadius="md">
            <StatLabel fontSize="xs">{card.label}</StatLabel>
            <StatNumber fontSize="lg" color={card.danger ? "orange.500" : undefined}>
              {card.value}
            </StatNumber>
          </Stat>
        ))}
      </SimpleGrid>

      {monthLocked ? (
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          This payroll month is locked. Adjustments can be read but not changed.
        </Alert>
      ) : null}

      {progress.isComplete ? (
        <Alert status="success" fontSize="sm">
          <AlertIcon />
          Every initialized employee for this month is resolved — nothing is awaiting confirmation.
        </Alert>
      ) : (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          {progress.pending} of {progress.initialized} initialized employees are still{" "}
          <b>No Adjustment — Pending Confirmation</b>. Blank or zero values never confirm anybody.
        </Alert>
      )}

      {/* ==================================================== the workflow */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        {step(
          1,
          "Export Template",
          <>
            <Text fontSize="xs" color="gray.600">
              One row per initialized employee, pre-filled with whatever they already have.
            </Text>
            <Button size="sm" onClick={handleExport} isLoading={exporting} variant="outline">
              Export Template
            </Button>
          </>
        )}

        {step(
          2,
          "Fill and Import",
          <>
            <Text fontSize="xs" color="gray.600">
              Amounts are columns, one employee per row. A column this stage does not recognise is refused
              rather than ignored.
            </Text>
            <FileUpload
              value={file}
              onChange={handleFile}
              /* The STRING form - react-dropzone 11's spelling. See the note
                 in `components/Employee/BulkExportImport/index.jsx`: the
                 object form silently does nothing on this version. */
              accept=".xlsx,.xls,.csv"
              disabled={!canEdit || importBusy}
              placeholderText="Drag the filled .xlsx here, or click to select"
            />
          </>
        )}

        {step(
          3,
          "Preview and Confirm",
          <>
            <Text fontSize="xs" color="gray.600">
              Nothing is saved until you press Save Adjustments. Saving never confirms a blank employee.
            </Text>
            <Button
              size="sm"
              colorScheme="purple"
              onClick={handleSaveImport}
              isLoading={importBusy}
              isDisabled={!canEdit || !canSaveImport(preview)}
            >
              Save Adjustments
            </Button>
          </>
        )}
      </SimpleGrid>

      {importBusy && !preview ? (
        <Stack direction="row" align="center" spacing={2}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.600">
            Reading the file…
          </Text>
        </Stack>
      ) : null}

      {preview ? (
        <Box borderWidth="1px" borderRadius="md" p={3}>
          <Stack spacing={3}>
            <Heading size="xs" color="gray.700">
              Preview — {preview.source_filename || "uploaded file"}
            </Heading>
            <AdjustmentsPreview preview={preview} initializedCount={progress.initialized} />
          </Stack>
        </Box>
      ) : null}

      <Divider />

      {/* ============================================ the month's employees */}
      <Stack
        direction={{ base: "column", md: "row" }}
        align={{ base: "stretch", md: "center" }}
        spacing={3}
      >
        <Select
          size="sm"
          maxW={{ base: "100%", md: "320px" }}
          placeholder="All employees"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          aria-label="Adjustment state"
        >
          <option value={STATE.HAS_ADJUSTMENT}>Has adjustment</option>
          <option value={STATE.NO_ADJUSTMENT_CONFIRMED}>No Adjustment — Confirmed</option>
          <option value={STATE.NO_ADJUSTMENT_PENDING_CONFIRMATION}>
            No Adjustment — Pending Confirmation
          </option>
        </Select>
        <Button size="sm" variant="outline" onClick={refresh} isDisabled={loading}>
          Refresh
        </Button>
      </Stack>

      {loading ? (
        <Stack direction="row" align="center" spacing={2}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.600">
            Loading the month…
          </Text>
        </Stack>
      ) : null}

      {denied ? (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          You do not have permission to view the adjustments for this payroll month.
        </Alert>
      ) : null}

      {/* A FAILED READ IS NOT AN EMPTY MONTH. */}
      {error ? (
        <Alert status="error" fontSize="sm">
          <AlertIcon />
          {error} This is a problem reading the month — it does not mean there is nothing to adjust.
        </Alert>
      ) : null}

      {loaded && rows.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No initialized employees match this month and these filters. Adjustments apply only to employees
          who have been initialized for the month.
        </Text>
      ) : null}

      {loaded && rows.length > 0 ? (
        <Stack spacing={2}>
          {/* THE BULK BAR, STICKY ON A PHONE - the same reason the
              initialization screen's is: by the fourth tick on a phone the
              count and the button have scrolled away. */}
          <Stack
            direction="row"
            align="center"
            spacing={3}
            flexWrap="wrap"
            position={{ base: "sticky", md: "static" }}
            top={{ base: 0, md: "auto" }}
            zIndex={{ base: 1, md: "auto" }}
            bg="white"
            py={{ base: 2, md: 0 }}
          >
            <Checkbox
              colorScheme="purple"
              isChecked={allSelected}
              isIndeterminate={selectedIds.length > 0 && !allSelected}
              isDisabled={selectableIds.length === 0 || bulkBusy}
              onChange={() => setSelectedIds(nextSelectAll(selectableIds, selectedIds))}
              aria-label="Select all pending employees"
            >
              <Text fontSize="xs">Select all pending ({selectableIds.length})</Text>
            </Checkbox>
            <Text fontSize="xs" color="gray.600">
              {rows.length} employee{rows.length === 1 ? "" : "s"} shown.
            </Text>
            {selectedIds.length > 0 ? (
              <>
                <Text fontSize="xs" fontWeight="bold">
                  {selectedIds.length} selected
                </Text>
                <Button size="xs" variant="ghost" onClick={() => setSelectedIds([])} isDisabled={bulkBusy}>
                  Clear
                </Button>
                <Button
                  size="xs"
                  colorScheme="green"
                  isLoading={bulkBusy}
                  loadingText="Confirming"
                  isDisabled={!canEdit || Boolean(busyEmployeeId)}
                  onClick={() => confirmNoAdjustment(selectedIds)}
                >
                  Confirm No Adjustment ({selectedIds.length})
                </Button>
              </>
            ) : null}
          </Stack>

          <AdjustmentEmployeeList
            rows={rows}
            components={components}
            selectedIds={selectedIds}
            onSelectChange={(employeeId, checked) =>
              setSelectedIds((prev) => toggleSelection(prev, employeeId, checked))
            }
            onEdit={(row) => setEditing(row)}
            onConfirm={(ids) => confirmNoAdjustment(ids)}
            canEdit={canEdit}
            busyEmployeeId={busyEmployeeId}
          />
        </Stack>
      ) : null}

      <AdjustmentEditor
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        row={editing}
        components={components}
        onSave={saveEmployee}
        busy={editorBusy}
        disabled={!canEdit}
      />
    </Stack>
  );
}

export default PayrunAdjustments;
