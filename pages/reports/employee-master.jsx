import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import FieldPicker from "../../components/reports/FieldPicker";
import ReportWarnings from "../../components/reports/ReportWarnings";
import usePermissions from "../../customHooks/usePermissions";
import useOutlets from "../../customHooks/useOutlets";
import useDesignations from "../../customHooks/useDesignations";
import useDepartments from "../../customHooks/useDepartments";
import ReportHelper, { REPORT_ERROR } from "../../helper/report";

/**
 * Reports — Employee Master.
 *
 * Pick the columns, narrow the population, look at the answer, then take it
 * away as a spreadsheet. The same screen runs a saved report and builds a new
 * one, because they are the same activity with a different starting point.
 *
 * ============================================== THE ONE NUMBER THAT MATTERS
 *
 * "Matching employees" is the count of the WHOLE result, not the page on
 * screen, and it is the number of rows the export will contain. The server
 * produces both from one query - the count is that query with `COUNT(*)` - so
 * they cannot disagree. It is shown prominently for exactly that reason: it is
 * what somebody checks before sending a file to PF or a bank.
 *
 * ================================================ WHAT THIS SCREEN CANNOT DO
 *
 * It cannot widen what its user may see. The column list comes from the
 * server, already filtered to this caller's permissions - a field they lack is
 * absent rather than disabled - and the server revalidates every key on every
 * run regardless of what this page sends. Nothing here is a security boundary;
 * it is the presentation of one.
 *
 * There is no free-text column, sort or condition box anywhere below. Filters
 * are the same controls the HR directory has - status, outlet, department,
 * designation, search - because an operator grammar is a query builder, and a
 * query builder eventually needs to accept an operator from whoever is typing.
 *
 * ==================================================== SAVED REPORTS GO STALE
 *
 * The built-in reports cannot be edited by anyone, including an administrator:
 * they are what Reports looks like on day one for every user, and Save a Copy
 * is the path for anyone who wants them different. A saved report that no
 * longer resolves exactly - a deleted outlet, a column the user has lost
 * access to - still runs, and says what it could not apply. The one case that
 * can BROADEN the result is gated behind an explicit acknowledgement before an
 * export, never before a preview.
 */

const EMPTY_FILTERS = {
  status: "active",
  outlet_ids: [],
  department_ids: [],
  designation_ids: [],
  search: "",
};

/** A refusal shaped `{ code, error, msg }` rather than the payload asked for. */
const isRefusal = (body) => Boolean(body) && typeof body === "object" && body.code >= 400;

