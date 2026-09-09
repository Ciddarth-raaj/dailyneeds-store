import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  Input,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import ColumnsDrawer from "./ColumnsDrawer";
import ReportFilters from "./ReportFilters";
import {
  pruneFilters,
  splitSavedFilters,
  toRequestFilters,
} from "../../util/reportFilterRules";
import ReportWarnings from "./ReportWarnings";
import ReportHelper, { REPORT_ERROR } from "../../helper/report";

/**
 * Reports — running one report.
 *
 * The screen behind both "open a saved report" and "create a report": header
 * actions, filters, results. One component rather than two nearly identical
 * ones, because the difference between them is a name and a starting
 * definition, and everything that follows - the columns drawer, the filter
 * rules, pagination, export - is the same job.
 *
 * ============================================== WHAT IS SERVER-SIDE, AND WHY
 *
 * Filtering, counting and paging all happen on the server, in one query. The
 * count above the table is the number of employees the report matches, not
 * the number on this page, and it is the number an export will contain -
 * because preview and export resolve the same request through the same
 * builder. Filtering in the browser would narrow the twenty-five rows on
 * screen and quietly leave the total, the other pages and the spreadsheet
 * describing a different set of people.
 *
 * ============================================ COLUMNS AND FILTERS ARE JOINED
 *
 * A selected column is filterable, and a removed column takes its DYNAMIC
 * filter with it - `pruneFilters` is applied wherever the selection changes,
 * so a filter cannot go on narrowing a column that is no longer shown.
 *
 * The COMMON filters - employment status, outlet, department, designation,
 * search - are not joined to any column. They are the report run's own
 * controls, always available, and removing a column must never take one away.
 *
 * ============================================== THE WHOLE DEFINITION IS HELD
 *
 * State carries all six parts of a saved report's filters, not just the two
 * the screen renders as dynamic controls. Holding less meant that the moment
 * a column changed and the definition went to the server expanded, a saved
 * outlet or status filter simply disappeared: the report widened without
 * anybody touching it, and Save a Copy stored something looser than what was
 * on screen.
 *
 * ==================================================== NOTHING RUNS BY ITSELF
 *
 * A run is a query over the whole employee master. It happens on arrival, on
 * Apply, and on a page change - never on a keystroke, and never from a filter
 * changing, which would query on every character typed into a text filter.
 */
