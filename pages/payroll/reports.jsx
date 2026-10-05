import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  Flex,
  Heading,
  HStack,
  Input,
  Select,
  Spacer,
  Spinner,
  Stack,
  Tab,
  TabList,
  Tabs,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import PayrollColumnsDrawer from "../../components/payroll/reports/PayrollColumnsDrawer";
import PayrollTemplateBar from "../../components/payroll/reports/PayrollTemplateBar";
import PayrollReportTable from "../../components/payroll/reports/PayrollReportTable";
import StatutoryValidationPanel from "../../components/payroll/reports/StatutoryValidationPanel";
import usePayrollActor from "../../customHooks/usePayrollActor";
import useEmployeeOutlets from "../../customHooks/useEmployeeOutlets";
import useDepartments from "../../customHooks/useDepartments";
import useDesignations from "../../customHooks/useDesignations";
import PayrollReportHelper from "../../helper/payrollReport";
import {
  canDownloadStatutoryFiles,
  canExportPayrollReports,
  canOpenPayrollReports,
  canShareReportTemplates,
} from "../../util/payrollReportAccess";
import { availableOnly, monthLabel, monthValue, parseMonthValue } from "../../util/payrollReportColumns";

/**
 * Payroll → Reports.
 *
 *   Payroll Reports - <Month Year>
 *   [Month ▼] [Report type tabs]
 *   [Template ▼] [Select Columns] [Copy Previous Month]        Excel | PDF (+ statutory file)
 *   table
 *
 * EVERY FIGURE IS THE FINALIZED PAYRUN. The month list only offers months
 * with approved & locked employees, and the server reads only those rows -
 * opening a report never recalculates payroll or attendance.
 *
 * COLUMNS ARE REMEMBERED PER MONTH. Applying columns, a template or a copied
 * layout saves it for this user + report type + payroll month; another month
 * keeps its own. A month never set up opens with the user's default template,
 * or the report's built-in columns.
 *
 * The report's rows are the month's PAYRUN employees: an employee whose
 * month is not approved & locked is listed with blank figures, never
 * dropped, and the Payroll Register shows its reconciliation to the payrun.
 *
 * The statutory files are generated for download - DnDS does not send
 * anything to the EPFO or ESIC portals - they ignore the visible columns,
 * and they are all or nothing: one blocked employee disables the download.
 */
const ok = (body) => body && !(Number(body.code) >= 400);

/** The filters a layout or template keeps - every reusable one, never the search. */
const reusableFilters = (f = {}) => ({
  outlet_ids: f.outlet_ids || [],
  department_ids: f.department_ids || [],
  designation_ids: f.designation_ids || [],
  employment_types: f.employment_types || [],
  pay_type: f.pay_type || null,
});
const activeFilterCount = (f = {}) =>
  ["outlet_ids", "department_ids", "designation_ids", "employment_types"].filter((k) => (f[k] || []).length > 0).length +
  (f.pay_type ? 1 : 0);
const msgOf = (body, fallback) => (body && body.msg) || fallback;