function EmployeeMasterReport() {
  // BOTH keys, matching what the backend requires with `requireAll`: the
  // reporting capability AND the dataset it is pointed at. The default for
  // this hook is ANY, which would let `view_reports` alone open a screen whose
  // every request then fails.
  const canView = usePermissions(["view_reports", "view_employees"], { all: true });
  const toast = useToast();

  const { outlets } = useOutlets({ directory: true });
  const { designations } = useDesignations();
  const { departments } = useDepartments();

  const [catalogue, setCatalogue] = useState(null);
  const [catalogueError, setCatalogueError] = useState(null);
  const [templates, setTemplates] = useState([]);

  // The report currently being built. `templateId` is the saved report it came
  // from, kept so Run/Update/Delete know what they are acting on; it is
  // cleared the moment the definition is edited into something else.
  const [templateId, setTemplateId] = useState(null);
  const [fieldKeys, setFieldKeys] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const [preview, setPreview] = useState(null);
  const [running, setRunning] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [saveName, setSaveName] = useState("");

  const activeTemplate = useMemo(
    () => templates.find((t) => t.template_id === templateId) || null,
    [templates, templateId]
  );

  /* ------------------------------------------------------------- loading */

  const loadTemplates = useCallback(async () => {
    try {
      const body = await ReportHelper.listTemplates();
      setTemplates(Array.isArray(body && body.templates) ? body.templates : []);
    } catch (err) {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    if (!canView) return undefined;
    let cancelled = false;

    (async () => {
      try {
        const body = await ReportHelper.getFields();
        if (cancelled) return;
        if (isRefusal(body)) {
          setCatalogueError(body.msg);
          return;
        }
        setCatalogue(body);
        // The default report is whatever the catalogue marks as default, so
        // the screen is useful before anything is ticked.
        const defaults = (body.groups || [])
          .flatMap((g) => g.fields)
          .filter((f) => f.default_selected)
          .map((f) => f.key);
        setFieldKeys(defaults);
      } catch (err) {
        if (!cancelled) setCatalogueError("The report columns could not be loaded.");
      }
    })();

    loadTemplates();
    return () => {
      cancelled = true;
    };
  }, [canView, loadTemplates]);

  /* -------------------------------------------------------------- editing */

  // Editing the definition detaches it from the saved report, so Update cannot
  // silently overwrite a colleague's report with something else.
  const editDefinition = (mutate) => {
    mutate();
    setPreview(null);
    setAcknowledged(false);
  };

  const chooseFields = (next) =>
    editDefinition(() => {
      setFieldKeys(next);
      if (templateId) setTemplateId(null);
    });

  const setFilter = (patch) =>
    editDefinition(() => {
      setFilters((current) => ({ ...current, ...patch }));
      if (templateId) setTemplateId(null);
    });

  /** Load a saved report into the builder without running it. */
  const openTemplate = (template) => {
    setTemplateId(template.template_id);
    setFieldKeys(Array.isArray(template.field_keys) ? [...template.field_keys] : []);
    setFilters({ ...EMPTY_FILTERS, ...(template.filters || {}) });
    setSaveName(`${template.template_name} (copy)`);
    setPreview(null);
    setAcknowledged(false);
  };

  /* -------------------------------------------------------------- running */

  const run = async (page = 1) => {
    setRunning(true);
    try {
      // A saved report is run BY ID, so the server reconciles it against what
      // exists now and can tell us what it could not apply. Sending the
      // expanded definition instead would silently lose that.
      const body = templateId
        ? { template_id: templateId, page }
        : { field_keys: fieldKeys, filters, page };

      const result = await ReportHelper.preview(body);
      if (isRefusal(result)) {
        toast({ title: result.msg, status: "error", duration: 6000, isClosable: true });
        setPreview(null);
        return;
      }
      setPreview(result);
      // A fresh run is a fresh decision: a previous acknowledgement of a wider
      // result must not carry over to it.
      setAcknowledged(false);
    } catch (err) {
      toast({ title: "The report could not be run.", status: "error", duration: 5000 });
    } finally {
      setRunning(false);
    }
  };

  /* --------------------------------------------------------------- export */

  const doExport = async (format) => {
    setExporting(format);
    try {
      const body = templateId
        ? { template_id: templateId, acknowledge_widened_filters: acknowledged }
        : { field_keys: fieldKeys, filters, acknowledge_widened_filters: acknowledged };

      const fn = format === "xlsx" ? ReportHelper.exportXlsx : ReportHelper.exportCsv;
      const { filename } = await fn(body);
      toast({ title: `${filename} downloaded`, status: "success", duration: 4000 });
    } catch (err) {
      // Each refusal needs a different next step, so they are told apart by
      // the server's own code rather than flattened into "export failed".
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

  /* ------------------------------------------------------------ templates */

  const definitionPayload = (name) => ({
    template_name: name,
    field_keys: fieldKeys,
    filters,
  });

  const saveAsNew = async () => {
    const name = saveName.trim();
    if (!name) {
      toast({ title: "Give the report a name first.", status: "warning", duration: 4000 });
      return;
    }
    const body = await ReportHelper.createTemplate(definitionPayload(name));
    if (isRefusal(body)) {
      toast({ title: body.msg, status: "error", duration: 6000, isClosable: true });
      return;
    }
    toast({ title: `Saved as "${name}"`, status: "success", duration: 4000 });
    setSaveName("");
    await loadTemplates();
    if (body && body.template) setTemplateId(body.template.template_id);
  };

  const updateExisting = async () => {
    if (!activeTemplate) return;
    const body = await ReportHelper.updateTemplate(
      activeTemplate.template_id,
      definitionPayload(activeTemplate.template_name)
    );
    if (isRefusal(body)) {
      toast({ title: body.msg, status: "error", duration: 6000, isClosable: true });
      return;
    }
    toast({ title: "Report updated", status: "success", duration: 4000 });
    await loadTemplates();
  };

  const removeTemplate = async (template) => {
    const body = await ReportHelper.deleteTemplate(template.template_id);
    if (isRefusal(body) && body.code !== 200) {
      toast({ title: body.msg, status: "error", duration: 6000, isClosable: true });
      return;
    }
    toast({ title: `"${template.template_name}" deleted`, status: "info", duration: 4000 });
    if (templateId === template.template_id) setTemplateId(null);
    await loadTemplates();
  };

  const copyTemplate = async (template) => {
    const body = await ReportHelper.copyTemplate(
      template.template_id,
      `${template.template_name} (copy)`
    );
    if (isRefusal(body)) {
      toast({ title: body.msg, status: "error", duration: 6000, isClosable: true });
      return;
    }
    toast({ title: "Copied to your reports", status: "success", duration: 4000 });
    await loadTemplates();
    if (body && body.template) openTemplate(body.template);
  };

  /* ----------------------------------------------------------- rendering */

  if (!canView) {
    return (
      <GlobalWrapper title="Employee Master Report">
        <CustomContainer title="Employee Master Report">
          <Alert status="warning" borderRadius="8px">
            <AlertIcon />
            You do not have permission to view employee reports.
          </Alert>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const canExport = Boolean(catalogue && catalogue.can_export);
  const blockedByAcknowledgement =
    Boolean(preview && preview.requires_acknowledgement) && !acknowledged;
  const overRowLimit = Boolean(preview && preview.over_row_limit);
  const ready = fieldKeys.length > 0 || Boolean(templateId);

  const multiSelect = (value, onSelect, options, labelKey, valueKey, placeholder) => (
    <Select
      size="sm"
      placeholder={placeholder}
      value={value.length === 1 ? String(value[0]) : ""}
      onChange={(e) => onSelect(e.target.value ? [Number(e.target.value)] : [])}
    >
      {(options || []).map((option) => (
        <option key={option[valueKey]} value={option[valueKey]}>
          {option[labelKey]}
        </option>
      ))}
    </Select>
  );

  return (
    <GlobalWrapper title="Employee Master Report">
      <CustomContainer title="Employee Master Report" filledHeader>
        {catalogueError && (
          <Alert status="error" borderRadius="8px" marginBottom="12px">
            <AlertIcon />
            {catalogueError}
          </Alert>
        )}

        {/* ------------------------------------------------ saved reports */}
        <Box marginBottom="16px">
          <Text fontWeight="bold" fontSize="14px" marginBottom="8px">
            Saved reports
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing="8px">
            {templates.map((template) => {
              const permitted = template.permissions || {};
              const isOpen = template.template_id === templateId;
              return (
                <Box
                  key={template.template_id}
                  borderWidth={isOpen ? "2px" : "1px"}
                  borderColor={isOpen ? "purple.400" : "gray.200"}
                  borderRadius="8px"
                  padding="10px"
                >
                  <HStack justify="space-between" align="flex-start">
                    <Box minW="0">
                      <Text fontSize="14px" fontWeight="600" isTruncated>
                        {template.template_name}
                      </Text>
                      <Text fontSize="11px" color="gray.500">
                        {(template.field_keys || []).length} columns
                      </Text>
                    </Box>
                    {template.is_system === 1 && (
                      <Badge colorScheme="purple" fontSize="9px">
                        built-in
                      </Badge>
                    )}
                    {template.is_system !== 1 && template.is_shared === 1 && (
                      <Badge colorScheme="blue" fontSize="9px">
                        shared
                      </Badge>
                    )}
                  </HStack>

                  <ButtonGroup size="xs" variant="ghost" marginTop="6px" spacing="2px">
                    <Button onClick={() => openTemplate(template)}>Open</Button>
                    {/* Copy is offered for everything the user may run but not
                        edit, which is what keeps the built-in reports
                        read-only without making them a dead end. */}
                    {permitted.canCopy && (
                      <Button onClick={() => copyTemplate(template)}>Save a Copy</Button>
                    )}
                    {permitted.canDelete && (
                      <Button colorScheme="red" onClick={() => removeTemplate(template)}>
                        Delete
                      </Button>
                    )}
                  </ButtonGroup>
                </Box>
              );
            })}
            {templates.length === 0 && (
              <Text fontSize="13px" color="gray.500">
                No saved reports yet.
              </Text>
            )}
          </SimpleGrid>
        </Box>

        {/* ----------------------------------------------------- columns */}
        {catalogue && (
          <Box marginBottom="16px">
            <FieldPicker
              groups={catalogue.groups}
              selected={fieldKeys}
              onChange={chooseFields}
              maxFields={catalogue.max_fields}
              disabled={running}
            />
          </Box>
        )}

        {/* ----------------------------------------------------- filters */}
        <Box borderWidth="1px" borderRadius="8px" padding="12px" marginBottom="16px">
          <Text fontWeight="bold" fontSize="14px" marginBottom="8px">
            Who to include
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2, xl: 6 }} spacing="8px">
            <Select
              size="sm"
              value={filters.status}
              onChange={(e) => setFilter({ status: e.target.value })}
            >
              {/* Three genuinely different populations. "All" means all -
                  there is no hidden exclusion of people who have left. */}
              <option value="active">Currently employed</option>
              <option value="inactive">Resigned / inactive</option>
              <option value="all">Everyone</option>
            </Select>

            {multiSelect(
              filters.outlet_ids,
              (ids) => setFilter({ outlet_ids: ids }),
              outlets,
              "outlet_name",
              "outlet_id",
              "All outlets"
            )}
            {multiSelect(
              filters.department_ids,
              (ids) => setFilter({ department_ids: ids }),
              departments,
              "department_name",
              "department_id",
              "All departments"
            )}
            {multiSelect(
              filters.designation_ids,
              (ids) => setFilter({ designation_ids: ids }),
              designations,
              "designation_name",
              "designation_id",
              "All designations"
            )}

            <Input
              size="sm"
              placeholder="Name or employee ID"
              value={filters.search}
              onChange={(e) => setFilter({ search: e.target.value })}
            />

            <Button
              size="sm"
              colorScheme="purple"
              isLoading={running}
              isDisabled={!ready}
              onClick={() => run(1)}
            >
              Run report
            </Button>
          </SimpleGrid>
        </Box>

        {/* -------------------------------------------------------- result */}
        {running && !preview && (
          <Flex justify="center" padding="24px">
            <Spinner />
          </Flex>
        )}

        {preview && (
          <Box>
            <ReportWarnings
              warnings={preview.warnings}
              requiresAcknowledgement={preview.requires_acknowledgement}
              acknowledged={acknowledged}
              onAcknowledge={setAcknowledged}
            />

            <Flex
              justify="space-between"
              align="center"
              wrap="wrap"
              gap="8px"
              marginBottom="8px"
            >
              <HStack spacing="8px">
                <Text fontSize="15px" fontWeight="bold">
                  {preview.matching_count} matching employees
                </Text>
                <Text fontSize="12px" color="gray.500">
                  showing {preview.rows.length} on this page
                </Text>
              </HStack>

              <HStack spacing="8px">
                <Stack spacing="4px" direction="row" align="center">
                  <Input
                    size="sm"
                    width="200px"
                    placeholder="Save this report as…"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                  <Button size="sm" variant="outline" onClick={saveAsNew}>
                    Save
                  </Button>
                  {activeTemplate &&
                    activeTemplate.permissions &&
                    activeTemplate.permissions.canEdit && (
                      <Button size="sm" variant="outline" onClick={updateExisting}>
                        Update &ldquo;{activeTemplate.template_name}&rdquo;
                      </Button>
                    )}
                </Stack>

                {/* The export buttons exist only for somebody who may export.
                    A disabled button that produces a 403 teaches nothing. */}
                {canExport && (
                  <ButtonGroup size="sm" isAttached colorScheme="purple">
                    <Button
                      isLoading={exporting === "xlsx"}
                      isDisabled={blockedByAcknowledgement || overRowLimit}
                      onClick={() => doExport("xlsx")}
                    >
                      Excel
                    </Button>
                    <Button
                      variant="outline"
                      isLoading={exporting === "csv"}
                      isDisabled={blockedByAcknowledgement || overRowLimit}
                      onClick={() => doExport("csv")}
                    >
                      CSV
                    </Button>
                  </ButtonGroup>
                )}
              </HStack>
            </Flex>

            {overRowLimit && (
              <Alert status="warning" borderRadius="8px" marginBottom="8px">
                <AlertIcon />
                This report matches more than {preview.max_rows} employees, which is more
                than one export may contain. Narrow the filters and run it again.
              </Alert>
            )}

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
                  Page {preview.page} of{" "}
                  {Math.ceil(preview.matching_count / preview.page_size)}
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  isDisabled={
                    preview.page >= Math.ceil(preview.matching_count / preview.page_size) ||
                    running
                  }
                  onClick={() => run(preview.page + 1)}
                >
                  Next
                </Button>
              </Flex>
            )}
          </Box>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default EmployeeMasterReport;