function ReportWorkbench({
  title,
  catalogue,
  masters,
  /** The saved report this came from, if any. */
  template,
  initialFieldKeys,
  initialFilters,
  /** Rendered beside the built-in actions - Save a Copy, and so on. */
  actions,
  /** Told the live definition, so a parent can save it. */
  onDefinitionChange,
}) {
  const toast = useToast();
  const drawer = useDisclosure();

  const [fieldKeys, setFieldKeys] = useState(initialFieldKeys || []);

  // Split once, on arrival: the four common filters plus search into their own
  // state, everything else as dynamic filters.
  const initial = useMemo(() => splitSavedFilters(initialFilters), [initialFilters]);
  const [common, setCommon] = useState(initial.common);
  const [fieldFilters, setFieldFilters] = useState(initial.fieldFilters);

  /**
   * Whether the definition on screen still IS the saved one.
   *
   * It decides how a run is sent, and that matters more than it looks. An
   * untouched saved report is run BY ID, so the server reconciles it against
   * what exists now - a deleted outlet, a column the reader has lost access
   * to - and returns the warnings, including the one case that WIDENS the
   * result and has to be acknowledged before an export. Sending the expanded
   * definition instead would skip reconciliation entirely and silently turn a
   * one-branch report into a company-wide one.
   *
   * Once the user changes a column or a filter, the definition on screen is
   * theirs rather than the saved one, and it is sent expanded - because at
   * that point what they can see must be what ran.
   */
  const [dirty, setDirty] = useState(false);

  const [preview, setPreview] = useState(null);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);

  // The complete definition, assembled in ONE place - so the preview, the
  // export and Save a Copy cannot describe three different reports.
  const filters = useMemo(() => toRequestFilters(common, fieldFilters), [common, fieldFilters]);

  useEffect(() => {
    if (onDefinitionChange) onDefinitionChange({ field_keys: fieldKeys, filters });
  }, [fieldKeys, filters, onDefinitionChange]);

  /**
   * Applying a column change prunes any filter that lost its column.
   * Both halves in one place, so they cannot be done separately.
   */
  const applyColumns = (next) => {
    setFieldKeys(next);
    setFieldFilters((current) => pruneFilters(current, next));
    setDirty(true);
    // An edit is a fresh decision, exactly as a run is: a tick carried over
    // from the previous result acknowledged a different report's widening.
    setAcknowledged(false);
  };

  const run = useCallback(
    async (page = 1, override) => {
      const edited = Boolean(override) || dirty;
      // Untouched: by id, so the server reconciles it and can warn.
      const body =
        template && !edited
          ? { template_id: template.template_id, page }
          : {
              ...(template ? { template_id: template.template_id } : {}),
              field_keys: override ? override.field_keys : fieldKeys,
              filters: override ? override.filters : filters,
              page,
            };
      setRunning(true);
      try {
        const result = await ReportHelper.preview(body);
        if (result && result.code >= 400) {
          toast({ title: result.msg, status: "error", duration: 6000, isClosable: true });
          setPreview(null);
          return;
        }
        setPreview(result);
        setAcknowledged(false);
      } catch (err) {
        toast({ title: "The report could not be run.", status: "error", duration: 5000 });
      } finally {
        setRunning(false);
      }
    },
    [template, fieldKeys, filters, dirty, toast]
  );

  // On arrival only. Filters change without running; Apply is what runs them.
  useEffect(() => {
    if (fieldKeys.length > 0) run(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doExport = async (format) => {
    setExporting(format);
    try {
      // The SAME definition the table was built from, resolved the same way -
      // by id while untouched, expanded once edited - so the spreadsheet holds
      // the filtered rows and the selected columns in their order, and matches
      // the count on screen.
      const body =
        template && !dirty
          ? { template_id: template.template_id, acknowledge_widened_filters: acknowledged }
          : {
              ...(template ? { template_id: template.template_id } : {}),
              field_keys: fieldKeys,
              filters,
              acknowledge_widened_filters: acknowledged,
            };
      const fn = format === "xlsx" ? ReportHelper.exportXlsx : ReportHelper.exportCsv;
      const { filename } = await fn(body);
      toast({ title: `${filename} downloaded`, status: "success", duration: 4000 });
    } catch (err) {
      const message =
        err && err.code === REPORT_ERROR.FILTER_WIDENED
          ? "Tick the box above to confirm you want the wider set, then export again."
          : err && err.code === REPORT_ERROR.TOO_MANY_ROWS
          ? err.message
          : err && err.code === REPORT_ERROR.EXPORT_FORBIDDEN
          ? "You do not have permission to export reports."
          : "The export could not be produced.";
      toast({ title: message, status: "error", duration: 8000, isClosable: true });
    } finally {
      setExporting(null);
    }
  };

  const canExport = Boolean(catalogue && catalogue.can_export);
  const overRowLimit = Boolean(preview && preview.over_row_limit);
  // The SERVER'S answer, not a re-derivation of it from the warning list: it
  // is the one that decides whether the export will be refused, so re-deriving
  // it here could disable a button the server would have allowed, or worse,
  // enable one it refuses.
  const blockedByAcknowledgement =
    Boolean(preview && preview.requires_acknowledgement) && !acknowledged;

  const defaultColumns = template ? template.field_keys : null;

  return (
    <Stack spacing="12px">
      <Flex justify="space-between" align="center" wrap="wrap" gap="8px">
        <Text fontSize="18px" fontWeight="bold">
          {title}
        </Text>
        <HStack spacing="8px">
          <Button size="sm" variant="outline" onClick={drawer.onOpen}>
            Columns
          </Button>
          {actions}
          {canExport && (
            <ButtonGroup size="sm" isAttached colorScheme="purple">
              <Button
                isLoading={exporting === "xlsx"}
                isDisabled={blockedByAcknowledgement || overRowLimit || !preview}
                onClick={() => doExport("xlsx")}
              >
                Excel
              </Button>
              <Button
                variant="outline"
                isLoading={exporting === "csv"}
                isDisabled={blockedByAcknowledgement || overRowLimit || !preview}
                onClick={() => doExport("csv")}
              >
                CSV
              </Button>
            </ButtonGroup>
          )}
        </HStack>
      </Flex>

      <ColumnsDrawer
        isOpen={drawer.isOpen}
        onClose={drawer.onClose}
        groups={catalogue ? catalogue.groups : []}
        selected={fieldKeys}
        maxFields={catalogue ? catalogue.max_fields : 0}
        defaultSelected={defaultColumns}
        onApply={(next) => {
          applyColumns(next);
          // The pruned dynamic filters, and every common filter untouched.
          run(1, {
            field_keys: next,
            filters: toRequestFilters(common, pruneFilters(fieldFilters, next)),
          });
        }}
      />

      <ReportFilters
        groups={catalogue ? catalogue.groups : []}
        selectedKeys={fieldKeys}
        fieldFilters={fieldFilters}
        onChange={(next) => {
          setFieldFilters(next);
          setDirty(true);
          setAcknowledged(false);
        }}
        common={common}
        onCommonChange={(next) => {
          setCommon(next);
          setDirty(true);
          setAcknowledged(false);
        }}
        masters={masters}
        onApply={() => {
          setDirty(true);
          run(1, { field_keys: fieldKeys, filters });
        }}
        applying={running}
      />

      {preview && (
        <ReportWarnings
          warnings={preview.warnings}
          acknowledged={acknowledged}
          onAcknowledge={setAcknowledged}
        />
      )}

      {overRowLimit && (
        <Alert status="warning" borderRadius="8px">
          <AlertIcon />
          This report matches more than {preview.max_rows} employees, which is more than one
          export may contain. Narrow the filters and run it again.
        </Alert>
      )}

      {running && !preview && (
        <Flex justify="center" padding="24px">
          <Spinner />
        </Flex>
      )}

      {preview && (
        <Box>
          <HStack spacing="8px" marginBottom="6px">
            <Text fontSize="15px" fontWeight="bold">
              {preview.matching_count} employees found
            </Text>
            <Text fontSize="12px" color="gray.500">
              showing {preview.rows.length} on this page
            </Text>
          </HStack>

          <Box overflowX="auto" borderWidth="1px" borderRadius="8px">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  {preview.columns.map((column) => (
                    <Th key={column.key} whiteSpace="nowrap">
                      {column.label}
                    </Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {preview.rows.map((row, index) => (
                  <Tr key={`${row.employee_id || index}-${index}`}>
                    {preview.columns.map((column) => (
                      <Td key={column.key} whiteSpace="nowrap" fontSize="13px">
                        {row[column.key] === null || row[column.key] === undefined
                          ? "—"
                          : String(row[column.key])}
                      </Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>

          {preview.matching_count > preview.page_size && (
            <Flex justify="center" gap="8px" marginTop="8px">
              <Button
                size="sm"
                variant="ghost"
                isDisabled={preview.page <= 1 || running}
                onClick={() => run(preview.page - 1)}
              >
                Previous
              </Button>
              <Text fontSize="13px" alignSelf="center">
                Page {preview.page} of {Math.ceil(preview.matching_count / preview.page_size)}
              </Text>
              <Button
                size="sm"
                variant="ghost"
                isDisabled={
                  preview.page >= Math.ceil(preview.matching_count / preview.page_size) || running
                }
                onClick={() => run(preview.page + 1)}
              >
                Next
              </Button>
            </Flex>
          )}
        </Box>
      )}

      {!preview && !running && fieldKeys.length === 0 && (
        <Text fontSize="13px" color="gray.500">
          Choose some columns to build this report.
        </Text>
      )}
    </Stack>
  );
}

export default ReportWorkbench;