function PayrollReports() {
  const toast = useToast();
  const actor = usePayrollActor();
  const mayOpen = canOpenPayrollReports(actor);
  const mayExport = canExportPayrollReports(actor);
  const mayStatutory = canDownloadStatutoryFiles(actor);
  const mayShare = canShareReportTemplates(actor);
  const { outlets } = useEmployeeOutlets({ skip: !mayOpen });
  const { departments } = useDepartments();
  const { designations } = useDesignations();

  const [meta, setMeta] = useState(null);
  const [months, setMonths] = useState(null);
  const [monthKey, setMonthKey] = useState("");
  const [reportType, setReportType] = useState("PAYROLL_REGISTER");
  const [layout, setLayout] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [validation, setValidation] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const [overrides, setOverrides] = useState({});

  const period = parseMonthValue(monthKey);
  const type = meta ? meta.report_types.find((t) => t.key === reportType) : null;
  const ticket = useRef(0);

  const fail = useCallback(
    (body, fallback) => toast({ status: "error", title: msgOf(body, fallback), duration: 6000, isClosable: true }),
    [toast]
  );

  /* ---------------------------------------------- meta and months */
  useEffect(() => {
    if (!mayOpen) return;
    Promise.all([PayrollReportHelper.getMeta(), PayrollReportHelper.getMonths()])
      .then(([m, list]) => {
        if (!ok(m) || !ok(list)) {
          setLoadError(msgOf(!ok(m) ? m : list, "Payroll reports could not be loaded"));
          return;
        }
        setMeta(m);
        setMonths(list.months || []);
        if ((list.months || []).length) setMonthKey(monthValue(list.months[0]));
      })
      .catch(() => setLoadError("Payroll reports could not be loaded"));
  }, [mayOpen]);

  /* ---------------------------------------------- layout + templates for type / month */
  const loadTemplates = useCallback(async () => {
    const body = await PayrollReportHelper.listTemplates(reportType);
    if (ok(body)) setTemplates(body.templates || []);
  }, [reportType]);

  useEffect(() => {
    if (!period || !meta) return;
    let live = true;
    setPreview(null);
    setPage(1);
    PayrollReportHelper.getLayout({ report_type: reportType, year: period.year, month: period.month }).then((body) => {
      if (!live) return;
      if (!ok(body)) return fail(body, "The saved columns could not be loaded");
      setLayout(body.layout);
      setTemplateId(body.layout.template_id || null);
    });
    loadTemplates();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType, monthKey, meta]);

  /* ---------------------------------------------- the report */
  const request = useCallback(
    () => ({
      report_type: reportType,
      year: period.year,
      month: period.month,
      field_keys: layout.field_keys,
      display: layout.display,
      filters: { ...layout.filters, pay_type: layout.filters.pay_type || null, search: appliedSearch },
      template_id: templateId || null,
    }),
    [reportType, period, layout, appliedSearch, templateId]
  );

  useEffect(() => {
    if (!period || !layout || layout.report_type !== reportType) return;
    const mine = ++ticket.current;
    setLoading(true);
    PayrollReportHelper.preview({ ...request(), page })
      .then((body) => {
        if (mine !== ticket.current) return;
        if (!ok(body)) return fail(body, "The report could not be loaded");
        setPreview(body);
      })
      .finally(() => mine === ticket.current && setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout, page, appliedSearch]);

  /* ---------------------------------------------- statutory validation */
  const statutoryKind = reportType === "EPF" ? "EPF" : reportType === "ESI" ? "ESI" : null;
  const overrideList = () =>
    Object.entries(overrides)
      .filter(([, o]) => o && o.reason_code !== null && o.reason_code !== undefined)
      .map(([id, o]) => ({ employee_id: Number(id), reason_code: o.reason_code, last_working_day: o.last_working_day || null }));

  const validate = useCallback(async () => {
    if (!statutoryKind || !period) return;
    setValidating(true);
    setValidationError(null);
    try {
      const body =
        statutoryKind === "EPF"
          ? await PayrollReportHelper.getEpfValidation({ year: period.year, month: period.month })
          : await PayrollReportHelper.getEsiValidation({ year: period.year, month: period.month, overrides: overrideList() });
      if (!ok(body)) setValidationError(msgOf(body, "Validation could not be run"));
      else setValidation(body);
    } catch (err) {
      setValidationError("Validation could not be run");
    } finally {
      setValidating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statutoryKind, monthKey, overrides]);

  useEffect(() => {
    setValidation(null);
    setOverrides({});
    if (statutoryKind && period) validate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statutoryKind, monthKey]);

  /* ---------------------------------------------- layout changes are saved for this month */
  const saveLayout = async (next, message) => {
    setBusy(true);
    try {
      const body = await PayrollReportHelper.saveLayout({
        report_type: reportType,
        year: period.year,
        month: period.month,
        field_keys: next.field_keys,
        display: next.display,
        filters: reusableFilters(next.filters),
        template_id: next.template_id || null,
      });
      if (!ok(body)) return fail(body, "The columns could not be saved");
      setLayout(body.layout);
      setPage(1);
      if (message) toast({ status: "success", title: message, duration: 3000 });
    } finally {
      setBusy(false);
    }
  };

  const applyColumns = (keys) =>
    saveLayout({ ...layout, field_keys: keys }, `Columns saved for ${monthLabel(period.year, period.month)}`);

  const applyTemplate = (t) => {
    setTemplateId(t.template_id);
    saveLayout(
      { field_keys: t.field_keys, display: t.display, filters: t.filters, template_id: t.template_id },
      `Template "${t.template_name}" applied to ${monthLabel(period.year, period.month)}`
    );
    if (t.warnings && t.warnings.length) {
      toast({ status: "warning", title: "Some template columns are not available to you and were left out.", duration: 5000 });
    }
  };

  const copyPrevious = async () => {
    setBusy(true);
    try {
      const body = await PayrollReportHelper.copyPreviousMonth({ report_type: reportType, year: period.year, month: period.month });
      if (!ok(body)) return fail(body, "There is no earlier layout to copy");
      setLayout(body.layout);
      setTemplateId(body.layout.template_id || null);
      setPage(1);
      toast({ status: "success", title: `Columns copied from ${body.layout.copied_from.label}`, duration: 4000 });
    } finally {
      setBusy(false);
    }
  };

  const resetMonth = async () => {
    setBusy(true);
    try {
      const body = await PayrollReportHelper.resetLayout({ report_type: reportType, year: period.year, month: period.month });
      if (!ok(body)) return fail(body, "The layout could not be reset");
      setLayout(body.layout);
      setTemplateId(body.layout.template_id || null);
      setPage(1);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------------------------------------- templates */
  const templateCall = async (promise, success) => {
    setBusy(true);
    try {
      const body = await promise;
      if (!ok(body)) {
        fail(body, "The template could not be saved");
        return null;
      }
      await loadTemplates();
      if (success) toast({ status: "success", title: success, duration: 3000 });
      return body;
    } finally {
      setBusy(false);
    }
  };

  const structure = () => ({
    field_keys: layout.field_keys,
    display: layout.display,
    filters: reusableFilters(layout.filters),
  });

  /* ---------------------------------------------- exports */
  const exportFile = async (kind) => {
    setExporting(kind);
    try {
      if (kind === "xlsx") await PayrollReportHelper.exportXlsx(request());
      else if (kind === "pdf") await PayrollReportHelper.exportPdf(request());
      else if (kind === "ecr") {
        const out = await PayrollReportHelper.downloadEcr({ year: period.year, month: period.month });
        toast({ status: "success", title: `ECR file downloaded (${out.filename})`, duration: 5000 });
      } else if (kind === "esic") {
        const out = await PayrollReportHelper.downloadEsiContribution({
          year: period.year,
          month: period.month,
          overrides: overrideList(),
        });
        toast({ status: "success", title: `Contribution file downloaded (${out.filename})`, duration: 5000 });
      }
    } catch (err) {
      if (err && err.code === "BLOCKED_EMPLOYEES" && err.detail && err.detail.summary) {
        setValidation((v) => ({ ...(v || {}), summary: err.detail.summary, blocked: err.detail.blocked || [] }));
      }
      fail(err && err.detail, (err && err.message) || "The file could not be produced");
    } finally {
      setExporting(null);
    }
  };

  /* ---------------------------------------------- render */
  if (!mayOpen) {
    return (
      <GlobalWrapper title="Payroll Reports">
        <CustomContainer title="Payroll Reports">
          <Alert status="info" fontSize="sm">
            <AlertIcon />
            You do not have permission to open Payroll Reports. This screen needs View Reports, View Employees, View
            Payroll and View Salary.
          </Alert>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const groups = meta ? meta.groups : [];
  const typeDefaults = type ? type.default_field_keys : [];
  const statutoryBlocked = validation && validation.summary ? validation.summary.blocked : 0;
  const statutoryReady = validation && validation.summary ? validation.summary.ready : 0;
  // ALL OR NOTHING: one blocked employee disables the statutory download.
  const statutoryDisabled = !validation || statutoryReady === 0 || statutoryBlocked > 0;

  return (
    <GlobalWrapper title="Payroll Reports">
      <CustomContainer
        title="Payroll Reports"
        subtitle="Month-wise reports from the finalized payrun. Opening a report never recalculates payroll or attendance."
      >
        {loadError ? (
          <Alert status="error" fontSize="sm">
            <AlertIcon />
            {loadError}
          </Alert>
        ) : !meta || months === null ? (
          <HStack>
            <Spinner size="sm" />
            <Text fontSize="sm">Loading...</Text>
          </HStack>
        ) : months.length === 0 ? (
          <Alert status="info" fontSize="sm">
            <AlertIcon />
            No payroll month has an approved &amp; locked payrun yet. Reports become available once a month is approved.
          </Alert>
        ) : (
          <Stack spacing={4}>
            {/* -------- month, clearly visible -------- */}
            <Flex align="center" gap="12px" wrap="wrap">
              <Heading size="md" data-testid="payroll-month-heading">
                {period ? monthLabel(period.year, period.month) : ""}
              </Heading>
              <Select size="sm" maxW="260px" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} aria-label="Payroll month">
                {months.map((m) => (
                  <option key={monthValue(m)} value={monthValue(m)}>
                    {m.label}
                    {m.finalized < m.payrun_employees ? ` (${m.finalized} of ${m.payrun_employees} finalized)` : ""}
                  </option>
                ))}
              </Select>
            </Flex>

            {/* -------- report type -------- */}
            <Tabs
              size="sm"
              variant="soft-rounded"
              colorScheme="purple"
              index={Math.max(0, meta.report_types.findIndex((t) => t.key === reportType))}
              onChange={(i) => setReportType(meta.report_types[i].key)}
              isLazy
            >
              <TabList flexWrap="wrap" gap="4px">
                {meta.report_types.map((t) => (
                  <Tab key={t.key}>{t.label}</Tab>
                ))}
              </TabList>
            </Tabs>

            {/* -------- template / columns / copy, and the actions -------- */}
            <Flex align="center" gap="8px" wrap="wrap">
              <PayrollTemplateBar
                templates={templates}
                selectedId={templateId}
                onSelect={setTemplateId}
                onApply={applyTemplate}
                canShare={mayShare}
                busy={busy}
                onSaveNew={async (name, { shared, makeDefault }) => {
                  const body = await templateCall(
                    PayrollReportHelper.createTemplate({ report_type: reportType, template_name: name, is_shared: shared, set_default: makeDefault, ...structure() }),
                    `Template "${name}" saved`
                  );
                  if (body) setTemplateId(body.template.template_id);
                }}
                onUpdate={(t) => templateCall(PayrollReportHelper.updateTemplate(t.template_id, structure()), `Template "${t.template_name}" updated`)}
                onRename={(t, name) => templateCall(PayrollReportHelper.renameTemplate(t.template_id, name), "Template renamed")}
                onDuplicate={async (t, name) => {
                  const body = await templateCall(PayrollReportHelper.duplicateTemplate(t.template_id, name), `Template "${name}" created`);
                  if (body) setTemplateId(body.template.template_id);
                }}
                onDelete={async (t) => {
                  const body = await templateCall(PayrollReportHelper.deleteTemplate(t.template_id), "Template deleted");
                  if (body) setTemplateId(null);
                }}
                onSetDefault={(t) =>
                  templateCall(
                    PayrollReportHelper.setDefaultTemplate(reportType, t ? t.template_id : null),
                    t ? `"${t.template_name}" is now your default for ${type ? type.label : "this report"}` : "Default cleared"
                  )
                }
              />
              <Button size="sm" colorScheme="purple" variant="outline" onClick={() => setDrawerOpen(true)} isDisabled={!layout}>
                Select Columns{layout ? ` (${layout.field_keys.length})` : ""}
              </Button>
              <Button size="sm" variant="outline" onClick={copyPrevious} isDisabled={!layout || busy}>
                Copy Previous Month
              </Button>
              <Spacer />
              {mayExport ? (
                <ButtonGroup size="sm" isAttached variant="outline">
                  <Button onClick={() => exportFile("xlsx")} isLoading={exporting === "xlsx"} isDisabled={!preview || Boolean(exporting)}>
                    Excel
                  </Button>
                  <Button onClick={() => exportFile("pdf")} isLoading={exporting === "pdf"} isDisabled={!preview || Boolean(exporting)}>
                    PDF
                  </Button>
                </ButtonGroup>
              ) : null}
              {statutoryKind && mayStatutory ? (
                <Button
                  size="sm"
                  colorScheme="green"
                  onClick={() => exportFile(statutoryKind === "EPF" ? "ecr" : "esic")}
                  isLoading={exporting === "ecr" || exporting === "esic"}
                  isDisabled={statutoryDisabled || Boolean(exporting)}
                >
                  {statutoryKind === "EPF" ? "Download ECR File" : "Download Contribution File"}
                </Button>
              ) : null}
            </Flex>

            {/* -------- filters + where this layout came from -------- */}
            {layout ? (
              <Flex align="center" gap="8px" wrap="wrap" fontSize="sm">
                <Select
                  size="sm"
                  maxW="200px"
                  placeholder="All outlets"
                  value={(layout.filters.outlet_ids || [])[0] || ""}
                  onChange={(e) =>
                    saveLayout({ ...layout, filters: { ...layout.filters, outlet_ids: e.target.value ? [Number(e.target.value)] : [] } })
                  }
                  aria-label="Outlet"
                >
                  {(outlets || []).map((o) => (
                    <option key={o.outlet_id} value={o.outlet_id}>
                      {o.outlet_name}
                    </option>
                  ))}
                </Select>
                <Select
                  size="sm"
                  maxW="190px"
                  placeholder="All departments"
                  value={(layout.filters.department_ids || [])[0] || ""}
                  onChange={(e) =>
                    saveLayout({ ...layout, filters: { ...layout.filters, department_ids: e.target.value ? [Number(e.target.value)] : [] } })
                  }
                  aria-label="Department"
                  title="Department as at the payroll month (payrun snapshot)"
                >
                  {(departments || []).map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.department_name}
                    </option>
                  ))}
                </Select>
                <Select
                  size="sm"
                  maxW="190px"
                  placeholder="All designations"
                  value={(layout.filters.designation_ids || [])[0] || ""}
                  onChange={(e) =>
                    saveLayout({ ...layout, filters: { ...layout.filters, designation_ids: e.target.value ? [Number(e.target.value)] : [] } })
                  }
                  aria-label="Designation"
                  title="Designation as at the payroll month (payrun snapshot)"
                >
                  {(designations || []).map((d) => (
                    <option key={d.designation_id} value={d.designation_id}>
                      {d.designation_name}
                    </option>
                  ))}
                </Select>
                <Select
                  size="sm"
                  maxW="220px"
                  placeholder="All employment types"
                  value={(layout.filters.employment_types || [])[0] || ""}
                  onChange={(e) =>
                    saveLayout({ ...layout, filters: { ...layout.filters, employment_types: e.target.value ? [e.target.value] : [] } })
                  }
                  aria-label="Employment type"
                  title="Employment type is not stored on the payrun, so this filters on the current Employee Master"
                >
                  {((meta.filter_options && meta.filter_options.employment_types) || []).map((t) => (
                    <option key={t} value={t}>
                      {t} (current master)
                    </option>
                  ))}
                </Select>
                <Select
                  size="sm"
                  maxW="160px"
                  placeholder="Bank and cash"
                  value={layout.filters.pay_type || ""}
                  onChange={(e) => saveLayout({ ...layout, filters: { ...layout.filters, pay_type: e.target.value || null } })}
                  aria-label="Pay type"
                >
                  <option value="BANK">Bank only</option>
                  <option value="CASH">Cash only</option>
                </Select>
                <Input
                  size="sm"
                  maxW="220px"
                  placeholder="Search name or ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPage(1);
                      setAppliedSearch(search.trim());
                    }
                  }}
                  aria-label="Search employees"
                />
                <Checkbox
                  size="sm"
                  isChecked={layout.display.show_totals}
                  onChange={(e) => saveLayout({ ...layout, display: { ...layout.display, show_totals: e.target.checked } })}
                >
                  Totals
                </Checkbox>
                <Select
                  size="sm"
                  maxW="200px"
                  value={layout.display.sort_by || ""}
                  onChange={(e) => saveLayout({ ...layout, display: { ...layout.display, sort_by: e.target.value || null } })}
                  aria-label="Sort by"
                >
                  <option value="">Sort: Employee ID</option>
                  {(preview ? preview.columns : []).map((c) => (
                    <option key={c.key} value={c.key}>
                      Sort: {c.label}
                    </option>
                  ))}
                </Select>
                <Spacer />
                <Badge colorScheme={layout.source === "MONTH" ? "purple" : "gray"} fontSize="10px">
                  {layout.source === "MONTH"
                    ? `Saved for ${monthLabel(period.year, period.month)}`
                    : layout.source === "DEFAULT_TEMPLATE"
                    ? "Your default template"
                    : "Report default"}
                </Badge>
                {layout.source === "MONTH" ? (
                  <Button size="xs" variant="link" onClick={resetMonth} isDisabled={busy}>
                    Reset this month
                  </Button>
                ) : null}
              </Flex>
            ) : null}

            {layout && layout.warnings && layout.warnings.length ? (
              <Alert status="warning" fontSize="sm">
                <AlertIcon />
                Some saved columns are not available to you and were left out.
              </Alert>
            ) : null}
            {preview && preview.not_finalized_count > 0 ? (
              <Alert status="warning" fontSize="sm">
                <AlertIcon />
                {preview.not_finalized_count} employee(s) in this month&apos;s payrun are not approved &amp; locked. They are
                listed (highlighted), their payroll figures shown as &quot;Not finalized&quot; - add the Payrun Status column to see each state.
              </Alert>
            ) : null}
            {preview && preview.reconciliation ? (
              <Alert status={preview.reconciliation.reconciled ? "success" : "error"} fontSize="sm" data-testid="payrun-reconciliation">
                <AlertIcon />
                {preview.reconciliation.reconciled
                  ? `Reconciled with the payrun: ${preview.reconciliation.payrun.employees} employees (${preview.reconciliation.payrun.finalized} finalized); Gross, Deductions and Net Pay totals match.`
                  : `Does NOT reconcile with the payrun: payrun ${preview.reconciliation.payrun.employees} employees / net ${preview.reconciliation.payrun.net_pay}, report ${preview.reconciliation.report.employees} employees / net ${preview.reconciliation.report.net_pay}. Please report this.`}
                {preview.reconciliation.reconciled && activeFilterCount(layout.filters) + (appliedSearch ? 1 : 0) > 0
                  ? " (Reconciled for your full scope; the table below is filtered.)"
                  : ""}
              </Alert>
            ) : null}

            {statutoryKind ? (
              <StatutoryValidationPanel
                kind={statutoryKind}
                validation={validation}
                loading={validating}
                error={validationError}
                reasonCodes={meta.esic_reason_codes}
                overrides={overrides}
                onOverride={(id, value) => setOverrides((o) => ({ ...o, [id]: value }))}
                onRevalidate={validate}
              />
            ) : null}

            <Box>
              {!preview && loading ? (
                <HStack>
                  <Spinner size="sm" />
                  <Text fontSize="sm">Loading report...</Text>
                </HStack>
              ) : (
                <PayrollReportTable preview={preview} loading={loading} onPage={setPage} />
              )}
            </Box>
          </Stack>
        )}
      </CustomContainer>

      <PayrollColumnsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={groups}
        selected={layout ? availableOnly(layout.field_keys, groups) : []}
        maxFields={meta ? meta.max_fields : 0}
        defaultSelected={typeDefaults}
        onApply={applyColumns}
      />
    </GlobalWrapper>
  );
}

export default PayrollReports;
